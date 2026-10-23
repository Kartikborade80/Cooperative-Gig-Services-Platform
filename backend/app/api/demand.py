from typing import List, Dict, Any, Optional










from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.models.models import (
    WorkforceRecommendation, RecommendationStatus, 
    DemandData, Cooperative, User
)
from app.schemas.schemas import DemandForecastResponse, WorkforceRecommendationAction
from app.ml.demand_forecasting import DemandForecastingEngine
from app.api.deps import require_coop_admin

router = APIRouter(prefix="/demand", tags=["Demand Forecasting & Workforce"])

@router.get("/forecast", response_model=List[DemandForecastResponse])
def get_demand_forecast(
    service_category: str = "Plumbing",
    district: str = "Pune",
    coop_id: int = 1,
    db: Session = Depends(get_db),
    admin: User = Depends(require_coop_admin)
):
    # 1. Train model & forecast
    forecasts = DemandForecastingEngine.train_and_forecast(
        db=db,
        service_category=service_category,
        district=district,
        forecast_days=7
    )

    # 2. Generate and save recommendations if shortage detected
    recommendations = DemandForecastingEngine.generate_and_save_recommendations(
        db=db,
        coop_id=coop_id,
        forecast_results=forecasts
    )

    rec_map = {r.title: r for r in recommendations}

    results = []
    for f in forecasts:
        title = f"Worker Shortage in {f['service_category']} ({f['district']})"
        rec_obj = rec_map.get(title)

        results.append(DemandForecastResponse(
            service_category=f["service_category"],
            district=f["district"],
            target_date=f["target_date"],
            predicted_demand=f["predicted_demand"],
            available_workers=f["available_workers"],
            shortage_detected=f["shortage_detected"],
            confidence_score=f["confidence_score"],
            recommendation=rec_obj.recommendation_text if rec_obj else None,
            recommendation_id=rec_obj.id if rec_obj else None,
            recommendation_status=rec_obj.status.value if rec_obj else None
        ))

    return results

@router.get("/recommendations")
def list_workforce_recommendations(
    coop_id: int = 1,
    db: Session = Depends(get_db),
    admin: User = Depends(require_coop_admin)
):
    recs = db.query(WorkforceRecommendation).filter(
        WorkforceRecommendation.coop_id == coop_id
    ).order_by(WorkforceRecommendation.created_at.desc()).all()

    return [
        {
            "id": r.id,
            "title": r.title,
            "recommendation_text": r.recommendation_text,
            "status": r.status.value,
            "created_at": r.created_at
        }
        for r in recs
    ]

@router.post("/recommendations/{rec_id}/action")
def update_recommendation_action(
    rec_id: int,
    action_in: WorkforceRecommendationAction,
    db: Session = Depends(get_db),
    admin: User = Depends(require_coop_admin)
):
    rec = db.query(WorkforceRecommendation).filter(WorkforceRecommendation.id == rec_id).first()
    if not rec:
        raise HTTPException(status_code=404, detail="Recommendation not found")

    if action_in.action == "APPROVE":
        rec.status = RecommendationStatus.APPROVED
    elif action_in.action == "REJECT":
        rec.status = RecommendationStatus.REJECTED

    db.commit()
    db.refresh(rec)
    return {"message": f"Recommendation #{rec.id} status updated to {rec.status.value}", "status": rec.status.value}

@router.get("/heatmap")
def get_demand_heatmap(
    db: Session = Depends(get_db),
    admin: User = Depends(require_coop_admin)
):
    """
    Returns localized demand density by district and service for admin map visualizer.
    Color coding: High = Red, Medium = Orange, Normal = Green.
    """
    # Sample Pune & Mumbai urban nodes with coordinate clusters
    heatmap_zones = [
        {"district": "Pune Central / Shivajinagar", "lat": 18.5314, "lon": 73.8446, "category": "Plumbing", "demand": 142, "status": "HIGH", "color": "#ef4444"},
        {"district": "Kothrud / Karve Road", "lat": 18.5074, "lon": 73.8077, "category": "Electrical", "demand": 98, "status": "MEDIUM", "color": "#f97316"},
        {"district": "Hinjawadi IT Park Phase 1-3", "lat": 18.5913, "lon": 73.7389, "category": "AC & Appliance Repair", "demand": 185, "status": "HIGH", "color": "#ef4444"},
        {"district": "Viman Nagar / Kharadi", "lat": 18.5679, "lon": 73.9143, "category": "Cleaning & Sanitation", "demand": 72, "status": "NORMAL", "color": "#10b981"},
        {"district": "Hadapsar / Magarpatta", "lat": 18.5089, "lon": 73.9260, "category": "Carpentry", "demand": 64, "status": "NORMAL", "color": "#10b981"},
        {"district": "Baner / Balewadi", "lat": 18.5590, "lon": 73.7868, "category": "Plumbing", "demand": 115, "status": "HIGH", "color": "#ef4444"},
        {"district": "Pimpri-Chinchwad MIDC", "lat": 18.6279, "lon": 73.8131, "category": "Electrical", "demand": 88, "status": "MEDIUM", "color": "#f97316"}
    ]
    return heatmap_zones
