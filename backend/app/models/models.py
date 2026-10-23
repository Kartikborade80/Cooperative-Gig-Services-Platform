from datetime import datetime, timezone
import enum
from sqlalchemy import (
    Column, Integer, String, Float, Boolean, DateTime, ForeignKey, 
    Text, Enum as SQLEnum, Index
)
from sqlalchemy.orm import relationship
from app.core.database import Base

def utc_now():
    return datetime.now(timezone.utc)

class UserRole(str, enum.Enum):
    CUSTOMER = "CUSTOMER"
    WORKER = "WORKER"
    COOPERATIVE_ADMIN = "COOPERATIVE_ADMIN"
    SUPER_ADMIN = "SUPER_ADMIN"

class VerificationStatus(str, enum.Enum):
    PENDING = "PENDING"
    UNDER_REVIEW = "UNDER_REVIEW"
    VERIFIED = "VERIFIED"
    REJECTED = "REJECTED"
    SUSPENDED = "SUSPENDED"
    # Backward-compatible alias
    PENDING_VERIFICATION = "PENDING"

class IdentityStatus(str, enum.Enum):
    PENDING = "PENDING"
    VERIFIED_DEMO = "VERIFIED_DEMO"
    VERIFIED_DIGILOCKER = "VERIFIED_DIGILOCKER"
    REJECTED = "REJECTED"

class BookingStatus(str, enum.Enum):
    REQUESTED = "REQUESTED"
    MATCHING = "MATCHING"
    WORKER_ASSIGNED = "WORKER_ASSIGNED"
    PRICE_PROPOSED = "PRICE_PROPOSED"
    ACCEPTED = "ACCEPTED"
    REJECTED = "REJECTED"
    SCHEDULED = "SCHEDULED"
    ON_THE_WAY = "ON_THE_WAY"
    ARRIVED = "ARRIVED"
    SERVICE_STARTED = "SERVICE_STARTED"
    COMPLETED = "COMPLETED"
    PAYMENT_PENDING = "PAYMENT_PENDING"
    PAID = "PAID"
    RATED = "RATED"
    CLOSED = "CLOSED"
    CANCELLED = "CANCELLED"

class PaymentStatus(str, enum.Enum):
    PENDING = "PENDING"
    PROCESSING = "PROCESSING"
    SUCCESS = "SUCCESS"
    FAILED = "FAILED"
    REFUNDED = "REFUNDED"

class ComplaintStatus(str, enum.Enum):
    OPEN = "OPEN"
    UNDER_REVIEW = "UNDER_REVIEW"
    RESOLVED = "RESOLVED"
    CLOSED = "CLOSED"

class RecommendationStatus(str, enum.Enum):
    PENDING = "PENDING"
    APPROVED = "APPROVED"
    REJECTED = "REJECTED"

# --- Models ---

class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    email = Column(String(255), unique=True, index=True, nullable=False)
    phone = Column(String(20), unique=True, index=True, nullable=True)
    hashed_password = Column(String(255), nullable=False)
    full_name = Column(String(100), nullable=False)
    role = Column(SQLEnum(UserRole), default=UserRole.CUSTOMER, nullable=False)
    is_active = Column(Boolean, default=True)
    address = Column(String(255), nullable=True)
    city = Column(String(100), default="Kopargaon")
    district = Column(String(100), default="Ahmednagar")
    pincode = Column(String(20), default="423601")
    preferred_language = Column(String(10), default="en")
    lat = Column(Float, nullable=True)
    lon = Column(Float, nullable=True)
    alt_phone = Column(String(20), nullable=True)
    email_verified = Column(Boolean, default=False)
    has_instant_subscription = Column(Boolean, default=False)
    instant_subscription_plan = Column(String(50), nullable=True)
    instant_subscription_expires_at = Column(DateTime(timezone=True), nullable=True)
    created_at = Column(DateTime(timezone=True), default=utc_now)
    updated_at = Column(DateTime(timezone=True), default=utc_now, onupdate=utc_now)

    # Relationships
    worker_profile = relationship("Worker", back_populates="user", uselist=False)
    customer_bookings = relationship("Booking", back_populates="customer", foreign_keys="Booking.customer_id")
    notifications = relationship("Notification", back_populates="user")
    ratings_given = relationship("Rating", back_populates="customer", foreign_keys="Rating.customer_id")
    complaints_filed = relationship("Complaint", back_populates="customer", foreign_keys="Complaint.customer_id")
    saved_addresses = relationship("CustomerAddress", back_populates="user", cascade="all, delete-orphan")
    contacts = relationship("CustomerContact", back_populates="user", cascade="all, delete-orphan")


class Cooperative(Base):
    __tablename__ = "cooperatives"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(200), nullable=False)
    registration_no = Column(String(100), unique=True, nullable=False)
    state = Column(String(100), default="Maharashtra")
    district = Column(String(100), default="Ahmednagar")
    contact_person = Column(String(100), nullable=True)
    contact_phone = Column(String(20), nullable=True)
    address = Column(String(255), nullable=True)
    commission_rate = Column(Float, default=5.0)  # 5% default
    service_radius_km = Column(Float, default=20.0) # 20 KM default radius
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime(timezone=True), default=utc_now)

    workers = relationship("Worker", back_populates="cooperative")
    recommendations = relationship("WorkforceRecommendation", back_populates="cooperative")


class Worker(Base):
    __tablename__ = "workers"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), unique=True, nullable=False)
    cooperative_id = Column(Integer, ForeignKey("cooperatives.id"), nullable=True)
    
    # Verification pipeline
    verification_status = Column(String(50), default="PENDING") # PENDING, UNDER_REVIEW, VERIFIED, REJECTED, SUSPENDED
    identity_status = Column(String(50), default="PENDING") # PENDING, VERIFIED_DEMO, VERIFIED_DIGILOCKER, REJECTED
    identity_ref = Column(String(100), nullable=True)
    
    experience_years = Column(Float, default=1.0)
    starting_price = Column(Float, default=350.0)
    profile_photo = Column(String(500), nullable=True)
    bio = Column(Text, nullable=True)
    service_area = Column(String(100), default="Kopargaon Central")
    lat = Column(Float, default=19.8917)  # Default Kopargaon center
    lon = Column(Float, default=74.4795)
    emergency_available = Column(Boolean, default=True)
    is_available = Column(Boolean, default=True)
    languages = Column(String(100), default="Marathi, Hindi, English")
    
    # Matching metrics
    reliability_score = Column(Float, default=95.0) # 0-100
    average_rating = Column(Float, default=5.0)
    rating_count = Column(Integer, default=0)
    total_jobs_completed = Column(Integer, default=0)
    recent_jobs_count = Column(Integer, default=0) # Jobs in last 7 days for fairness calculation
    total_earnings = Column(Float, default=0.0)
    created_at = Column(DateTime(timezone=True), default=utc_now)

    # Relationships
    user = relationship("User", back_populates="worker_profile")
    cooperative = relationship("Cooperative", back_populates="workers")
    categories = relationship("WorkerCategory", back_populates="worker", cascade="all, delete-orphan")
    skills = relationship("WorkerSkill", back_populates="worker")
    certifications = relationship("WorkerCertification", back_populates="worker")
    bookings = relationship("Booking", back_populates="worker", foreign_keys="Booking.worker_id")
    welfare_account = relationship("WelfareAccount", back_populates="worker", uselist=False)
    insurance_records = relationship("InsuranceRecord", back_populates="worker")
    training_records = relationship("TrainingRecord", back_populates="worker")
    location_history = relationship("WorkerLocation", back_populates="worker")
    availability_slots = relationship("WorkerAvailability", back_populates="worker", cascade="all, delete-orphan")


class WorkerAvailability(Base):
    __tablename__ = "worker_availability"

    id = Column(Integer, primary_key=True, index=True)
    worker_id = Column(Integer, ForeignKey("workers.id"), nullable=False)
    day_of_week = Column(Integer, default=0) # 0=Monday .. 6=Sunday
    slot_time = Column(String(50), nullable=False) # e.g. "09:00 AM - 10:00 AM"
    is_active = Column(Boolean, default=True)

    worker = relationship("Worker", back_populates="availability_slots")


class Skill(Base):
    __tablename__ = "skills"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(100), unique=True, nullable=False)
    category = Column(String(100), nullable=False)
    description = Column(String(255), nullable=True)

    worker_skills = relationship("WorkerSkill", back_populates="skill")


class WorkerSkill(Base):
    __tablename__ = "worker_skills"

    id = Column(Integer, primary_key=True, index=True)
    worker_id = Column(Integer, ForeignKey("workers.id"), nullable=False)
    skill_id = Column(Integer, ForeignKey("skills.id"), nullable=False)
    proficiency_level = Column(String(50), default="Expert")  # Beginner, Intermediate, Expert
    verified_by_coop = Column(Boolean, default=True)

    worker = relationship("Worker", back_populates="skills")
    skill = relationship("Skill", back_populates="worker_skills")


class Certification(Base):
    __tablename__ = "certifications"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(150), nullable=False)
    issuing_authority = Column(String(150), nullable=False)
    description = Column(String(255), nullable=True)

    worker_certifications = relationship("WorkerCertification", back_populates="certification")


class WorkerCertification(Base):
    __tablename__ = "worker_certifications"

    id = Column(Integer, primary_key=True, index=True)
    worker_id = Column(Integer, ForeignKey("workers.id"), nullable=False)
    certification_id = Column(Integer, ForeignKey("certifications.id"), nullable=False)
    certificate_no = Column(String(100), nullable=True)
    document_url = Column(String(255), nullable=True)
    is_verified = Column(Boolean, default=True)
    issued_date = Column(DateTime, nullable=True)

    worker = relationship("Worker", back_populates="certifications")
    certification = relationship("Certification", back_populates="worker_certifications")


class ServiceCategory(Base):
    __tablename__ = "service_categories"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(100), unique=True, nullable=False)
    description = Column(String(255), nullable=True)
    icon = Column(String(50), default="wrench")

    services = relationship("Service", back_populates="category")


class Service(Base):
    __tablename__ = "services"

    id = Column(Integer, primary_key=True, index=True)
    category_id = Column(Integer, ForeignKey("service_categories.id"), nullable=False)
    name = Column(String(150), nullable=False)
    description = Column(Text, nullable=True)
    base_price = Column(Float, default=350.0)
    unit = Column(String(50), default="per service")
    estimated_duration_mins = Column(Integer, default=60)
    is_emergency_enabled = Column(Boolean, default=True)
    is_active = Column(Boolean, default=True)

    category = relationship("ServiceCategory", back_populates="services")
    bookings = relationship("Booking", back_populates="service")


class Booking(Base):
    __tablename__ = "bookings"

    id = Column(Integer, primary_key=True, index=True)
    booking_ref = Column(String(50), unique=True, index=True, nullable=False)
    customer_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    worker_id = Column(Integer, ForeignKey("workers.id"), nullable=True)
    service_id = Column(Integer, ForeignKey("services.id"), nullable=False)
    
    status = Column(SQLEnum(BookingStatus), default=BookingStatus.REQUESTED, nullable=False)
    is_emergency = Column(Boolean, default=False)
    
    # Address details
    address = Column(String(255), nullable=False)
    city = Column(String(100), default="Kopargaon")
    district = Column(String(100), default="Ahmednagar")
    pincode = Column(String(20), default="423601")
    lat = Column(Float, nullable=True)
    lon = Column(Float, nullable=True)
    
    # Scheduled Date & Time Slot
    booking_date = Column(String(50), nullable=True) # YYYY-MM-DD
    time_slot = Column(String(50), nullable=True)    # "09:00 AM - 10:00 AM"
    scheduled_time = Column(DateTime(timezone=True), nullable=True)
    
    problem_description = Column(Text, nullable=True)
    urgency = Column(String(50), default="Normal")
    match_score = Column(Float, nullable=True)
    match_explanation = Column(Text, nullable=True)
    
    # Financials & Quoting
    labour_charge = Column(Float, default=0.0)
    material_charge = Column(Float, default=0.0)
    original_estimated_price = Column(Float, default=0.0)
    worker_proposed_price = Column(Float, nullable=True)
    final_agreed_price = Column(Float, nullable=True)
    total_amount = Column(Float, default=0.0)
    coop_fee = Column(Float, default=0.0)
    worker_earnings = Column(Float, default=0.0)
    
    cancel_reason = Column(String(255), nullable=True)
    created_at = Column(DateTime(timezone=True), default=utc_now)
    updated_at = Column(DateTime(timezone=True), default=utc_now, onupdate=utc_now)

    # Relationships
    customer = relationship("User", back_populates="customer_bookings", foreign_keys=[customer_id])
    worker = relationship("Worker", back_populates="bookings", foreign_keys=[worker_id])
    service = relationship("Service", back_populates="bookings")
    status_history = relationship("BookingStatusHistory", back_populates="booking", cascade="all, delete-orphan")
    payment = relationship("Payment", back_populates="booking", uselist=False)
    invoice = relationship("Invoice", back_populates="booking", uselist=False)
    rating = relationship("Rating", back_populates="booking", uselist=False)
    complaints = relationship("Complaint", back_populates="booking")
    quotes = relationship("BookingQuote", back_populates="booking", cascade="all, delete-orphan")
    messages = relationship("BookingMessage", back_populates="booking", cascade="all, delete-orphan")
    worker_review = relationship("WorkerReview", back_populates="booking", uselist=False)


class BookingStatusHistory(Base):
    __tablename__ = "booking_status_history"

    id = Column(Integer, primary_key=True, index=True)
    booking_id = Column(Integer, ForeignKey("bookings.id"), nullable=False)
    from_status = Column(String(50), nullable=True)
    to_status = Column(String(50), nullable=False)
    changed_by_user_id = Column(Integer, ForeignKey("users.id"), nullable=True)
    remarks = Column(String(255), nullable=True)
    created_at = Column(DateTime(timezone=True), default=utc_now)

    booking = relationship("Booking", back_populates="status_history")


class WorkerLocation(Base):
    __tablename__ = "worker_locations"

    id = Column(Integer, primary_key=True, index=True)
    worker_id = Column(Integer, ForeignKey("workers.id"), nullable=False)
    current_lat = Column(Float, nullable=False)
    current_lon = Column(Float, nullable=False)
    updated_at = Column(DateTime(timezone=True), default=utc_now)

    worker = relationship("Worker", back_populates="location_history")


class Payment(Base):
    __tablename__ = "payments"

    id = Column(Integer, primary_key=True, index=True)
    booking_id = Column(Integer, ForeignKey("bookings.id"), unique=True, nullable=False)
    customer_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    worker_id = Column(Integer, ForeignKey("workers.id"), nullable=False)
    
    amount = Column(Float, nullable=False)
    coop_fee = Column(Float, default=0.0)
    worker_payout = Column(Float, default=0.0)
    method = Column(String(50), default="UPI_SIMULATED")
    status = Column(SQLEnum(PaymentStatus), default=PaymentStatus.PENDING)
    transaction_ref = Column(String(100), unique=True, nullable=False)
    paid_at = Column(DateTime(timezone=True), nullable=True)
    created_at = Column(DateTime(timezone=True), default=utc_now)

    booking = relationship("Booking", back_populates="payment")


class Invoice(Base):
    __tablename__ = "invoices"

    id = Column(Integer, primary_key=True, index=True)
    invoice_number = Column(String(50), unique=True, nullable=False)
    booking_id = Column(Integer, ForeignKey("bookings.id"), unique=True, nullable=False)
    
    customer_name = Column(String(150), nullable=False)
    worker_name = Column(String(150), nullable=False)
    coop_name = Column(String(200), nullable=False)
    service_name = Column(String(150), nullable=False)
    
    labour_charge = Column(Float, nullable=False)
    material_charge = Column(Float, default=0.0)
    coop_fee = Column(Float, nullable=False)
    worker_earnings = Column(Float, nullable=False)
    total_amount = Column(Float, nullable=False)
    
    payment_method = Column(String(50), default="UPI")
    transaction_ref = Column(String(100), nullable=False)
    issue_date = Column(DateTime(timezone=True), default=utc_now)

    booking = relationship("Booking", back_populates="invoice")


class Rating(Base):
    __tablename__ = "ratings"

    id = Column(Integer, primary_key=True, index=True)
    booking_id = Column(Integer, ForeignKey("bookings.id"), unique=True, nullable=False)
    customer_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    worker_id = Column(Integer, ForeignKey("workers.id"), nullable=False)
    score = Column(Integer, nullable=False) # 1-5
    feedback = Column(Text, nullable=True)
    created_at = Column(DateTime(timezone=True), default=utc_now)

    booking = relationship("Booking", back_populates="rating")
    customer = relationship("User", back_populates="ratings_given", foreign_keys=[customer_id])


class Complaint(Base):
    __tablename__ = "complaints"

    id = Column(Integer, primary_key=True, index=True)
    booking_id = Column(Integer, ForeignKey("bookings.id"), nullable=True)
    customer_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    category = Column(String(100), nullable=False)
    description = Column(Text, nullable=False)
    priority = Column(String(50), default="Medium")
    status = Column(SQLEnum(ComplaintStatus), default=ComplaintStatus.OPEN)
    resolution_notes = Column(Text, nullable=True)
    created_at = Column(DateTime(timezone=True), default=utc_now)
    resolved_at = Column(DateTime(timezone=True), nullable=True)

    booking = relationship("Booking", back_populates="complaints")
    customer = relationship("User", back_populates="complaints_filed", foreign_keys=[customer_id])


class Notification(Base):
    __tablename__ = "notifications"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    title = Column(String(150), nullable=False)
    message = Column(Text, nullable=False)
    type = Column(String(50), default="INFO")
    is_read = Column(Boolean, default=False)
    link = Column(String(255), nullable=True)
    created_at = Column(DateTime(timezone=True), default=utc_now)

    user = relationship("User", back_populates="notifications")


class WelfareAccount(Base):
    __tablename__ = "welfare_accounts"

    id = Column(Integer, primary_key=True, index=True)
    worker_id = Column(Integer, ForeignKey("workers.id"), unique=True, nullable=False)
    balance = Column(Float, default=2500.0)
    total_contributed = Column(Float, default=450.0)
    emergency_fund_eligible = Column(Boolean, default=True)
    updated_at = Column(DateTime(timezone=True), default=utc_now)

    worker = relationship("Worker", back_populates="welfare_account")


class InsuranceRecord(Base):
    __tablename__ = "insurance_records"

    id = Column(Integer, primary_key=True, index=True)
    worker_id = Column(Integer, ForeignKey("workers.id"), nullable=False)
    policy_number = Column(String(100), unique=True, nullable=False)
    provider = Column(String(150), default="National Insurance / Coop Group Cover")
    coverage_amount = Column(Float, default=500000.0) # INR 5 Lakhs
    start_date = Column(DateTime(timezone=True), default=utc_now)
    expiry_date = Column(DateTime(timezone=True), nullable=True)
    status = Column(String(50), default="ACTIVE")

    worker = relationship("Worker", back_populates="insurance_records")


class TrainingRecord(Base):
    __tablename__ = "training_records"

    id = Column(Integer, primary_key=True, index=True)
    worker_id = Column(Integer, ForeignKey("workers.id"), nullable=False)
    title = Column(String(150), nullable=False)
    trainer_or_coop = Column(String(150), default="Cooperative Skill Council")
    completion_date = Column(DateTime(timezone=True), default=utc_now)
    status = Column(String(50), default="COMPLETED")
    certification_awarded = Column(String(150), nullable=True)

    worker = relationship("Worker", back_populates="training_records")


class DemandData(Base):
    __tablename__ = "demand_data"

    id = Column(Integer, primary_key=True, index=True)
    service_category = Column(String(100), nullable=False)
    district = Column(String(100), default="Ahmednagar")
    date = Column(DateTime(timezone=True), nullable=False)
    number_of_requests = Column(Integer, default=0)
    emergency_requests = Column(Integer, default=0)
    available_workers = Column(Integer, default=0)


class DemandPrediction(Base):
    __tablename__ = "demand_predictions"

    id = Column(Integer, primary_key=True, index=True)
    service_category = Column(String(100), nullable=False)
    district = Column(String(100), default="Ahmednagar")
    target_date = Column(DateTime(timezone=True), nullable=False)
    predicted_demand = Column(Integer, nullable=False)
    available_workers = Column(Integer, nullable=False)
    shortage_detected = Column(Boolean, default=False)
    confidence_score = Column(Float, default=0.88)
    created_at = Column(DateTime(timezone=True), default=utc_now)

    recommendation = relationship("WorkforceRecommendation", back_populates="prediction", uselist=False)


class WorkforceRecommendation(Base):
    __tablename__ = "workforce_recommendations"

    id = Column(Integer, primary_key=True, index=True)
    prediction_id = Column(Integer, ForeignKey("demand_predictions.id"), nullable=True)
    coop_id = Column(Integer, ForeignKey("cooperatives.id"), nullable=False)
    title = Column(String(200), nullable=False)
    recommendation_text = Column(Text, nullable=False)
    status = Column(SQLEnum(RecommendationStatus), default=RecommendationStatus.PENDING)
    created_at = Column(DateTime(timezone=True), default=utc_now)

    cooperative = relationship("Cooperative", back_populates="recommendations")
    prediction = relationship("DemandPrediction", back_populates="recommendation")


class AuditLog(Base):
    __tablename__ = "audit_logs"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=True)
    action = Column(String(100), nullable=False)
    entity_name = Column(String(100), nullable=False)
    entity_id = Column(String(50), nullable=True)
    details = Column(Text, nullable=True)
    ip_address = Column(String(50), nullable=True)
    created_at = Column(DateTime(timezone=True), default=utc_now)


class WorkerCategory(Base):
    __tablename__ = "worker_categories"

    id = Column(Integer, primary_key=True, index=True)
    worker_id = Column(Integer, ForeignKey("workers.id"), nullable=False, index=True)
    category_id = Column(Integer, ForeignKey("service_categories.id"), nullable=True)
    category_name = Column(String(100), nullable=False, index=True) # Plumbing, Electrical, Cleaning, etc.
    is_verified = Column(Boolean, default=True)
    created_at = Column(DateTime(timezone=True), default=utc_now)

    worker = relationship("Worker", back_populates="categories")
    category = relationship("ServiceCategory")


class CustomerAddress(Base):
    __tablename__ = "customer_addresses"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False, index=True)
    title = Column(String(50), default="Home") # Home, Office, Default, etc.
    address_line = Column(String(255), nullable=False)
    area = Column(String(100), nullable=True)
    city = Column(String(100), default="Kopargaon")
    district = Column(String(100), default="Ahmednagar")
    pincode = Column(String(20), default="423601")
    lat = Column(Float, nullable=True)
    lon = Column(Float, nullable=True)
    is_default = Column(Boolean, default=False)
    created_at = Column(DateTime(timezone=True), default=utc_now)

    user = relationship("User", back_populates="saved_addresses")


class CustomerContact(Base):
    __tablename__ = "customer_contacts"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False, index=True)
    name = Column(String(100), nullable=False)
    phone = Column(String(20), nullable=False)
    relation = Column(String(50), nullable=True) # Family, Alternate, Emergency
    is_primary = Column(Boolean, default=False)
    created_at = Column(DateTime(timezone=True), default=utc_now)

    user = relationship("User", back_populates="contacts")


class BookingQuote(Base):
    __tablename__ = "booking_quotes"

    id = Column(Integer, primary_key=True, index=True)
    booking_id = Column(Integer, ForeignKey("bookings.id"), nullable=False, index=True)
    original_estimated_price = Column(Float, nullable=False)
    worker_proposed_price = Column(Float, nullable=True)
    final_agreed_price = Column(Float, nullable=True)
    status = Column(String(50), default="PENDING") # PENDING, PROPOSED, ACCEPTED, REJECTED
    notes = Column(Text, nullable=True)
    created_at = Column(DateTime(timezone=True), default=utc_now)
    updated_at = Column(DateTime(timezone=True), default=utc_now, onupdate=utc_now)

    booking = relationship("Booking", back_populates="quotes")


class BookingMessage(Base):
    __tablename__ = "booking_messages"

    id = Column(Integer, primary_key=True, index=True)
    booking_id = Column(Integer, ForeignKey("bookings.id"), nullable=False, index=True)
    sender_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    sender_role = Column(String(50), nullable=False) # CUSTOMER, WORKER
    message = Column(Text, nullable=False)
    created_at = Column(DateTime(timezone=True), default=utc_now)

    booking = relationship("Booking", back_populates="messages")
    sender = relationship("User")


class OtpVerification(Base):
    __tablename__ = "otp_verifications"

    id = Column(Integer, primary_key=True, index=True)
    email = Column(String(255), index=True, nullable=False)
    otp_code = Column(String(10), nullable=False)
    purpose = Column(String(50), default="VERIFICATION") # LOGIN, REGISTRATION, FORGOT_PASSWORD
    expires_at = Column(DateTime(timezone=True), nullable=False)
    is_used = Column(Boolean, default=False)
    attempts = Column(Integer, default=0)
    created_at = Column(DateTime(timezone=True), default=utc_now)


class EmailNotification(Base):
    __tablename__ = "email_notifications"

    id = Column(Integer, primary_key=True, index=True)
    to_email = Column(String(255), nullable=False)
    subject = Column(String(255), nullable=False)
    body = Column(Text, nullable=False)
    booking_id = Column(Integer, nullable=True)
    status = Column(String(50), default="MOCK_SENT") # SENT, MOCK_SENT, FAILED
    created_at = Column(DateTime(timezone=True), default=utc_now)


class WorkerReview(Base):
    __tablename__ = "worker_reviews"

    id = Column(Integer, primary_key=True, index=True)
    booking_id = Column(Integer, ForeignKey("bookings.id"), unique=True, nullable=False)
    worker_id = Column(Integer, ForeignKey("workers.id"), nullable=False)
    customer_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    score = Column(Integer, default=5)
    feedback = Column(Text, nullable=True)
    created_at = Column(DateTime(timezone=True), default=utc_now)

    booking = relationship("Booking", back_populates="worker_review")

