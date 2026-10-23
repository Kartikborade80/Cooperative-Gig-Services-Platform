import random
from datetime import datetime, timedelta, timezone
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.core.security import verify_password, get_password_hash, create_access_token
from app.core.config import settings
from app.models.models import (
    User, Worker, UserRole, 
    WelfareAccount, Skill, WorkerSkill, WorkerAvailability,
    WorkerCategory, ServiceCategory, CustomerAddress, CustomerContact,
    OtpVerification, AuditLog
)
from app.schemas.schemas import (
    UserRegister, UserLogin, Token, UserResponse,
    CustomerProfileUpdate, CustomerAddressCreate, CustomerAddressResponse,
    CustomerContactCreate, CustomerContactResponse,
    OtpSendRequest, OtpVerifyRequest, OtpLoginRequest, PasswordResetRequest,
    WorkerRegisterRequest, PasswordChangeRequest
)
from app.api.deps import get_current_user
from app.services.email_service import EmailService

router = APIRouter(prefix="/auth", tags=["Authentication"])

@router.post("/register", response_model=UserResponse)
def register(user_in: UserRegister, db: Session = Depends(get_db)):
    # Check duplicate email
    clean_email = user_in.email.strip().lower()
    existing_user = db.query(User).filter(User.email == clean_email).first()
    if existing_user:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="A user with this email address already exists."
        )

    # Check duplicate phone if provided
    if user_in.phone:
        existing_phone = db.query(User).filter(User.phone == user_in.phone.strip()).first()
        if existing_phone:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="A user with this phone number already exists."
            )

    is_verified = True
    if user_in.otp_code:
        now = datetime.now(timezone.utc)
        otp_record = db.query(OtpVerification).filter(
            OtpVerification.email == clean_email,
            OtpVerification.otp_code == user_in.otp_code.strip(),
            OtpVerification.is_used == False
        ).order_by(OtpVerification.created_at.desc()).first()

        if not otp_record:
            raise HTTPException(status_code=400, detail="Invalid OTP code for registration.")
        rec_expiry = otp_record.expires_at
        if rec_expiry.tzinfo is None:
            rec_expiry = rec_expiry.replace(tzinfo=timezone.utc)
        if rec_expiry < now:
            raise HTTPException(status_code=400, detail="Registration OTP has expired. Please request a new code.")
        otp_record.is_used = True
        is_verified = True

    user = User(
        email=clean_email,
        phone=user_in.phone.strip() if user_in.phone else None,
        alt_phone=user_in.alt_phone.strip() if user_in.alt_phone else None,
        email_verified=is_verified,
        hashed_password=get_password_hash(user_in.password),
        full_name=(user_in.full_name or "Member").strip(),
        role=user_in.role or UserRole.CUSTOMER,
        address=user_in.address,
        city=user_in.city or settings.DEFAULT_CITY,
        district=user_in.district or settings.DEFAULT_DISTRICT,
        pincode=user_in.pincode or "423601",
        preferred_language=user_in.preferred_language or "en",
        lat=user_in.lat or settings.DEFAULT_LAT,
        lon=user_in.lon or settings.DEFAULT_LON,
        is_active=True
    )
    db.add(user)
    db.commit()
    db.refresh(user)

    # If registering as CUSTOMER and address provided, create default address
    if user_in.role == UserRole.CUSTOMER and user_in.address:
        default_addr = CustomerAddress(
            user_id=user.id,
            title="Home",
            address_line=user_in.address,
            city=user.city,
            district=user.district,
            pincode=user.pincode,
            lat=user.lat,
            lon=user.lon,
            is_default=True
        )
        db.add(default_addr)
        db.commit()

    # If registering as WORKER, initialize worker profile, categories, slots & welfare
    if user_in.role == UserRole.WORKER:
        worker = Worker(
            user_id=user.id,
            cooperative_id=user_in.cooperative_id or 1,
            verification_status="PENDING", # Requires ID verification & Cooperative approval
            identity_status="PENDING",
            experience_years=user_in.experience_years or 1.0,
            starting_price=user_in.starting_price or 350.0,
            bio=user_in.bio or "Skilled cooperative member worker.",
            service_area=user_in.service_area or f"{settings.DEFAULT_CITY} & Surrounds",
            lat=user_in.lat or settings.DEFAULT_LAT,
            lon=user_in.lon or settings.DEFAULT_LON,
            is_available=True,
            emergency_available=True
        )
        db.add(worker)
        db.commit()
        db.refresh(worker)

        # 1. Process Service Categories
        categories_to_assign = set()
        if user_in.service_categories:
            for c in user_in.service_categories:
                if c and c.strip():
                    categories_to_assign.add(c.strip())
        if user_in.skills:
            for s in user_in.skills:
                if s and s.strip():
                    categories_to_assign.add(s.strip())

        for cat_name in categories_to_assign:
            cat_obj = db.query(ServiceCategory).filter(ServiceCategory.name.ilike(f"%{cat_name}%")).first()
            wc = WorkerCategory(
                worker_id=worker.id,
                category_id=cat_obj.id if cat_obj else None,
                category_name=cat_name,
                is_verified=True
            )
            db.add(wc)

            # Match or create Skill
            skill_obj = db.query(Skill).filter(Skill.name.ilike(f"%{cat_name}%")).first()
            if skill_obj:
                ws = WorkerSkill(
                    worker_id=worker.id,
                    skill_id=skill_obj.id,
                    proficiency_level="Expert",
                    verified_by_coop=True
                )
                db.add(ws)

        # Seed standard time slots for everyday operations
        standard_slots = [
            "09:00 AM - 10:00 AM",
            "11:00 AM - 12:00 PM",
            "02:00 PM - 03:00 PM",
            "04:00 PM - 05:00 PM",
            "06:00 PM - 07:00 PM"
        ]
        for day in range(7):
            for slot in standard_slots:
                db.add(WorkerAvailability(
                    worker_id=worker.id,
                    day_of_week=day,
                    slot_time=slot,
                    is_active=True
                ))

        # Initialize worker welfare account
        welfare = WelfareAccount(
            worker_id=worker.id,
            balance=1000.0,
            total_contributed=200.0,
            emergency_fund_eligible=True
        )
        db.add(welfare)
        db.commit()

    return user

@router.post("/register-worker", response_model=Token)
def register_worker(worker_in: WorkerRegisterRequest, db: Session = Depends(get_db)):
    clean_email = worker_in.email.strip().lower()

    # 1. Check duplicate email & phone
    if db.query(User).filter(User.email == clean_email).first():
        raise HTTPException(status_code=400, detail="An account with this email address already exists.")
    if worker_in.phone and db.query(User).filter(User.phone == worker_in.phone.strip()).first():
        raise HTTPException(status_code=400, detail="An account with this mobile number already exists.")

    # 2. Verify Email OTP
    now = datetime.now(timezone.utc)
    otp_record = db.query(OtpVerification).filter(
        OtpVerification.email == clean_email,
        OtpVerification.otp_code == worker_in.otp_code.strip(),
        OtpVerification.is_used == False
    ).order_by(OtpVerification.created_at.desc()).first()

    if not otp_record:
        raise HTTPException(status_code=400, detail="Invalid OTP code for worker registration.")
    rec_expiry = otp_record.expires_at
    if rec_expiry.tzinfo is None:
        rec_expiry = rec_expiry.replace(tzinfo=timezone.utc)
    if rec_expiry < now:
        raise HTTPException(status_code=400, detail="OTP has expired. Please request a new verification code.")
    otp_record.is_used = True

    # 3. Create User account with WORKER role
    user = User(
        email=clean_email,
        phone=worker_in.phone.strip(),
        email_verified=True, # Verified via OTP above
        hashed_password=get_password_hash(worker_in.password),
        full_name=worker_in.full_name.strip(),
        role=UserRole.WORKER,
        address=worker_in.address,
        city=worker_in.city or settings.DEFAULT_CITY,
        district=worker_in.district or settings.DEFAULT_DISTRICT,
        pincode=worker_in.pincode or "423601",
        lat=worker_in.lat or settings.DEFAULT_LAT,
        lon=worker_in.lon or settings.DEFAULT_LON,
        is_active=True
    )
    db.add(user)
    db.commit()
    db.refresh(user)

    # 4. Create Worker profile with PENDING official verification
    doc_clean = worker_in.document_number.strip().replace(" ", "").replace("-", "")
    id_ref = f"PENDING-ID-{worker_in.document_type}-{doc_clean[-4:] if len(doc_clean)>=4 else '0000'}"
    worker = Worker(
        user_id=user.id,
        cooperative_id=1,
        verification_status="UNDER_REVIEW", # Queued for Cooperative Admin review
        identity_status="PENDING", # Pending official UIDAI/DigiLocker API integration
        identity_ref=id_ref,
        experience_years=worker_in.experience_years or 1.0,
        starting_price=350.0,
        bio=worker_in.bio or f"Cooperative professional specialising in {', '.join(worker_in.service_categories)}.",
        service_area=worker_in.service_area or f"{settings.DEFAULT_CITY} & Surrounds",
        lat=worker_in.lat or settings.DEFAULT_LAT,
        lon=worker_in.lon or settings.DEFAULT_LON,
        is_available=True,
        emergency_available=True
    )
    db.add(worker)
    db.commit()
    db.refresh(worker)

    # 5. Assign selected Service Categories & Skills
    categories_assigned = set()
    for cat_name in worker_in.service_categories:
        if cat_name and cat_name.strip():
            categories_assigned.add(cat_name.strip())
    if worker_in.skills:
        for s in worker_in.skills:
            if s and s.strip():
                categories_assigned.add(s.strip())

    for cat_name in categories_assigned:
        cat_obj = db.query(ServiceCategory).filter(ServiceCategory.name.ilike(f"%{cat_name}%")).first()
        wc = WorkerCategory(
            worker_id=worker.id,
            category_id=cat_obj.id if cat_obj else None,
            category_name=cat_name,
            is_verified=True
        )
        db.add(wc)

        skill_obj = db.query(Skill).filter(Skill.name.ilike(f"%{cat_name}%")).first()
        if skill_obj:
            ws = WorkerSkill(
                worker_id=worker.id,
                skill_id=skill_obj.id,
                proficiency_level="Expert",
                verified_by_coop=True
            )
            db.add(ws)

    # 6. Add standard availability slots
    standard_slots = [
        "09:00 AM - 10:00 AM",
        "11:00 AM - 12:00 PM",
        "02:00 PM - 03:00 PM",
        "04:00 PM - 05:00 PM",
        "06:00 PM - 07:00 PM"
    ]
    for day in range(7):
        for slot in standard_slots:
            db.add(WorkerAvailability(
                worker_id=worker.id,
                day_of_week=day,
                slot_time=slot,
                is_active=True
            ))

    # 7. Add Welfare account
    db.add(WelfareAccount(
        worker_id=worker.id,
        balance=1000.0,
        total_contributed=200.0,
        emergency_fund_eligible=True
    ))

    # 8. Audit log
    db.add(AuditLog(
        user_id=user.id,
        action="WORKER_REGISTERED_CAREERS",
        entity_name="Worker",
        entity_id=str(worker.id),
        details=f"Worker registered via Careers. Categories: {', '.join(categories_assigned)}. ID ref: {id_ref} (Official verification pending)."
    ))
    db.commit()

    access_token = create_access_token(
        subject=user.id,
        role=user.role.value
    )
    return {
        "access_token": access_token,
        "token_type": "bearer",
        "role": user.role,
        "user_id": user.id,
        "full_name": user.full_name
    }

@router.post("/login", response_model=Token)
def login(login_in: UserLogin, db: Session = Depends(get_db)):
    login_id = (login_in.username or login_in.email or "").strip()
    if not login_id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Mobile number or Email is required",
        )
    username_clean = login_id.lower()
    user = db.query(User).filter(
        (User.email == username_clean) | 
        (User.phone == login_id)
    ).first()

    if not user or not verify_password(login_in.password, user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect mobile number/email or password",
            headers={"WWW-Authenticate": "Bearer"},
        )
    if not user.is_active:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Inactive user account")

    if not user.email_verified:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Email address is not verified. Please verify your email with OTP before logging in."
        )

    access_token = create_access_token(
        subject=user.id,
        role=user.role.value
    )
    return {
        "access_token": access_token,
        "token_type": "bearer",
        "role": user.role,
        "user_id": user.id,
        "full_name": user.full_name
    }

# --- OTP Endpoints ---
@router.post("/send-otp")
def send_otp(req: OtpSendRequest, db: Session = Depends(get_db)):
    clean_email = req.email.strip().lower()

    # Rate limiting: check recent OTPs in last 5 minutes
    now = datetime.now(timezone.utc)
    five_min_ago = now - timedelta(minutes=5)
    recent_count = db.query(OtpVerification).filter(
        OtpVerification.email == clean_email,
        OtpVerification.created_at >= five_min_ago
    ).count()

    if recent_count >= 25:
        raise HTTPException(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            detail="Too many OTP requests. Please wait a few minutes before trying again."
        )

    # Invalidate old unused OTPs
    db.query(OtpVerification).filter(
        OtpVerification.email == clean_email,
        OtpVerification.is_used == False
    ).update({"is_used": True})
    db.commit()

    # Generate 6-digit OTP
    otp_code = f"{random.randint(100000, 999999)}"
    expires_at = now + timedelta(minutes=10)

    otp_record = OtpVerification(
        email=clean_email,
        otp_code=otp_code,
        purpose=req.purpose,
        expires_at=expires_at,
        is_used=False
    )
    db.add(otp_record)
    db.commit()

    # Dispatch via EmailService (uses SMTP or Dev Mock Mode)
    email_res = EmailService.send_otp_email(
        db=db,
        to_email=clean_email,
        otp_code=otp_code,
        purpose=req.purpose
    )

    resp = {
        "message": f"OTP successfully sent to {clean_email}",
        "expires_in_minutes": 10,
        "is_mock": email_res.get("is_mock", True)
    }
    # Return debug_otp for easy verification in development/testing mode
    if email_res.get("is_mock", True):
        resp["debug_otp"] = otp_code

    return resp

@router.post("/verify-otp")
def verify_otp(req: OtpVerifyRequest, db: Session = Depends(get_db)):
    clean_email = req.email.strip().lower()
    now = datetime.now(timezone.utc)

    otp_record = db.query(OtpVerification).filter(
        OtpVerification.email == clean_email,
        OtpVerification.otp_code == req.otp_code.strip(),
        OtpVerification.is_used == False
    ).order_by(OtpVerification.created_at.desc()).first()

    if not otp_record:
        raise HTTPException(status_code=400, detail="Invalid OTP code.")

    # Check expiry
    rec_expiry = otp_record.expires_at
    if rec_expiry.tzinfo is None:
        rec_expiry = rec_expiry.replace(tzinfo=timezone.utc)
    if rec_expiry < now:
        raise HTTPException(status_code=400, detail="This OTP has expired. Please request a new one.")

    # Mark as used
    otp_record.is_used = True

    # If user exists, mark email_verified = True
    user = db.query(User).filter(User.email == clean_email).first()
    if user:
        user.email_verified = True

    db.commit()
    return {"message": "Email successfully verified", "verified": True}

@router.post("/login-otp", response_model=Token)
def login_with_otp(req: OtpLoginRequest, db: Session = Depends(get_db)):
    clean_email = req.email.strip().lower()
    now = datetime.now(timezone.utc)

    otp_record = db.query(OtpVerification).filter(
        OtpVerification.email == clean_email,
        OtpVerification.otp_code == req.otp_code.strip(),
        OtpVerification.is_used == False
    ).order_by(OtpVerification.created_at.desc()).first()

    if not otp_record:
        raise HTTPException(status_code=400, detail="Invalid OTP code.")

    rec_expiry = otp_record.expires_at
    if rec_expiry.tzinfo is None:
        rec_expiry = rec_expiry.replace(tzinfo=timezone.utc)
    if rec_expiry < now:
        raise HTTPException(status_code=400, detail="This OTP has expired.")

    user = db.query(User).filter(User.email == clean_email).first()
    if not user:
        raise HTTPException(status_code=404, detail="No registered account found for this email.")

    if not user.is_active:
        raise HTTPException(status_code=400, detail="Inactive user account")

    otp_record.is_used = True
    user.email_verified = True
    db.commit()

    access_token = create_access_token(
        subject=user.id,
        role=user.role.value
    )
    return {
        "access_token": access_token,
        "token_type": "bearer",
        "role": user.role,
        "user_id": user.id,
        "full_name": user.full_name
    }

@router.post("/reset-password")
def reset_password(req: PasswordResetRequest, db: Session = Depends(get_db)):
    clean_email = req.email.strip().lower()
    now = datetime.now(timezone.utc)

    otp_record = db.query(OtpVerification).filter(
        OtpVerification.email == clean_email,
        OtpVerification.otp_code == req.otp_code.strip(),
        OtpVerification.is_used == False
    ).order_by(OtpVerification.created_at.desc()).first()

    if not otp_record:
        raise HTTPException(status_code=400, detail="Invalid OTP code.")

    rec_expiry = otp_record.expires_at
    if rec_expiry.tzinfo is None:
        rec_expiry = rec_expiry.replace(tzinfo=timezone.utc)
    if rec_expiry < now:
        raise HTTPException(status_code=400, detail="This OTP has expired.")

    user = db.query(User).filter(User.email == clean_email).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found.")

    otp_record.is_used = True
    user.hashed_password = get_password_hash(req.new_password)
    db.commit()

    return {"message": "Password successfully reset. You can now login with your new password."}

@router.get("/me", response_model=UserResponse)
def get_me(current_user: User = Depends(get_current_user)):
    return current_user

# --- Customer Profile Endpoints ---
@router.put("/profile", response_model=UserResponse)
def update_profile(
    profile_in: CustomerProfileUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    if profile_in.full_name is not None:
        current_user.full_name = profile_in.full_name.strip()
    if profile_in.phone is not None:
        current_user.phone = profile_in.phone.strip()
    if profile_in.alt_phone is not None:
        current_user.alt_phone = profile_in.alt_phone.strip()
    if profile_in.address is not None:
        current_user.address = profile_in.address
    if profile_in.city is not None:
        current_user.city = profile_in.city
    if profile_in.district is not None:
        current_user.district = profile_in.district
    if profile_in.pincode is not None:
        current_user.pincode = profile_in.pincode
    if profile_in.preferred_language is not None:
        current_user.preferred_language = profile_in.preferred_language
    if profile_in.lat is not None:
        current_user.lat = profile_in.lat
    if profile_in.lon is not None:
        current_user.lon = profile_in.lon
    if profile_in.has_instant_subscription is not None:
        current_user.has_instant_subscription = profile_in.has_instant_subscription
        if profile_in.has_instant_subscription:
            current_user.instant_subscription_plan = "INSTANT_PRIORITY"
            current_user.instant_subscription_expires_at = datetime.now(timezone.utc) + timedelta(days=30)
        else:
            current_user.instant_subscription_plan = None
            current_user.instant_subscription_expires_at = None

    db.commit()
    db.refresh(current_user)
    return current_user

@router.post("/change-password")
def change_password(
    req: PasswordChangeRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    user = db.query(User).filter(User.id == current_user.id).first()
    if not verify_password(req.current_password, user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Current password is incorrect."
        )
    user.hashed_password = get_password_hash(req.new_password)
    db.commit()
    return {"message": "Password changed successfully."}

@router.post("/subscription/toggle", response_model=UserResponse)
def toggle_instant_subscription(
    enable: Optional[bool] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    user = db.query(User).filter(User.id == current_user.id).first()
    if enable is not None:
        user.has_instant_subscription = enable
    else:
        user.has_instant_subscription = not bool(user.has_instant_subscription)

    if user.has_instant_subscription:
        user.instant_subscription_plan = "INSTANT_PRIORITY"
        user.instant_subscription_expires_at = datetime.now(timezone.utc) + timedelta(days=30)
    else:
        user.instant_subscription_plan = None
        user.instant_subscription_expires_at = None
    db.commit()
    db.refresh(user)
    return user

# --- Saved Addresses Endpoints ---
@router.get("/addresses", response_model=List[CustomerAddressResponse])
def get_user_addresses(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    addresses = db.query(CustomerAddress).filter(
        CustomerAddress.user_id == current_user.id
    ).order_by(CustomerAddress.is_default.desc(), CustomerAddress.created_at.desc()).all()
    return addresses

@router.post("/addresses", response_model=CustomerAddressResponse)
def create_user_address(
    addr_in: CustomerAddressCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    # If set as default, unset other defaults
    if addr_in.is_default:
        db.query(CustomerAddress).filter(
            CustomerAddress.user_id == current_user.id
        ).update({"is_default": False})

    new_addr = CustomerAddress(
        user_id=current_user.id,
        title=addr_in.title,
        address_line=addr_in.address_line,
        area=addr_in.area,
        city=addr_in.city,
        district=addr_in.district,
        pincode=addr_in.pincode,
        lat=addr_in.lat or current_user.lat,
        lon=addr_in.lon or current_user.lon,
        is_default=addr_in.is_default
    )
    db.add(new_addr)
    db.commit()
    db.refresh(new_addr)
    return new_addr

@router.put("/addresses/{addr_id}/default", response_model=CustomerAddressResponse)
def set_default_address(
    addr_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    addr = db.query(CustomerAddress).filter(
        CustomerAddress.id == addr_id,
        CustomerAddress.user_id == current_user.id
    ).first()
    if not addr:
        raise HTTPException(status_code=404, detail="Address not found")

    db.query(CustomerAddress).filter(
        CustomerAddress.user_id == current_user.id
    ).update({"is_default": False})

    addr.is_default = True
    db.commit()
    db.refresh(addr)
    return addr

@router.delete("/addresses/{addr_id}")
def delete_address(
    addr_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    addr = db.query(CustomerAddress).filter(
        CustomerAddress.id == addr_id,
        CustomerAddress.user_id == current_user.id
    ).first()
    if not addr:
        raise HTTPException(status_code=404, detail="Address not found")

    db.delete(addr)
    db.commit()
    return {"message": "Address deleted"}
