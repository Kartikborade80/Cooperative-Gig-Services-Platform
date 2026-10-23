from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from sqlalchemy import func
from app.core.database import get_db
from app.models.models import Rating, Booking, BookingStatus, Worker, User
from app.schemas.schemas import RatingCreate, RatingResponse
from app.api.deps import require_customer

router = APIRouter(prefix="/ratings", tags=["Ratings"])

@router.post("/", response_model=RatingResponse)
def submit_rating(
    rating_in: RatingCreate,
    db: Session = Depends(get_db),
    customer: User = Depends(require_customer)
):
    booking = db.query(Booking).filter(Booking.id == rating_in.booking_id).first()
    if not booking:
        raise HTTPException(status_code=404, detail="Booking not found")

    if booking.customer_id != customer.id:
        raise HTTPException(status_code=403, detail="Unauthorized")

    if booking.status not in [BookingStatus.PAID, BookingStatus.RATED, BookingStatus.CLOSED]:
        raise HTTPException(
            status_code=400,
            detail="Cannot rate until service is completed and payment is successful"
        )

    existing_rating = db.query(Rating).filter(Rating.booking_id == booking.id).first()
    if existing_rating:
        raise HTTPException(status_code=400, detail="This booking has already been rated")

    if not booking.worker_id:
        raise HTTPException(status_code=400, detail="No worker assigned to this booking")

    rating = Rating(
        booking_id=booking.id,
        customer_id=customer.id,
        worker_id=booking.worker_id,
        score=rating_in.score,
        feedback=rating_in.feedback
    )
    db.add(rating)

    # Update booking status to RATED
    booking.status = BookingStatus.RATED

    # Re-calculate worker average rating
    worker = db.query(Worker).filter(Worker.id == booking.worker_id).first()
    if worker:
        all_ratings = db.query(Rating.score).filter(Rating.worker_id == worker.id).all()
        scores = [r[0] for r in all_ratings] + [rating_in.score]
        worker.average_rating = round(sum(scores) / len(scores), 1)
        worker.rating_count = len(scores)

    db.commit()
    db.refresh(rating)
    return rating
