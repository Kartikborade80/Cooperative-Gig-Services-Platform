import uuid
from datetime import datetime, timezone
from sqlalchemy.orm import Session
from fastapi import HTTPException
from app.models.models import (
    Booking, BookingStatus, Payment, PaymentStatus, 
    Invoice, Worker, WelfareAccount, User
)
from app.core.config import settings

class PaymentService:
    @classmethod
    def calculate_split(cls, total_amount: float, commission_percent: float = None) -> tuple[float, float]:
        """
        Calculates cooperative contribution and worker payout.
        Default: 5% cooperative welfare / ops fee, 95% worker net earnings.
        """
        rate = commission_percent if commission_percent is not None else settings.COOP_COMMISSION_PERCENTAGE
        coop_fee = round((total_amount * rate) / 100.0, 2)
        worker_payout = round(total_amount - coop_fee, 2)
        return coop_fee, worker_payout

    @classmethod
    def process_mock_payment(
        cls,
        db: Session,
        booking_id: int,
        customer_id: int,
        method: str = "UPI",
        upi_id: str = "customer@upi"
    ) -> Payment:
        """
        Simulates payment processing.
        Prevents duplicate payments and validates booking status.
        """
        booking = db.query(Booking).filter(Booking.id == booking_id).first()
        if not booking:
            raise HTTPException(status_code=404, detail="Booking not found")

        if booking.customer_id != customer_id:
            raise HTTPException(status_code=403, detail="Unauthorized to pay for this booking")

        # Check existing payment
        existing_payment = db.query(Payment).filter(
            Payment.booking_id == booking_id,
            Payment.status == PaymentStatus.SUCCESS
        ).first()
        if existing_payment:
            raise HTTPException(status_code=400, detail="Booking has already been paid for")

        if booking.status not in [BookingStatus.COMPLETED, BookingStatus.PAYMENT_PENDING]:
            raise HTTPException(
                status_code=400, 
                detail=f"Cannot pay for booking with status '{booking.status}'. Service must be completed first."
            )

        # Calculate amounts
        total_amount = booking.total_amount
        if total_amount <= 0:
            total_amount = (booking.labour_charge or 350.0) + (booking.material_charge or 0.0)
            booking.total_amount = total_amount

        coop_fee, worker_payout = cls.calculate_split(total_amount)
        booking.coop_fee = coop_fee
        booking.worker_earnings = worker_payout

        # Generate unique transaction reference
        txn_ref = f"TXN_UPI_{datetime.now(timezone.utc).strftime('%Y%m%d%H%M%S')}_{uuid.uuid4().hex[:6].upper()}"

        payment = Payment(
            booking_id=booking.id,
            customer_id=booking.customer_id,
            worker_id=booking.worker_id,
            amount=total_amount,
            coop_fee=coop_fee,
            worker_payout=worker_payout,
            method=method,
            status=PaymentStatus.SUCCESS,
            transaction_ref=txn_ref,
            paid_at=datetime.now(timezone.utc)
        )
        db.add(payment)

        # Update booking status
        booking.status = BookingStatus.PAID
        booking.updated_at = datetime.now(timezone.utc)

        # Update worker earnings & recent jobs
        if booking.worker:
            booking.worker.total_earnings = (booking.worker.total_earnings or 0.0) + worker_payout
            booking.worker.total_jobs_completed = (booking.worker.total_jobs_completed or 0) + 1
            booking.worker.recent_jobs_count = (booking.worker.recent_jobs_count or 0) + 1

            # Update worker welfare account
            welfare = db.query(WelfareAccount).filter(WelfareAccount.worker_id == booking.worker.id).first()
            if welfare:
                welfare.total_contributed = (welfare.total_contributed or 0.0) + round(coop_fee * 0.4, 2) # 40% of coop fee directly into worker welfare pool
                welfare.balance = (welfare.balance or 0.0) + round(coop_fee * 0.4, 2)
                welfare.updated_at = datetime.now(timezone.utc)

        # Auto-generate Invoice
        inv_number = f"INV-{datetime.now(timezone.utc).year}-{booking.id:05d}"
        existing_invoice = db.query(Invoice).filter(Invoice.booking_id == booking.id).first()
        if not existing_invoice:
            customer_name = booking.customer.full_name if booking.customer else "Valued Customer"
            worker_name = booking.worker.user.full_name if (booking.worker and booking.worker.user) else "Assigned Worker"
            coop_name = booking.worker.cooperative.name if (booking.worker and booking.worker.cooperative) else settings.DEFAULT_COOP_NAME

            invoice = Invoice(
                invoice_number=inv_number,
                booking_id=booking.id,
                customer_name=customer_name,
                worker_name=worker_name,
                coop_name=coop_name,
                service_name=booking.service.name if booking.service else "Home Service",
                labour_charge=booking.labour_charge,
                material_charge=booking.material_charge,
                coop_fee=coop_fee,
                worker_earnings=worker_payout,
                total_amount=total_amount,
                payment_method=method,
                transaction_ref=txn_ref,
                issue_date=datetime.now(timezone.utc)
            )
            db.add(invoice)

        db.commit()
        db.refresh(payment)
        return payment
