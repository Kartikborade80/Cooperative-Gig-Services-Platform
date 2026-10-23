from typing import List, Optional
from datetime import datetime
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.core.config import settings
from app.models.models import (
    Worker, User, WorkerSkill, 
    WorkerCertification, AuditLog, WorkerAvailability, 
    Booking, BookingStatus
)
from app.schemas.schemas import (
    WorkerResponse, WorkerVerificationUpdate, 
    WorkerAvailabilityUpdate, WorkerLocationUpdate,
    WorkerIdentityVerifyRequest, TimeSlotAvailabilityResponse
)
from app.api.deps import get_current_user, require_worker, require_coop_admin
from app.services.identity_verification_service import IdentityVerificationService
from app.ml.matching_engine import calculate_haversine_distance

router = APIRouter(prefix="/workers", tags=["Workers"])

def _format_worker_response(w: Worker, distance_km: Optional[float] = None) -> WorkerResponse:
    skills = []
    for s in w.skills:
        skills.append({
            "skill_name": s.skill.name if s.skill else "General",
            "proficiency_level": s.proficiency_level,
            "verified_by_coop": s.verified_by_coop
        })
    certs = []
    for c in w.certifications:
        certs.append({
            "name": c.certification.name if c.certification else "Coop Certificate",
            "issuing_authority": c.certification.issuing_authority if c.certification else "State Board",
            "certificate_no": c.certificate_no,
            "is_verified": c.is_verified
        })
    
    categories = [cat.category_name for cat in w.categories if cat.is_verified]
    if not categories and w.skills:
        for s in w.skills:
            if s.skill and s.skill.category:
                categories.append(s.skill.category)
            elif s.skill and s.skill.name:
                categories.append(s.skill.name)

    return WorkerResponse(
        id=w.id,
        user_id=w.user_id,
        full_name=w.user.full_name if w.user else "Cooperative Worker",
        email=w.user.email if w.user else "",
        phone=w.user.phone if w.user else "",
        cooperative_name=w.cooperative.name if w.cooperative else settings.DEFAULT_COOP_NAME,
        verification_status=w.verification_status or "PENDING",
        identity_status=w.identity_status or "PENDING",
        identity_ref=w.identity_ref,
        experience_years=w.experience_years or 1.0,
        starting_price=w.starting_price or 350.0,
        bio=w.bio,
        service_area=w.service_area or f"{settings.DEFAULT_CITY} & Surrounds",
        lat=w.lat or settings.DEFAULT_LAT,
        lon=w.lon or settings.DEFAULT_LON,
        is_available=w.is_available,
        emergency_available=w.emergency_available,
        languages=w.languages or "Marathi, Hindi, English",
        reliability_score=w.reliability_score or 95.0,
        average_rating=w.average_rating or 5.0,
        rating_count=w.rating_count or 0,
        total_jobs_completed=w.total_jobs_completed or 0,
        service_categories=list(set(categories)),
        distance_km=round(distance_km, 1) if distance_km is not None else None,
        skills=skills,
        certifications=certs
    )

@router.get("/", response_model=List[WorkerResponse])
def get_verified_workers(
    category: Optional[str] = None,
    available_only: bool = True,
    emergency_only: bool = False,
    customer_lat: Optional[float] = None,
    customer_lon: Optional[float] = None,
    max_radius_km: float = 20.0,
    db: Session = Depends(get_db)
):
    """
    Returns verified workers.
    CRITICAL RULE:
    1. Rejects any workers located outside max_radius_km (Default: 20 KM).
    2. Strictly filters workers by selected category if provided.
    """
    c_lat = customer_lat if customer_lat is not None else settings.DEFAULT_LAT
    c_lon = customer_lon if customer_lon is not None else settings.DEFAULT_LON

    query = db.query(Worker).join(User, Worker.user_id == User.id).filter(
        Worker.verification_status == "VERIFIED",
        User.email_verified == True,
        User.is_active == True
    )
    if available_only:
        query = query.filter(Worker.is_available == True)
    if emergency_only:
        query = query.filter(Worker.emergency_available == True)
        
    workers = query.all()
    filtered_workers = []

    for w in workers:
        w_lat = w.lat or settings.DEFAULT_LAT
        w_lon = w.lon or settings.DEFAULT_LON
        dist = calculate_haversine_distance(c_lat, c_lon, w_lat, w_lon)
        
        # Enforce 20 KM radius limit
        if dist > max_radius_km:
            continue

        # Enforce Category filter if provided
        if category and category.strip():
            cat_clean = category.strip().lower()
            worker_cats = [c.category_name.lower() for c in w.categories]
            worker_skills = [
                ws.skill.name.lower() for ws in w.skills if ws.skill
            ] + [
                ws.skill.category.lower() for ws in w.skills if ws.skill and ws.skill.category
            ]
            all_cat_skill_terms = worker_cats + worker_skills
            
            matches = any(
                cat_clean in term or term in cat_clean
                for term in all_cat_skill_terms
            )
            if not matches:
                continue

        filtered_workers.append((w, dist))

    # Sort by distance
    filtered_workers.sort(key=lambda item: item[1])
    return [_format_worker_response(w, dist) for w, dist in filtered_workers]

@router.get("/all", response_model=List[WorkerResponse])
def get_all_workers_admin(
    db: Session = Depends(get_db),
    admin: User = Depends(require_coop_admin)
):
    workers = db.query(Worker).all()
    return [_format_worker_response(w) for w in workers]

@router.get("/me", response_model=WorkerResponse)
@router.get("/me/profile", response_model=WorkerResponse)
def get_worker_me(
    db: Session = Depends(get_db),
    current_user: User = Depends(require_worker)
):
    worker = db.query(Worker).filter(Worker.user_id == current_user.id).first()
    if not worker:
        raise HTTPException(status_code=404, detail="Worker profile not found for this account")
    return _format_worker_response(worker)

@router.post("/me/verify-identity")
def verify_identity_doc(
    req: WorkerIdentityVerifyRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_worker)
):
    """
    Submits worker identity document via Identity Verification Adapter.
    In development mode: Executes Demo Identity Verification with reference generation.
    """
    worker = db.query(Worker).filter(Worker.user_id == current_user.id).first()
    if not worker:
        raise HTTPException(status_code=404, detail="Worker profile not found")

    # Resolve document number: use document_number or aadhaar_last_four
    doc_number = req.document_number or req.aadhaar_last_four or "DEMO0000"
    result = IdentityVerificationService.verify_worker(
        db=db,
        worker=worker,
        doc_type=req.document_type,
        doc_number=doc_number,
        user=current_user
    )
    # Normalize response keys for test compatibility
    return {
        **result,
        "identity_status": worker.identity_status,
        "worker_status": worker.verification_status,
    }

@router.get("/{worker_id}/available-slots", response_model=TimeSlotAvailabilityResponse)
def get_worker_available_slots(
    worker_id: int,
    date: str, # Format: YYYY-MM-DD
    db: Session = Depends(get_db)
):
    """
    Returns available time slots for a specific worker on a specific date.
    Excludes any slots that are already confirmed/booked.
    """
    worker = db.query(Worker).filter(Worker.id == worker_id).first()
    if not worker:
        raise HTTPException(status_code=404, detail="Worker not found")

    # Standard daily slots
    standard_slots = [
        "09:00 AM - 10:00 AM",
        "11:00 AM - 12:00 PM",
        "02:00 PM - 03:00 PM",
        "04:00 PM - 05:00 PM",
        "06:00 PM - 07:00 PM"
    ]

    # Find existing bookings for this worker on this date
    existing_bookings = db.query(Booking).filter(
        Booking.worker_id == worker_id,
        Booking.booking_date == date,
        Booking.status.notin_([BookingStatus.CANCELLED])
    ).all()

    booked_slots = [b.time_slot for b in existing_bookings if b.time_slot]
    available_slots = [s for s in standard_slots if s not in booked_slots]

    return TimeSlotAvailabilityResponse(
        worker_id=worker_id,
        date=date,
        available_slots=available_slots,
        booked_slots=booked_slots,
        slots=available_slots  # alias for frontend/test compatibility
    )

@router.patch("/me/availability", response_model=WorkerResponse)
def update_worker_availability(
    avail_in: WorkerAvailabilityUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_worker)
):
    worker = db.query(Worker).filter(Worker.user_id == current_user.id).first()
    if not worker:
        raise HTTPException(status_code=404, detail="Worker profile not found")
        
    worker.is_available = avail_in.is_available
    if avail_in.emergency_available is not None:
        worker.emergency_available = avail_in.emergency_available
        
    db.commit()
    db.refresh(worker)
    return _format_worker_response(worker)

@router.patch("/me/location", response_model=WorkerResponse)
def update_worker_location(
    loc_in: WorkerLocationUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_worker)
):
    worker = db.query(Worker).filter(Worker.user_id == current_user.id).first()
    if not worker:
        raise HTTPException(status_code=404, detail="Worker profile not found")
        
    worker.lat = loc_in.lat
    worker.lon = loc_in.lon
    db.commit()
    db.refresh(worker)
    return _format_worker_response(worker)

@router.get("/{worker_id}", response_model=WorkerResponse)
def get_worker_by_id(worker_id: int, db: Session = Depends(get_db)):
    worker = db.query(Worker).filter(Worker.id == worker_id).first()
    if not worker:
        raise HTTPException(status_code=404, detail="Worker not found")
    return _format_worker_response(worker)

@router.patch("/{worker_id}/verification", response_model=WorkerResponse)
def update_worker_verification(
    worker_id: int,
    verif_in: WorkerVerificationUpdate,
    db: Session = Depends(get_db),
    admin: User = Depends(require_coop_admin)
):
    worker = db.query(Worker).filter(Worker.id == worker_id).first()
    if not worker:
        raise HTTPException(status_code=404, detail="Worker not found")

    old_status = worker.verification_status
    worker.verification_status = verif_in.verification_status

    # Audit log
    audit = AuditLog(
        user_id=admin.id,
        action="VERIFY_WORKER",
        entity_name="Worker",
        entity_id=str(worker.id),
        details=f"Status changed from {old_status} to {verif_in.verification_status}. Remarks: {verif_in.remarks}"
    )
    db.add(audit)

    db.commit()
    db.refresh(worker)
    return _format_worker_response(worker)
