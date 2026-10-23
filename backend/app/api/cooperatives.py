from typing import List, Dict, Any
from datetime import datetime, timezone
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import func
from app.core.database import get_db
from app.models.models import (
    Cooperative, Worker, Booking, Payment, WelfareAccount, 
    VerificationStatus, BookingStatus, User
)
from app.schemas.schemas import CooperativeResponse
from app.api.deps import require_coop_admin

router = APIRouter(prefix="/cooperatives", tags=["Cooperatives"])

@router.get("/", response_model=List[CooperativeResponse])
def get_cooperatives(db: Session = Depends(get_db)):
    coops = db.query(Cooperative).all()
    return coops

@router.get("/{coop_id}/stats")
def get_cooperative_stats(
    coop_id: int,
    db: Session = Depends(get_db),
    admin: User = Depends(require_coop_admin)
):
    coop = db.query(Cooperative).filter(Cooperative.id == coop_id).first()
    if not coop:
        raise HTTPException(status_code=404, detail="Cooperative not found")

    total_workers = db.query(Worker).filter(Worker.cooperative_id == coop_id).count()
    verified_workers = db.query(Worker).filter(
        Worker.cooperative_id == coop_id,
        Worker.verification_status == VerificationStatus.VERIFIED
    ).count()
    pending_verification = db.query(Worker).filter(
        Worker.cooperative_id == coop_id,
        Worker.verification_status == VerificationStatus.PENDING_VERIFICATION
    ).count()
    active_workers = db.query(Worker).filter(
        Worker.cooperative_id == coop_id,
        Worker.verification_status == VerificationStatus.VERIFIED,
        Worker.is_available == True
    ).count()

    total_bookings = db.query(Booking).count()
    emergency_bookings = db.query(Booking).filter(Booking.is_emergency == True).count()
    completed_bookings = db.query(Booking).filter(
        Booking.status.in_([BookingStatus.COMPLETED, BookingStatus.PAID, BookingStatus.RATED, BookingStatus.CLOSED])
    ).count()

    # Payments summary
    total_tx_val = db.query(func.sum(Payment.amount)).scalar() or 0.0
    worker_payout_total = db.query(func.sum(Payment.worker_payout)).scalar() or 0.0
    coop_commission_total = db.query(func.sum(Payment.coop_fee)).scalar() or 0.0

    # Welfare accounts total
    welfare_pool_total = db.query(func.sum(WelfareAccount.balance)).scalar() or 0.0

    return {
        "cooperative": {
            "id": coop.id,
            "name": coop.name,
            "registration_no": coop.registration_no,
            "district": coop.district,
            "state": coop.state,
            "commission_rate": coop.commission_rate
        },
        "metrics": {
            "total_workers": total_workers,
            "verified_workers": verified_workers,
            "pending_verification": pending_verification,
            "active_available_workers": active_workers,
            "total_bookings": total_bookings,
            "emergency_bookings": emergency_bookings,
            "completed_bookings": completed_bookings,
            "total_transaction_value": round(total_tx_val, 2),
            "total_worker_earnings": round(worker_payout_total, 2),
            "cooperative_fee_collected": round(coop_commission_total, 2),
            "welfare_pool_total": round(welfare_pool_total, 2)
        }
    }
