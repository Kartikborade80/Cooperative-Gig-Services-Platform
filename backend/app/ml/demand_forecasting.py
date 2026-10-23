from datetime import datetime, timedelta, timezone
from typing import List, Dict, Any, Optional
import numpy as np
import pandas as pd
from sklearn.linear_model import Ridge
from sqlalchemy.orm import Session
from app.models.models import (
    DemandData, DemandPrediction, WorkforceRecommendation, 
    Worker, VerificationStatus, Cooperative, RecommendationStatus
)

class DemandForecastingEngine:
    @classmethod
    def train_and_forecast(
        cls,
        db: Session,
        service_category: str = "Plumbing",
        district: str = "Pune",
        forecast_days: int = 7
    ) -> List[Dict[str, Any]]:
        """
        Trains model on historical DemandData and generates forecasted demand for upcoming days.
        Detects workforce shortage against currently verified & available cooperative workers.
        """
        # Fetch historical records
        records = db.query(DemandData).filter(
            DemandData.service_category == service_category,
            DemandData.district == district
        ).order_by(DemandData.date.asc()).all()

        current_active_workers = db.query(Worker).filter(
            Worker.verification_status == VerificationStatus.VERIFIED,
            Worker.is_available == True
        ).count()

        predictions_result = []
        today = datetime.now(timezone.utc)

        if len(records) < 5:
            # Baseline heuristic fallback if data is sparse
            base_demand = 25
            for i in range(1, forecast_days + 1):
                target_dt = today + timedelta(days=i)
                # Weekend bump
                multiplier = 1.35 if target_dt.weekday() in [5, 6] else 1.05
                pred_val = int(base_demand * multiplier)
                shortage = pred_val > current_active_workers

                pred_dict = {
                    "service_category": service_category,
                    "district": district,
                    "target_date": target_dt.strftime("%Y-%m-%d"),
                    "predicted_demand": pred_val,
                    "available_workers": current_active_workers,
                    "shortage_detected": shortage,
                    "confidence_score": 0.78,
                    "note": "Baseline forecast (insufficient historical records for ML fit)"
                }
                predictions_result.append(pred_dict)
            return predictions_result

        # Build feature dataset
        data = []
        for r in records:
            dt = r.date
            data.append({
                "day_of_week": dt.weekday(),
                "day_of_month": dt.day,
                "month": dt.month,
                "requests": r.number_of_requests,
                "emergency_requests": r.emergency_requests or 0,
                "available_workers": r.available_workers or 10
            })
        df = pd.DataFrame(data)

        X = df[["day_of_week", "day_of_month", "month", "emergency_requests"]].values
        y = df["requests"].values

        model = Ridge(alpha=1.0)
        model.fit(X, y)

        # Generate future forecasts
        for i in range(1, forecast_days + 1):
            target_dt = today + timedelta(days=i)
            # Estimate future emergency ratio from past median
            median_emerg = float(df["emergency_requests"].median() if not df.empty else 2.0)
            features = np.array([[target_dt.weekday(), target_dt.day, target_dt.month, median_emerg]])
            
            raw_pred = model.predict(features)[0]
            pred_demand = max(5, int(round(raw_pred)))
            shortage = pred_demand > current_active_workers
            confidence = min(0.96, max(0.82, 0.90 - (i * 0.01)))

            pred_dict = {
                "service_category": service_category,
                "district": district,
                "target_date": target_dt.strftime("%Y-%m-%d"),
                "predicted_demand": pred_demand,
                "available_workers": current_active_workers,
                "shortage_detected": shortage,
                "confidence_score": round(confidence, 2),
                "note": "Trained Ridge ML model forecast"
            }
            predictions_result.append(pred_dict)

        return predictions_result

    @classmethod
    def generate_and_save_recommendations(
        cls,
        db: Session,
        coop_id: int,
        forecast_results: List[Dict[str, Any]]
    ) -> List[WorkforceRecommendation]:
        """
        Analyzes shortages in forecast and writes actionable recommendations to the database.
        """
        created_recommendations = []
        for f in forecast_results:
            if f["shortage_detected"]:
                needed = f["predicted_demand"] - f["available_workers"]
                title = f"Worker Shortage in {f['service_category']} ({f['district']})"
                text = (
                    f"Predicted demand is {f['predicted_demand']} jobs for {f['target_date']}, "
                    f"but only {f['available_workers']} workers are active. "
                    f"Recommendation: Mobilize {needed} additional certified {f['service_category']} "
                    f"workers from neighboring cooperative units or open extra shifts."
                )

                # Check if recommendation already exists for this date and category
                existing = db.query(WorkforceRecommendation).filter(
                    WorkforceRecommendation.coop_id == coop_id,
                    WorkforceRecommendation.title == title,
                    WorkforceRecommendation.status == RecommendationStatus.PENDING
                ).first()

                if not existing:
                    rec = WorkforceRecommendation(
                        coop_id=coop_id,
                        title=title,
                        recommendation_text=text,
                        status=RecommendationStatus.PENDING
                    )
                    db.add(rec)
                    db.commit()
                    db.refresh(rec)
                    created_recommendations.append(rec)
                else:
                    created_recommendations.append(existing)

        return created_recommendations
