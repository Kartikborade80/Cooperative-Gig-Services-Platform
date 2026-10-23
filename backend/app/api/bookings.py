import uuid
from datetime import datetime, timezone
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.core.config import settings
from app.models.models import (
    Booking, BookingStatus, BookingStatusHistory, 
    Service, Worker, User, UserRole, Notification,
    BookingQuote, BookingMessage
)
from app.schemas.schemas import (
    BookingCreate, BookingStatusUpdate, BookingCancelRequest, BookingResponse,
    BookingQuoteCreate, BookingQuoteAction, BookingQuoteResponse,
    BookingMessageCreate, BookingMessageResponse
)
from app.api.deps import get_current_user, require_customer, require_worker
from app.services.booking_service import BookingService
from app.services.email_service import EmailService
from app.ml.matching_engine import FairWorkerMatchingEngine, calculate_haversine_distance

router = APIRouter(prefix="/bookings", tags=["Bookings"])

def _format_booking_response(b: Booking, current_user: Optional[User] = None) -> BookingResponse:
    # Privacy rule: Worker only sees customer phone and full details after ACCEPTED
    can_see_customer_phone = False
    if current_user:
        if current_user.role in [UserRole.CUSTOMER, UserRole.COOPERATIVE_ADMIN, UserRole.SUPER_ADMIN]:
            can_see_customer_phone = True
        elif current_user.role == UserRole.WORKER and b.worker and b.worker.user_id == current_user.id:
            # Only reveal once accepted / scheduled or later
            if b.status in [
                BookingStatus.ACCEPTED, BookingStatus.SCHEDULED, BookingStatus.ON_THE_WAY,
                BookingStatus.ARRIVED, BookingStatus.SERVICE_STARTED, BookingStatus.COMPLETED,
                BookingStatus.PAYMENT_PENDING, BookingStatus.PAID, BookingStatus.RATED,
                BookingStatus.CLOSED
            ]:
                can_see_customer_phone = True
    else:
        can_see_customer_phone = True

    cust_phone = b.customer.phone if (can_see_customer_phone and b.customer) else None
    wrk_phone = b.worker.user.phone if (b.worker and b.worker.user) else None

    # Calculate distance if coordinates available
    dist_km = None
    if b.lat is not None and b.lon is not None and b.worker and b.worker.lat is not None and b.worker.lon is not None:
        dist_km = calculate_haversine_distance(b.lat, b.lon, b.worker.lat, b.worker.lon)

    cat_name = None
    cat_id = None
    if b.service:
        cat_id = b.service.category_id
        if b.service.category:
            cat_name = b.service.category.name

    return BookingResponse(
        id=b.id,
        booking_ref=b.booking_ref,
        customer_id=b.customer_id,
        customer_name=b.customer.full_name if b.customer else "Customer",
        worker_id=b.worker_id,
        worker_name=b.worker.user.full_name if (b.worker and b.worker.user) else None,
        service_id=b.service_id,
        service_name=b.service.name if b.service else "Service",
        category_id=cat_id,
        category_name=cat_name,
        status=b.status,
        is_emergency=b.is_emergency,
        address=b.address,
        city=b.city or settings.DEFAULT_CITY,
        district=b.district or settings.DEFAULT_DISTRICT,
        pincode=b.pincode or "423601",
        lat=b.lat,
        lon=b.lon,
        booking_date=b.booking_date,
        scheduled_date=b.booking_date,
        time_slot=b.time_slot,
        scheduled_time=b.scheduled_time,
        problem_description=b.problem_description,
        urgency=b.urgency or "Normal",
        match_score=b.match_score,
        match_explanation=b.match_explanation,
        labour_charge=b.labour_charge or 0.0,
        material_charge=b.material_charge or 0.0,
        original_estimated_price=b.original_estimated_price or b.labour_charge or 0.0,
        worker_proposed_price=b.worker_proposed_price,
        final_agreed_price=b.final_agreed_price or b.total_amount or 0.0,
        total_amount=b.total_amount or 0.0,
        coop_fee=b.coop_fee or 0.0,
        worker_earnings=b.worker_earnings or 0.0,
        customer_phone=cust_phone,
        worker_phone=wrk_phone,
        distance_km=dist_km,
        created_at=b.created_at,
        updated_at=b.updated_at
    )

@router.post("/", response_model=BookingResponse)
def create_booking(
    booking_in: BookingCreate,
    db: Session = Depends(get_db),
    customer: User = Depends(require_customer)
):
    service = db.query(Service).filter(Service.id == booking_in.service_id).first()
    if not service:
        raise HTTPException(status_code=404, detail="Service not found")

    cust_lat = booking_in.lat if booking_in.lat is not None else settings.DEFAULT_LAT
    cust_lon = booking_in.lon if booking_in.lon is not None else settings.DEFAULT_LON

    worker_id = booking_in.worker_id
    match_score = None
    match_explanation = None

    # If worker is specified: validate existence, 20 KM radius, and slot conflict
    if worker_id:
        assigned_worker = db.query(Worker).filter(Worker.id == worker_id).first()
        if not assigned_worker:
            raise HTTPException(status_code=404, detail="Selected worker not found")
        if assigned_worker.verification_status != "VERIFIED":
            raise HTTPException(status_code=400, detail="Worker is not yet cooperative-verified")

        # 20 KM radius enforcement
        w_lat = assigned_worker.lat or settings.DEFAULT_LAT
        w_lon = assigned_worker.lon or settings.DEFAULT_LON
        dist = calculate_haversine_distance(cust_lat, cust_lon, w_lat, w_lon)
        if dist > settings.SERVICE_RADIUS_KM:
            raise HTTPException(
                status_code=400,
                detail=f"Worker is located {dist} km away, which exceeds the 20 KM cooperative service area."
            )

        # Conflict / Double booking prevention check
        chosen_date = booking_in.booking_date or booking_in.scheduled_date
        if chosen_date and booking_in.time_slot:
            conflict = db.query(Booking).filter(
                Booking.worker_id == worker_id,
                Booking.booking_date == chosen_date,
                Booking.time_slot == booking_in.time_slot,
                Booking.status.notin_([BookingStatus.CANCELLED, BookingStatus.REJECTED, BookingStatus.CLOSED])
            ).first()
            if conflict:
                raise HTTPException(
                    status_code=400,
                    detail="This time slot is no longer available. Worker is already booked. Please select another time."
                )

    # If worker not explicitly chosen: auto-match closest, highest scoring worker inside 20 KM
    if not worker_id:
        cat_name = service.category.name if service.category else ""
        candidates = FairWorkerMatchingEngine.match_workers(
            db=db,
            service_id=service.id,
            customer_lat=cust_lat,
            customer_lon=cust_lon,
            required_skill_name=service.name,
            category_name=cat_name,
            is_emergency=booking_in.is_emergency,
            max_results=1,
            max_radius_km=settings.SERVICE_RADIUS_KM
        )
        if candidates:
            worker_id = candidates[0]["worker"].id
            match_score = candidates[0]["scores"]["final_score"]
            match_explanation = candidates[0]["matching_summary"]
        else:
            raise HTTPException(
                status_code=400,
                detail="No verified cooperative workers available within 20 KM of your location."
            )

    booking_ref = f"BK-{datetime.now(timezone.utc).strftime('%Y%m%d')}-{uuid.uuid4().hex[:6].upper()}"
    base_charge = service.base_price

    booking = Booking(
        booking_ref=booking_ref,
        customer_id=customer.id,
        worker_id=worker_id,
        service_id=service.id,
        status=BookingStatus.WORKER_ASSIGNED if worker_id else BookingStatus.REQUESTED,
        is_emergency=booking_in.is_emergency,
        address=booking_in.address,
        city=booking_in.city or settings.DEFAULT_CITY,
        district=booking_in.district or settings.DEFAULT_DISTRICT,
        pincode=booking_in.pincode or "423601",
        lat=cust_lat,
        lon=cust_lon,
        booking_date=booking_in.booking_date or booking_in.scheduled_date,
        time_slot=booking_in.time_slot,
        scheduled_time=booking_in.scheduled_time or datetime.now(timezone.utc),
        problem_description=booking_in.problem_description,
        urgency="High" if booking_in.is_emergency else (booking_in.urgency or "Normal"),
        match_score=match_score,
        match_explanation=match_explanation,
        labour_charge=base_charge,
        material_charge=0.0,
        original_estimated_price=base_charge,
        final_agreed_price=base_charge,
        total_amount=base_charge
    )
    db.add(booking)
    db.commit()
    db.refresh(booking)

    # Initial history log
    db.add(BookingStatusHistory(
        booking_id=booking.id,
        from_status=None,
        to_status=booking.status.value,
        changed_by_user_id=customer.id,
        remarks="Booking created by customer"
    ))

    # Notify worker in-app and via email adapter
    if worker_id:
        assigned_worker = db.query(Worker).filter(Worker.id == worker_id).first()
        if assigned_worker and assigned_worker.user:
            # 1. In-app notification
            db.add(Notification(
                user_id=assigned_worker.user.id,
                title="New Service Request",
                message=f"New booking #{booking_ref} for {service.name} from {customer.full_name} in {booking.city}.",
                type="NEW_JOB",
                link=f"/worker/jobs"
            ))

            # 2. Email notification adapter (uses SMTP or Dev Mock Mode)
            EmailService.send_booking_request_email(
                db=db,
                worker_email=assigned_worker.user.email,
                customer_name=customer.full_name,
                service_name=service.name,
                category_name=service.category.name if service.category else "Home Services",
                date_str=booking.booking_date or "Flexible",
                time_slot=booking.time_slot or "Standard",
                location_area=f"{booking.address}, {booking.city}",
                problem_description=booking.problem_description or "",
                estimated_amount=base_charge,
                booking_ref=booking_ref,
                booking_id=booking.id
            )

    db.commit()
    db.refresh(booking)
    return _format_booking_response(booking, current_user=customer)

@router.post("/emergency", response_model=BookingResponse)
def create_emergency_booking(
    booking_in: BookingCreate,
    db: Session = Depends(get_db),
    customer: User = Depends(require_customer)
):
    booking_in.is_emergency = True
    booking_in.urgency = "High"
    return create_booking(booking_in=booking_in, db=db, customer=customer)

@router.get("/", response_model=List[BookingResponse])
def get_user_bookings(
    status_filter: Optional[str] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    query = db.query(Booking)
    if current_user.role == UserRole.CUSTOMER:
        query = query.filter(Booking.customer_id == current_user.id)
    elif current_user.role == UserRole.WORKER:
        worker = db.query(Worker).filter(Worker.user_id == current_user.id).first()
        if not worker:
            return []
        query = query.filter(Booking.worker_id == worker.id)

    if status_filter:
        query = query.filter(Booking.status == status_filter)

    bookings = query.order_by(Booking.created_at.desc()).all()
    return [_format_booking_response(b, current_user=current_user) for b in bookings]

@router.get("/{booking_id}", response_model=BookingResponse)
def get_booking_by_id(
    booking_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    booking = db.query(Booking).filter(Booking.id == booking_id).first()
    if not booking:
        raise HTTPException(status_code=404, detail="Booking not found")

    # Access control
    if current_user.role == UserRole.CUSTOMER and booking.customer_id != current_user.id:
        raise HTTPException(status_code=403, detail="Forbidden")
    if current_user.role == UserRole.WORKER:
        worker = db.query(Worker).filter(Worker.user_id == current_user.id).first()
        if not worker or booking.worker_id != worker.id:
            raise HTTPException(status_code=403, detail="Forbidden")

    return _format_booking_response(booking, current_user=current_user)

@router.post("/{booking_id}/accept", response_model=BookingResponse)
def accept_booking(
    booking_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_worker)
):
    booking = db.query(Booking).filter(Booking.id == booking_id).first()
    if not booking:
        raise HTTPException(status_code=404, detail="Booking not found")
    if booking.worker and booking.worker.user_id != current_user.id:
        raise HTTPException(status_code=403, detail="You are not assigned to this booking")

    # Update status to ACCEPTED
    updated = BookingService.transition_status(
        db=db,
        booking=booking,
        new_status=BookingStatus.ACCEPTED,
        changed_by_user=current_user,
        remarks="Worker accepted booking request"
    )
    return _format_booking_response(updated, current_user=current_user)

@router.post("/{booking_id}/reject", response_model=BookingResponse)
def reject_booking(
    booking_id: int,
    reason: Optional[str] = "Unavailable at this time",
    db: Session = Depends(get_db),
    current_user: User = Depends(require_worker)
):
    booking = db.query(Booking).filter(Booking.id == booking_id).first()
    if not booking:
        raise HTTPException(status_code=404, detail="Booking not found")
    if booking.worker and booking.worker.user_id != current_user.id:
        raise HTTPException(status_code=403, detail="You are not assigned to this booking")

    updated = BookingService.transition_status(
        db=db,
        booking=booking,
        new_status=BookingStatus.REJECTED,
        changed_by_user=current_user,
        remarks=f"Rejected by worker: {reason}"
    )
    return _format_booking_response(updated, current_user=current_user)

@router.post("/{booking_id}/cancel", response_model=BookingResponse)
def cancel_booking(
    booking_id: int,
    cancel_in: Optional[BookingCancelRequest] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    booking = db.query(Booking).filter(Booking.id == booking_id).first()
    if not booking:
        raise HTTPException(status_code=404, detail="Booking not found")

    reason = cancel_in.reason if (cancel_in and cancel_in.reason) else "Cancelled by user"

    is_customer = booking.customer_id == current_user.id
    is_assigned_worker = booking.worker and booking.worker.user_id == current_user.id
    is_admin = current_user.role in [UserRole.COOPERATIVE_ADMIN, UserRole.SUPER_ADMIN]

    if not (is_customer or is_assigned_worker or is_admin):
        raise HTTPException(status_code=403, detail="Not authorized to cancel this booking")

    # Disallow cancelling finished or closed bookings
    if booking.status in [BookingStatus.COMPLETED, BookingStatus.PAYMENT_PENDING, BookingStatus.PAID, BookingStatus.RATED, BookingStatus.CLOSED, BookingStatus.CANCELLED]:
        raise HTTPException(status_code=400, detail=f"Booking cannot be cancelled in status '{booking.status.value}'")

    cancelled_by = "Customer" if is_customer else ("Worker" if is_assigned_worker else "Cooperative Admin")
    remarks = f"Cancelled by {cancelled_by}: {reason}"

    updated = BookingService.transition_status(
        db=db,
        booking=booking,
        new_status=BookingStatus.CANCELLED,
        changed_by_user=current_user,
        remarks=remarks
    )
    return _format_booking_response(updated, current_user=current_user)

@router.post("/{booking_id}/propose-price", response_model=BookingResponse)
def propose_price_quote(
    booking_id: int,
    quote_in: BookingQuoteCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_worker)
):
    booking = db.query(Booking).filter(Booking.id == booking_id).first()
    if not booking:
        raise HTTPException(status_code=404, detail="Booking not found")
    if booking.worker and booking.worker.user_id != current_user.id:
        raise HTTPException(status_code=403, detail="You are not assigned to this booking")

    booking.worker_proposed_price = quote_in.worker_proposed_price
    
    quote = BookingQuote(
        booking_id=booking.id,
        original_estimated_price=booking.original_estimated_price or booking.labour_charge,
        worker_proposed_price=quote_in.worker_proposed_price,
        status="PROPOSED",
        notes=quote_in.notes
    )
    db.add(quote)

    updated = BookingService.transition_status(
        db=db,
        booking=booking,
        new_status=BookingStatus.PRICE_PROPOSED,
        changed_by_user=current_user,
        remarks=f"Worker proposed new price: ₹{quote_in.worker_proposed_price:.2f}"
    )
    return _format_booking_response(updated, current_user=current_user)

@router.post("/{booking_id}/respond-price", response_model=BookingResponse)
def respond_price_quote(
    booking_id: int,
    action_in: BookingQuoteAction,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_customer)
):
    booking = db.query(Booking).filter(Booking.id == booking_id).first()
    if not booking:
        raise HTTPException(status_code=404, detail="Booking not found")
    if booking.customer_id != current_user.id:
        raise HTTPException(status_code=403, detail="Unauthorized")

    if action_in.action == "ACCEPT":
        agreed_price = booking.worker_proposed_price or booking.labour_charge
        booking.final_agreed_price = agreed_price
        booking.labour_charge = agreed_price
        booking.total_amount = agreed_price + (booking.material_charge or 0.0)

        # Update quotes in DB
        db.query(BookingQuote).filter(
            BookingQuote.booking_id == booking.id,
            BookingQuote.status == "PROPOSED"
        ).update({"status": "ACCEPTED", "final_agreed_price": agreed_price})

        updated = BookingService.transition_status(
            db=db,
            booking=booking,
            new_status=BookingStatus.ACCEPTED,
            changed_by_user=current_user,
            remarks=f"Customer accepted proposed price ₹{agreed_price:.2f}"
        )
        return _format_booking_response(updated, current_user=current_user)
    else:
        # Rejected
        db.query(BookingQuote).filter(
            BookingQuote.booking_id == booking.id,
            BookingQuote.status == "PROPOSED"
        ).update({"status": "REJECTED"})

        updated = BookingService.transition_status(
            db=db,
            booking=booking,
            new_status=BookingStatus.REJECTED,
            changed_by_user=current_user,
            remarks="Customer rejected proposed price quote"
        )
        return _format_booking_response(updated, current_user=current_user)

@router.patch("/{booking_id}/status", response_model=BookingResponse)
def update_booking_status(
    booking_id: int,
    status_in: BookingStatusUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    booking = db.query(Booking).filter(Booking.id == booking_id).first()
    if not booking:
        raise HTTPException(status_code=404, detail="Booking not found")

    updated = BookingService.transition_status(
        db=db,
        booking=booking,
        new_status=status_in.status,
        changed_by_user=current_user,
        remarks=status_in.remarks,
        labour_charge=status_in.labour_charge,
        material_charge=status_in.material_charge
    )
    return _format_booking_response(updated, current_user=current_user)

# --- Booking Messaging / Contact Endpoints ---
@router.get("/{booking_id}/messages", response_model=List[BookingMessageResponse])
def get_booking_messages(
    booking_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    booking = db.query(Booking).filter(Booking.id == booking_id).first()
    if not booking:
        raise HTTPException(status_code=404, detail="Booking not found")

    # Auth check
    is_customer = (booking.customer_id == current_user.id)
    is_worker = (booking.worker and booking.worker.user_id == current_user.id)
    is_admin = (current_user.role in [UserRole.COOPERATIVE_ADMIN, UserRole.SUPER_ADMIN])
    if not (is_customer or is_worker or is_admin):
        raise HTTPException(status_code=403, detail="Forbidden")

    msgs = db.query(BookingMessage).filter(
        BookingMessage.booking_id == booking_id
    ).order_by(BookingMessage.created_at.asc()).all()

    return [
        BookingMessageResponse(
            id=m.id,
            booking_id=m.booking_id,
            sender_id=m.sender_id,
            sender_name=m.sender.full_name if m.sender else "User",
            sender_role=m.sender_role,
            message=m.message,
            created_at=m.created_at
        ) for m in msgs
    ]

@router.post("/{booking_id}/messages", response_model=BookingMessageResponse)
def send_booking_message(
    booking_id: int,
    msg_in: BookingMessageCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    booking = db.query(Booking).filter(Booking.id == booking_id).first()
    if not booking:
        raise HTTPException(status_code=404, detail="Booking not found")

    is_customer = (booking.customer_id == current_user.id)
    is_worker = (booking.worker and booking.worker.user_id == current_user.id)
    is_admin = (current_user.role in [UserRole.COOPERATIVE_ADMIN, UserRole.SUPER_ADMIN])
    if not (is_customer or is_worker or is_admin):
        raise HTTPException(status_code=403, detail="Forbidden")

    msg = BookingMessage(
        booking_id=booking_id,
        sender_id=current_user.id,
        sender_role="CUSTOMER" if is_customer else ("WORKER" if is_worker else "ADMIN"),
        message=msg_in.message.strip()
    )
    db.add(msg)
    db.commit()
    db.refresh(msg)

    # In-app notification for the other party
    other_user_id = booking.worker.user_id if is_customer and booking.worker else booking.customer_id
    if other_user_id:
        db.add(Notification(
            user_id=other_user_id,
            title=f"New message on Booking #{booking.booking_ref}",
            message=f"{current_user.full_name}: {msg.message[:50]}...",
            type="CHAT",
            link=f"/bookings/{booking.id}"
        ))
        db.commit()

    return BookingMessageResponse(
        id=msg.id,
        booking_id=msg.booking_id,
        sender_id=msg.sender_id,
        sender_name=current_user.full_name,
        sender_role=msg.sender_role,
        message=msg.message,
        created_at=msg.created_at
    )
