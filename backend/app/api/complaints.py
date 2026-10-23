from typing import List, Optional
from datetime import datetime, timezone
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.models.models import Complaint, ComplaintStatus, User, UserRole
from app.schemas.schemas import ComplaintCreate, ComplaintResponse
from app.api.deps import get_current_user, require_customer, require_coop_admin

router = APIRouter(prefix="/complaints", tags=["Complaints"])

@router.post("/", response_model=ComplaintResponse)
def create_complaint(
    complaint_in: ComplaintCreate,
    db: Session = Depends(get_db),
    customer: User = Depends(require_customer)
):
    complaint = Complaint(
        booking_id=complaint_in.booking_id,
        customer_id=customer.id,
        category=complaint_in.category,
        description=complaint_in.description,
        priority=complaint_in.priority,
        status=ComplaintStatus.OPEN
    )
    db.add(complaint)
    db.commit()
    db.refresh(complaint)
    return ComplaintResponse(
        id=complaint.id,
        booking_id=complaint.booking_id,
        customer_id=complaint.customer_id,
        customer_name=customer.full_name,
        category=complaint.category,
        description=complaint.description,
        priority=complaint.priority,
        status=complaint.status,
        resolution_notes=complaint.resolution_notes,
        created_at=complaint.created_at
    )

@router.get("/", response_model=List[ComplaintResponse])
def get_complaints(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    query = db.query(Complaint)
    if current_user.role == UserRole.CUSTOMER:
        query = query.filter(Complaint.customer_id == current_user.id)
    # ADMIN sees all complaints
    complaints = query.order_by(Complaint.created_at.desc()).all()
    return [
        ComplaintResponse(
            id=c.id,
            booking_id=c.booking_id,
            customer_id=c.customer_id,
            customer_name=c.customer.full_name if c.customer else "Customer",
            category=c.category,
            description=c.description,
            priority=c.priority,
            status=c.status,
            resolution_notes=c.resolution_notes,
            created_at=c.created_at
        )
        for c in complaints
    ]

@router.patch("/{complaint_id}/resolve")
def resolve_complaint(
    complaint_id: int,
    resolution_notes: str,
    db: Session = Depends(get_db),
    admin: User = Depends(require_coop_admin)
):
    complaint = db.query(Complaint).filter(Complaint.id == complaint_id).first()
    if not complaint:
        raise HTTPException(status_code=404, detail="Complaint not found")

    complaint.status = ComplaintStatus.RESOLVED
    complaint.resolution_notes = resolution_notes
    complaint.resolved_at = datetime.now(timezone.utc)
    db.commit()
    db.refresh(complaint)
    return {"message": "Complaint resolved", "status": complaint.status.value}
