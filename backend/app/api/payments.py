from typing import List
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.models.models import Payment, User, UserRole, Booking
from app.schemas.schemas import PaymentProcessRequest, PaymentResponse
from app.services.payment_service import PaymentService
from app.api.deps import require_customer, get_current_user

router = APIRouter(prefix="/payments", tags=["Payments"])

@router.post("/process", response_model=PaymentResponse)
def process_payment(
    payment_in: PaymentProcessRequest,
    db: Session = Depends(get_db),
    customer: User = Depends(require_customer)
):
    payment = PaymentService.process_mock_payment(
        db=db,
        booking_id=payment_in.booking_id,
        customer_id=customer.id,
        method=payment_in.method,
        upi_id=payment_in.upi_id or "customer@upi"
    )
    return payment

@router.get("/history", response_model=List[PaymentResponse])
def get_payment_history(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    query = db.query(Payment)
    if current_user.role == UserRole.CUSTOMER:
        query = query.filter(Payment.customer_id == current_user.id)
    elif current_user.role == UserRole.WORKER:
        if current_user.worker_profile:
            query = query.filter(Payment.worker_id == current_user.worker_profile.id)
        else:
            return []
    # ADMIN sees all payments
    payments = query.order_by(Payment.created_at.desc()).all()
    return payments
