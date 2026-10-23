from datetime import datetime
from typing import Optional, List, Dict, Any
from pydantic import BaseModel, EmailStr, Field, ConfigDict
from app.models.models import (
    UserRole, BookingStatus, 
    PaymentStatus, ComplaintStatus, RecommendationStatus
)

# --- Authentication & User Schemas ---
class UserBase(BaseModel):
    email: EmailStr
    full_name: Optional[str] = "Member"
    phone: Optional[str] = None
    alt_phone: Optional[str] = None
    email_verified: Optional[bool] = False
    has_instant_subscription: Optional[bool] = False
    instant_subscription_plan: Optional[str] = None
    instant_subscription_expires_at: Optional[datetime] = None
    address: Optional[str] = None
    city: Optional[str] = "Kopargaon"
    district: Optional[str] = "Ahmednagar"
    pincode: Optional[str] = "423601"
    preferred_language: Optional[str] = "en"
    lat: Optional[float] = None
    lon: Optional[float] = None

class UserRegister(BaseModel):
    email: EmailStr
    password: str = Field(..., min_length=6)
    full_name: Optional[str] = "Member"
    otp_code: Optional[str] = None
    phone: Optional[str] = None
    alt_phone: Optional[str] = None
    role: UserRole = UserRole.CUSTOMER
    address: Optional[str] = None
    city: Optional[str] = "Kopargaon"
    district: Optional[str] = "Ahmednagar"
    pincode: Optional[str] = "423601"
    preferred_language: Optional[str] = "en"
    lat: Optional[float] = None
    lon: Optional[float] = None
    cooperative_id: Optional[int] = None
    skills: Optional[List[str]] = []
    service_categories: Optional[List[str]] = []
    experience_years: Optional[float] = 1.0
    starting_price: Optional[float] = 350.0
    bio: Optional[str] = None
    service_area: Optional[str] = "Kopargaon Central"

class WorkerRegisterRequest(BaseModel):
    email: EmailStr
    password: str = Field(..., min_length=6)
    otp_code: str = Field(..., description="Email OTP verification code")
    full_name: str = Field(..., min_length=2)
    phone: str = Field(..., min_length=10)
    service_categories: List[str] = Field(..., min_length=1, description="Selected service categories")
    skills: Optional[List[str]] = []
    experience_years: Optional[float] = 1.0
    bio: Optional[str] = None
    address: str = Field(..., min_length=3)
    city: Optional[str] = "Kopargaon"
    district: Optional[str] = "Ahmednagar"
    pincode: Optional[str] = "423601"
    service_area: Optional[str] = "Kopargaon Central"
    lat: Optional[float] = 19.8917
    lon: Optional[float] = 74.4795
    document_type: str = Field("AADHAAR", description="AADHAAR, PAN, VOTER_ID, DRIVING_LICENSE")
    document_number: str = Field(..., min_length=4, description="Identity document number / Aadhaar")

class PasswordChangeRequest(BaseModel):
    current_password: str
    new_password: str = Field(..., min_length=6)


class UserLogin(BaseModel):
    username: Optional[str] = Field(None, description="Email address or Mobile Number")
    email: Optional[str] = Field(None, description="Email address (legacy/alternative)")
    password: str

class Token(BaseModel):
    access_token: str
    token_type: str = "bearer"
    role: UserRole
    user_id: int
    full_name: str

class UserResponse(UserBase):
    id: int
    role: UserRole
    is_active: bool
    created_at: datetime
    model_config = ConfigDict(from_attributes=True)

# --- Cooperative Schemas ---
class CooperativeResponse(BaseModel):
    id: int
    name: str
    registration_no: str
    state: str
    district: str
    contact_person: Optional[str] = None
    contact_phone: Optional[str] = None
    address: Optional[str] = None
    commission_rate: float
    service_radius_km: float = 20.0
    is_active: bool
    model_config = ConfigDict(from_attributes=True)

# --- Skill & Service Schemas ---
class SkillResponse(BaseModel):
    id: int
    name: str
    category: str
    description: Optional[str] = None
    model_config = ConfigDict(from_attributes=True)

class ServiceResponse(BaseModel):
    id: int
    category_id: int
    name: str
    description: Optional[str] = None
    base_price: float
    unit: str
    estimated_duration_mins: int
    is_emergency_enabled: bool
    is_active: bool = True
    model_config = ConfigDict(from_attributes=True)

class ServiceCategoryResponse(BaseModel):
    id: int
    name: str
    description: Optional[str] = None
    icon: str
    services: List[ServiceResponse] = []
    model_config = ConfigDict(from_attributes=True)

# --- Worker Schemas ---
class WorkerSkillDetail(BaseModel):
    skill_name: str
    proficiency_level: str
    verified_by_coop: bool

class WorkerCertificationDetail(BaseModel):
    name: str
    issuing_authority: str
    certificate_no: Optional[str] = None
    is_verified: bool

class WorkerResponse(BaseModel):
    id: int
    user_id: int
    full_name: str
    email: str
    phone: Optional[str] = None
    cooperative_name: Optional[str] = None
    verification_status: str
    identity_status: str = "PENDING"
    identity_ref: Optional[str] = None
    experience_years: float
    starting_price: float = 350.0
    bio: Optional[str] = None
    service_area: str
    lat: float
    lon: float
    is_available: bool
    emergency_available: bool
    languages: str
    reliability_score: float
    average_rating: float
    rating_count: int
    total_jobs_completed: int
    service_categories: List[str] = []
    distance_km: Optional[float] = None
    skills: List[WorkerSkillDetail] = []
    certifications: List[WorkerCertificationDetail] = []
    model_config = ConfigDict(from_attributes=True)

class WorkerVerificationUpdate(BaseModel):
    verification_status: str
    remarks: Optional[str] = None

class WorkerIdentityVerifyRequest(BaseModel):
    document_type: str = Field("AADHAAR", description="AADHAAR, PAN, VOTER_ID, DRIVING_LICENSE")
    document_number: Optional[str] = None
    aadhaar_last_four: Optional[str] = None
    consent_granted: bool = True
    use_digilocker_demo: bool = True

class TimeSlotAvailabilityResponse(BaseModel):
    worker_id: int
    date: str
    available_slots: List[str] = []
    booked_slots: List[str] = []
    slots: List[str] = []

class WorkerAvailabilityUpdate(BaseModel):
    is_available: bool
    emergency_available: Optional[bool] = None

class WorkerLocationUpdate(BaseModel):
    lat: float
    lon: float

# --- AI Service Assistant Schemas ---
class AIClassifyRequest(BaseModel):
    prompt: str

class AIClassifyResponse(BaseModel):
    category: str
    problem: str
    urgency: str
    required_skill: str
    confidence: float
    suggested_service_id: Optional[int] = None
    explanation: str

# --- Matching Engine Schemas ---
class MatchScoreFactors(BaseModel):
    skill_match: float
    availability: float
    distance: float
    reliability: float
    customer_rating: float
    fairness_factor: float
    final_score: float
    distance_km: float
    eta_minutes: int

class MatchedWorkerResponse(BaseModel):
    worker: WorkerResponse
    scores: MatchScoreFactors
    matching_summary: str
    consumer_badge: Optional[str] = "Best Match"
    distance_km: Optional[float] = None
    eta_minutes: Optional[int] = None

# --- Booking Schemas ---
class BookingCreate(BaseModel):
    service_id: int
    worker_id: Optional[int] = None # Optional if auto-matching
    address: str
    city: Optional[str] = "Kopargaon"
    district: Optional[str] = "Ahmednagar"
    pincode: Optional[str] = "423601"
    lat: Optional[float] = 19.8917
    lon: Optional[float] = 74.4795
    booking_date: Optional[str] = None # YYYY-MM-DD
    scheduled_date: Optional[str] = None # alias for booking_date
    time_slot: Optional[str] = None    # "09:00 AM - 10:00 AM"
    scheduled_time: Optional[datetime] = None
    problem_description: Optional[str] = None
    urgency: Optional[str] = "Normal"
    is_emergency: bool = False

class BookingStatusUpdate(BaseModel):
    status: BookingStatus
    remarks: Optional[str] = None
    labour_charge: Optional[float] = None
    material_charge: Optional[float] = None

class BookingCancelRequest(BaseModel):
    reason: Optional[str] = "Cancelled by user"

class BookingResponse(BaseModel):
    id: int
    booking_ref: str
    customer_id: int
    customer_name: Optional[str] = None
    worker_id: Optional[int] = None
    worker_name: Optional[str] = None
    service_id: int
    service_name: Optional[str] = None
    category_id: Optional[int] = None
    category_name: Optional[str] = None
    status: BookingStatus
    is_emergency: bool
    address: str
    city: str
    district: Optional[str] = "Ahmednagar"
    pincode: Optional[str] = "423601"
    lat: Optional[float] = None
    lon: Optional[float] = None
    booking_date: Optional[str] = None
    scheduled_date: Optional[str] = None
    time_slot: Optional[str] = None
    scheduled_time: Optional[datetime] = None
    problem_description: Optional[str] = None
    urgency: str
    match_score: Optional[float] = None
    match_explanation: Optional[str] = None
    labour_charge: float
    material_charge: float
    original_estimated_price: Optional[float] = None
    worker_proposed_price: Optional[float] = None
    final_agreed_price: Optional[float] = None
    total_amount: float
    coop_fee: float
    worker_earnings: float
    customer_phone: Optional[str] = None
    worker_phone: Optional[str] = None
    distance_km: Optional[float] = None
    created_at: datetime
    updated_at: datetime
    model_config = ConfigDict(from_attributes=True)

class TimeSlotAvailabilityResponse(BaseModel):
    worker_id: int
    date: str
    available_slots: List[str]
    booked_slots: List[str]

# --- Payment & Invoice Schemas ---
class PaymentProcessRequest(BaseModel):
    booking_id: int
    method: str = "UPI"
    upi_id: Optional[str] = "customer@upi"

class PaymentResponse(BaseModel):
    id: int
    booking_id: int
    amount: float
    coop_fee: float
    worker_payout: float
    method: str
    status: PaymentStatus
    transaction_ref: str
    paid_at: Optional[datetime] = None
    model_config = ConfigDict(from_attributes=True)

class InvoiceResponse(BaseModel):
    id: int
    invoice_number: str
    booking_id: int
    booking_ref: Optional[str] = None
    customer_name: str
    worker_name: str
    coop_name: str
    service_name: str
    labour_charge: float
    material_charge: float
    coop_fee: float
    cooperative_contribution: float = 0.0  # alias for coop_fee
    worker_earnings: float
    total_amount: float
    payment_method: str
    transaction_ref: str
    issue_date: datetime
    model_config = ConfigDict(from_attributes=True)

# --- Rating Schemas ---
class RatingCreate(BaseModel):
    booking_id: int
    score: int = Field(..., ge=1, le=5)
    feedback: Optional[str] = None

class RatingResponse(BaseModel):
    id: int
    booking_id: int
    customer_id: int
    worker_id: int
    score: int
    feedback: Optional[str] = None
    created_at: datetime
    model_config = ConfigDict(from_attributes=True)

# --- Welfare & Insurance Schemas ---
class WelfareResponse(BaseModel):
    worker_id: int
    worker_name: str
    balance: float
    total_contributed: float
    emergency_fund_eligible: bool
    insurance_policy: Optional[str] = None
    insurance_coverage: Optional[float] = None
    insurance_status: Optional[str] = None
    trainings_completed: int = 0
    recent_activity: List[Dict[str, Any]] = []

# --- Demand Forecasting & Workforce Recommendation Schemas ---
class DemandForecastResponse(BaseModel):
    service_category: str
    district: str
    target_date: str
    predicted_demand: int
    available_workers: int
    shortage_detected: bool
    confidence_score: float
    recommendation: Optional[str] = None
    recommendation_id: Optional[int] = None
    recommendation_status: Optional[str] = None

class WorkforceRecommendationAction(BaseModel):
    action: str = Field(..., pattern="^(APPROVE|REJECT)$")

# --- Complaint Schemas ---
class ComplaintCreate(BaseModel):
    booking_id: Optional[int] = None
    category: str
    description: str
    priority: str = "Medium"

class ComplaintResponse(BaseModel):
    id: int
    booking_id: Optional[int] = None
    customer_id: int
    customer_name: Optional[str] = None
    category: str
    description: str
    priority: str
    status: ComplaintStatus
    resolution_notes: Optional[str] = None
    created_at: datetime
    model_config = ConfigDict(from_attributes=True)

# --- Notification Schemas ---
class NotificationResponse(BaseModel):
    id: int
    title: str
    message: str
    type: str
    is_read: bool
    link: Optional[str] = None
    created_at: datetime
    model_config = ConfigDict(from_attributes=True)

# --- OTP & Password Schemas ---
class OtpSendRequest(BaseModel):
    email: EmailStr
    purpose: str = "LOGIN" # LOGIN, REGISTRATION, FORGOT_PASSWORD

class OtpVerifyRequest(BaseModel):
    email: EmailStr
    otp_code: str
    purpose: str = "LOGIN"

class OtpLoginRequest(BaseModel):
    email: EmailStr
    otp_code: str

class PasswordResetRequest(BaseModel):
    email: EmailStr
    otp_code: str
    new_password: str = Field(..., min_length=6)

# --- Customer Profile & Address Schemas ---
class CustomerProfileUpdate(BaseModel):
    full_name: Optional[str] = None
    phone: Optional[str] = None
    alt_phone: Optional[str] = None
    address: Optional[str] = None
    city: Optional[str] = "Kopargaon"
    district: Optional[str] = "Ahmednagar"
    pincode: Optional[str] = "423601"
    preferred_language: Optional[str] = "en"
    lat: Optional[float] = None
    lon: Optional[float] = None
    has_instant_subscription: Optional[bool] = None

class CustomerAddressCreate(BaseModel):
    title: str = "Home"
    address_line: str
    area: Optional[str] = None
    city: Optional[str] = "Kopargaon"
    district: Optional[str] = "Ahmednagar"
    pincode: Optional[str] = "423601"
    lat: Optional[float] = None
    lon: Optional[float] = None
    is_default: bool = False

class CustomerAddressResponse(BaseModel):
    id: int
    user_id: int
    title: str
    address_line: str
    area: Optional[str] = None
    city: str
    district: str
    pincode: str
    lat: Optional[float] = None
    lon: Optional[float] = None
    is_default: bool
    created_at: datetime
    model_config = ConfigDict(from_attributes=True)

class CustomerContactCreate(BaseModel):
    name: str
    phone: str
    relation: Optional[str] = "Alternate"
    is_primary: bool = False

class CustomerContactResponse(BaseModel):
    id: int
    user_id: int
    name: str
    phone: str
    relation: Optional[str] = None
    is_primary: bool
    created_at: datetime
    model_config = ConfigDict(from_attributes=True)

# --- Booking Quote & Pricing Schemas ---
class BookingQuoteCreate(BaseModel):
    booking_id: int
    worker_proposed_price: float
    notes: Optional[str] = None

class BookingQuoteAction(BaseModel):
    action: str = Field(..., pattern="^(ACCEPT|REJECT)$")

class BookingQuoteResponse(BaseModel):
    id: int
    booking_id: int
    original_estimated_price: float
    worker_proposed_price: Optional[float] = None
    final_agreed_price: Optional[float] = None
    status: str
    notes: Optional[str] = None
    created_at: datetime
    model_config = ConfigDict(from_attributes=True)

# --- Booking Messaging Schemas ---
class BookingMessageCreate(BaseModel):
    message: str

class BookingMessageResponse(BaseModel):
    id: int
    booking_id: int
    sender_id: int
    sender_name: Optional[str] = None
    sender_role: str
    message: str
    created_at: datetime
    model_config = ConfigDict(from_attributes=True)

# --- Mutual Review Schemas ---
class WorkerReviewCreate(BaseModel):
    booking_id: int
    score: int = Field(..., ge=1, le=5)
    feedback: Optional[str] = None

class WorkerReviewResponse(BaseModel):
    id: int
    booking_id: int
    worker_id: int
    customer_id: int
    score: int
    feedback: Optional[str] = None
    created_at: datetime
    model_config = ConfigDict(from_attributes=True)

