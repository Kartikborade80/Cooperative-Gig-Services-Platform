from datetime import datetime, timezone
from typing import Optional
from sqlalchemy.orm import Session
from fastapi import HTTPException
from app.models.models import (
    Booking, BookingStatus, BookingStatusHistory, 
    Notification, User, Worker, UserRole
)

ALLOWED_TRANSITIONS = {
    BookingStatus.REQUESTED: [BookingStatus.MATCHING, BookingStatus.WORKER_ASSIGNED, BookingStatus.CANCELLED],
    BookingStatus.MATCHING: [BookingStatus.WORKER_ASSIGNED, BookingStatus.CANCELLED],
    BookingStatus.WORKER_ASSIGNED: [BookingStatus.ACCEPTED, BookingStatus.REJECTED, BookingStatus.PRICE_PROPOSED, BookingStatus.CANCELLED],
    BookingStatus.PRICE_PROPOSED: [BookingStatus.ACCEPTED, BookingStatus.REJECTED, BookingStatus.SCHEDULED, BookingStatus.CANCELLED],
    BookingStatus.ACCEPTED: [BookingStatus.SCHEDULED, BookingStatus.ON_THE_WAY, BookingStatus.CANCELLED],
    BookingStatus.SCHEDULED: [BookingStatus.ON_THE_WAY, BookingStatus.CANCELLED],
    BookingStatus.ON_THE_WAY: [BookingStatus.ARRIVED, BookingStatus.CANCELLED],
    BookingStatus.ARRIVED: [BookingStatus.SERVICE_STARTED, BookingStatus.CANCELLED],
    BookingStatus.SERVICE_STARTED: [BookingStatus.COMPLETED, BookingStatus.CANCELLED],
    BookingStatus.COMPLETED: [BookingStatus.PAYMENT_PENDING, BookingStatus.PAID],
    BookingStatus.PAYMENT_PENDING: [BookingStatus.PAID],
    BookingStatus.PAID: [BookingStatus.RATED, BookingStatus.CLOSED],
    BookingStatus.RATED: [BookingStatus.CLOSED],
    BookingStatus.REJECTED: [BookingStatus.REQUESTED, BookingStatus.MATCHING, BookingStatus.WORKER_ASSIGNED, BookingStatus.CANCELLED],
    BookingStatus.CLOSED: [],
    BookingStatus.CANCELLED: []
}

class BookingService:
    @classmethod
    def transition_status(
        cls,
        db: Session,
        booking: Booking,
        new_status: BookingStatus,
        changed_by_user: User,
        remarks: Optional[str] = None,
        labour_charge: Optional[float] = None,
        material_charge: Optional[float] = None
    ) -> Booking:
        """
        Validates and applies booking status transitions in compliance with the state machine.
        """
        current_status = booking.status

        # If already in the target status
        if current_status == new_status:
            return booking

        # Validate transition
        allowed = ALLOWED_TRANSITIONS.get(current_status, [])
        if new_status not in allowed:
            raise HTTPException(
                status_code=400,
                detail=f"Invalid status transition from '{current_status.value}' to '{new_status.value}'"
            )

        # Role-based authorization check
        if changed_by_user.role == UserRole.WORKER:
            # Workers can only accept/reject/progress their own assigned jobs
            if booking.worker and booking.worker.user_id != changed_by_user.id:
                raise HTTPException(status_code=403, detail="Worker not assigned to this booking")
            if new_status in [BookingStatus.RATED, BookingStatus.PAID]:
                raise HTTPException(status_code=403, detail="Workers cannot self-rate or mark as paid")

        if changed_by_user.role == UserRole.CUSTOMER:
            if booking.customer_id != changed_by_user.id:
                raise HTTPException(status_code=403, detail="Customer unauthorized for this booking")
            # Customers can cancel or rate, not advance worker on-site stages
            if new_status in [BookingStatus.ON_THE_WAY, BookingStatus.ARRIVED, BookingStatus.SERVICE_STARTED, BookingStatus.COMPLETED]:
                raise HTTPException(status_code=403, detail="Only worker can update on-site progress")

        # Update charges if provided during completion
        if labour_charge is not None and labour_charge > 0:
            booking.labour_charge = labour_charge
        if material_charge is not None:
            booking.material_charge = material_charge
            
        booking.total_amount = (booking.labour_charge or 0.0) + (booking.material_charge or 0.0)

        # Log history
        history = BookingStatusHistory(
            booking_id=booking.id,
            from_status=current_status.value,
            to_status=new_status.value,
            changed_by_user_id=changed_by_user.id,
            remarks=remarks
        )
        db.add(history)

        # Apply status
        booking.status = new_status
        booking.updated_at = datetime.now(timezone.utc)

        # Dispatch Notifications
        cls._create_status_notifications(db, booking, new_status, remarks=remarks)

        db.commit()
        db.refresh(booking)
        return booking

    @classmethod
    def _create_status_notifications(
        cls, 
        db: Session, 
        booking: Booking, 
        status: BookingStatus,
        remarks: Optional[str] = None
    ):
        price_val = booking.worker_proposed_price or booking.labour_charge or 0.0
        
        # Determine cancellation messages
        cust_cancel_msg = f"Booking #{booking.booking_ref} was cancelled."
        cust_cancel_title = "Booking Cancelled"
        work_cancel_msg = f"Booking #{booking.booking_ref} was cancelled."
        work_cancel_title = "Booking Cancelled"

        if status == BookingStatus.CANCELLED:
            if remarks and "Worker" in remarks:
                cust_cancel_title = "Worker Cancelled Booking"
                cust_cancel_msg = f"The assigned worker could not fulfill booking #{booking.booking_ref} ({remarks}). You can find and book another available worker."
                work_cancel_title = "Booking Cancelled"
                work_cancel_msg = f"You cancelled booking #{booking.booking_ref}."
            elif remarks and "Customer" in remarks:
                cust_cancel_title = "Booking Cancelled"
                cust_cancel_msg = f"You have cancelled booking #{booking.booking_ref}."
                work_cancel_title = "Customer Cancelled Booking"
                work_cancel_msg = f"Customer cancelled booking #{booking.booking_ref} ({remarks})."

        messages = {
            BookingStatus.ACCEPTED: ("Job Accepted", f"Worker has accepted your booking #{booking.booking_ref}."),
            BookingStatus.REJECTED: ("Booking Rejected / Needs Reassignment", f"Worker could not take booking #{booking.booking_ref}. Matching alternative worker."),
            BookingStatus.PRICE_PROPOSED: ("Price Quote Proposed", f"Worker proposed ₹{price_val:.2f} for booking #{booking.booking_ref}."),
            BookingStatus.SCHEDULED: ("Service Scheduled", f"Booking #{booking.booking_ref} is confirmed and scheduled."),
            BookingStatus.ON_THE_WAY: ("Worker On The Way", f"Worker is on the way for booking #{booking.booking_ref}."),
            BookingStatus.ARRIVED: ("Worker Arrived", f"Worker has arrived at your location for #{booking.booking_ref}."),
            BookingStatus.SERVICE_STARTED: ("Service Started", f"Worker has started service for #{booking.booking_ref}."),
            BookingStatus.COMPLETED: ("Service Completed", f"Service for #{booking.booking_ref} is completed. Please review and pay."),
            BookingStatus.PAID: ("Payment Received", f"Payment confirmed for booking #{booking.booking_ref}. Thank you!"),
            BookingStatus.CANCELLED: (cust_cancel_title, cust_cancel_msg)
        }

        if status in messages:
            title, msg = messages[status]
            # Notify Customer
            db.add(Notification(
                user_id=booking.customer_id,
                title=title,
                message=msg,
                type="BOOKING_UPDATE",
                link=f"/bookings/{booking.id}"
            ))
            # Notify Worker if applicable
            if booking.worker and booking.worker.user_id:
                w_title = work_cancel_title if status == BookingStatus.CANCELLED else f"Booking #{booking.booking_ref} Updated"
                w_msg = work_cancel_msg if status == BookingStatus.CANCELLED else f"Status changed to {status.value}."
                db.add(Notification(
                    user_id=booking.worker.user_id,
                    title=w_title,
                    message=w_msg,
                    type="BOOKING_UPDATE",
                    link=f"/worker/jobs"
                ))
