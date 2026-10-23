from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.core.config import settings
from app.models.models import Service, Worker
from app.schemas.schemas import (
    AIClassifyRequest, AIClassifyResponse, 
    MatchedWorkerResponse, MatchScoreFactors
)
from app.ml.ai_service_assistant import classify_user_problem
from app.ml.matching_engine import FairWorkerMatchingEngine
from app.api.workers import _format_worker_response

router = APIRouter(prefix="/matching", tags=["AI & Matching"])

@router.post("/ai-assistant", response_model=AIClassifyResponse)
def run_ai_service_assistant(
    request: AIClassifyRequest,
    db: Session = Depends(get_db)
):
    classification = classify_user_problem(request.prompt)
    
    # Try finding matching service ID in DB
    category_name = classification["category"]
    service_obj = db.query(Service).filter(
        Service.name.ilike(f"%{classification['required_skill']}%")
    ).first()
    
    suggested_id = service_obj.id if service_obj else None

    return AIClassifyResponse(
        category=classification["category"],
        problem=classification["problem"],
        urgency=classification["urgency"],
        required_skill=classification["required_skill"],
        confidence=classification["confidence"],
        suggested_service_id=suggested_id,
        explanation=classification["explanation"]
    )

@router.get("/find-workers", response_model=List[MatchedWorkerResponse])
def find_matching_workers(
    service_id: int,
    lat: Optional[float] = None,
    lon: Optional[float] = None,
    is_emergency: bool = False,
    max_radius_km: float = 20.0,
    db: Session = Depends(get_db)
):
    """
    Finds verified cooperative workers for the chosen service.
    Enforces the 20 KM radius rule strictly.
    """
    c_lat = lat if lat is not None else settings.DEFAULT_LAT
    c_lon = lon if lon is not None else settings.DEFAULT_LON

    service = db.query(Service).filter(Service.id == service_id).first()
    if not service:
        raise HTTPException(status_code=404, detail="Service not found")

    required_skill = service.name
    category_name = service.category.name if service.category else ""
    candidates = FairWorkerMatchingEngine.match_workers(
        db=db,
        service_id=service_id,
        customer_lat=c_lat,
        customer_lon=c_lon,
        required_skill_name=required_skill,
        category_name=category_name,
        is_emergency=is_emergency,
        max_results=8,
        max_radius_km=max_radius_km
    )

    results = []
    for c in candidates:
        worker_model = c["worker"]
        scores_data = c["scores"]
        summary = c["matching_summary"]
        badge = c.get("consumer_badge", "Best Match")

        factors = MatchScoreFactors(
            skill_match=scores_data["skill_match"],
            availability=scores_data["availability"],
            distance=scores_data["distance"],
            reliability=scores_data["reliability"],
            customer_rating=scores_data["customer_rating"],
            fairness_factor=scores_data["fairness_factor"],
            final_score=scores_data["final_score"],
            distance_km=scores_data["distance_km"],
            eta_minutes=scores_data["eta_minutes"]
        )

        results.append(MatchedWorkerResponse(
            worker=_format_worker_response(worker_model, distance_km=scores_data["distance_km"]),
            scores=factors,
            matching_summary=summary,
            consumer_badge=badge,
            distance_km=scores_data["distance_km"],
            eta_minutes=scores_data["eta_minutes"]
        ))

    return results
