import os
import sys
import csv
from datetime import datetime, timedelta, timezone

# Add backend directory to sys.path
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "../..")))

from app.core.database import SessionLocal, engine, Base
from app.core.security import get_password_hash
from app.core.config import settings
from app.models.models import (
    User, Worker, Cooperative, Skill, WorkerSkill, 
    Certification, WorkerCertification, ServiceCategory, 
    Service, Booking, BookingStatus, BookingStatusHistory, 
    Payment, PaymentStatus, Invoice, Rating, WelfareAccount, 
    InsuranceRecord, TrainingRecord, DemandData, UserRole, 
    WorkerAvailability, WorkerCategory, CustomerAddress,
    CustomerContact, BookingQuote, BookingMessage,
    OtpVerification, EmailNotification, WorkerReview
)

def run_seed():
    print("Initializing Database tables...")
    Base.metadata.drop_all(bind=engine)
    Base.metadata.create_all(bind=engine)
    db = SessionLocal()

    # Drop existing data if any to ensure clean fresh Kopargaon 20 KM dataset
    print("Clearing previous demo records...")
    db.query(BookingMessage).delete()
    db.query(BookingQuote).delete()
    db.query(BookingStatusHistory).delete()
    db.query(WorkerReview).delete()
    db.query(Invoice).delete()
    db.query(Payment).delete()
    db.query(Rating).delete()
    db.query(Booking).delete()
    db.query(WorkerAvailability).delete()
    db.query(WorkerCategory).delete()
    db.query(WorkerSkill).delete()
    db.query(WorkerCertification).delete()
    db.query(InsuranceRecord).delete()
    db.query(TrainingRecord).delete()
    db.query(WelfareAccount).delete()
    db.query(Worker).delete()
    db.query(CustomerAddress).delete()
    db.query(CustomerContact).delete()
    db.query(Service).delete()
    db.query(ServiceCategory).delete()
    db.query(Skill).delete()
    db.query(Certification).delete()
    db.query(DemandData).delete()
    db.query(OtpVerification).delete()
    db.query(EmailNotification).delete()
    db.query(User).delete()
    db.query(Cooperative).delete()
    db.commit()

    print("Seeding Cooperative Society (Kopargaon)...")
    coop = Cooperative(
        name="Shramik Sahakari Labour Cooperative Federation",
        registration_no="MH/AHM/COOP/2022/4910",
        state="Maharashtra",
        district="Ahmednagar",
        contact_person="Vikas Patil (General Secretary)",
        contact_phone="+91-9822012345",
        address="Sahakar Bhavan, Shivaji Chowk, Kopargaon, Ahmednagar 423601",
        commission_rate=5.0,
        service_radius_km=20.0,
        is_active=True
    )
    db.add(coop)
    db.commit()
    db.refresh(coop)

    print("Seeding Core Users & Demo Accounts...")
    hashed_pwd = get_password_hash("Demo@123")

    # 1. Customer Demo (Pooja Sharma, Kopargaon)
    customer_user = User(
        email="customer@demo.com",
        phone="+91-9890011223",
        hashed_password=hashed_pwd,
        full_name="Pooja Sharma",
        role=UserRole.CUSTOMER,
        address="Flat 204, Shanti Heights, Near Shivaji Chowk, Kopargaon",
        city="Kopargaon",
        district="Ahmednagar",
        pincode="423601",
        preferred_language="en",
        lat=19.8917,
        lon=74.4795,
        email_verified=True,
        is_active=True
    )
    db.add(customer_user)
    db.commit()
    db.refresh(customer_user)

    # Seed default customer address
    db.add(CustomerAddress(
        user_id=customer_user.id,
        title="Home",
        address_line="Flat 204, Shanti Heights, Near Shivaji Chowk, Kopargaon",
        city="Kopargaon",
        district="Ahmednagar",
        pincode="423601",
        lat=19.8917,
        lon=74.4795,
        is_default=True
    ))
    db.commit()

    # 2. Worker Demo (Ramesh Jadhav, Plumber)
    worker_user = User(
        email="worker@demo.com",
        phone="+91-9822998877",
        hashed_password=hashed_pwd,
        full_name="Ramesh Jadhav",
        role=UserRole.WORKER,
        address="Plot 14, Sahakar Nagar, Kopargaon",
        city="Kopargaon",
        district="Ahmednagar",
        pincode="423601",
        preferred_language="mr",
        lat=19.8820, # ~2.5 KM from center
        lon=74.4710,
        email_verified=True,
        is_active=True
    )
    db.add(worker_user)

    # 3. Cooperative Admin Demo
    admin_user = User(
        email="admin@demo.com",
        phone="+91-9822114455",
        hashed_password=hashed_pwd,
        full_name="Sunil Deshmukh (Secretary)",
        role=UserRole.COOPERATIVE_ADMIN,
        address="Cooperative Bhavan, Kopargaon",
        city="Kopargaon",
        district="Ahmednagar",
        pincode="423601",
        preferred_language="mr",
        lat=19.8917,
        lon=74.4795,
        email_verified=True,
        is_active=True
    )
    db.add(admin_user)

    # 4. Super Admin Demo
    super_admin_user = User(
        email="superadmin@demo.com",
        phone="+91-9800000001",
        hashed_password=hashed_pwd,
        full_name="State Registrar (Super Admin)",
        role=UserRole.SUPER_ADMIN,
        address="Mantralaya, Mumbai / Regional Directorate",
        city="Mumbai",
        district="Mumbai",
        pincode="400032",
        preferred_language="en",
        lat=18.9220,
        lon=72.8347,
        email_verified=True,
        is_active=True
    )
    db.add(super_admin_user)
    db.commit()

    print("Seeding Skills & Certifications...")
    skills_data = [
        ("Plumbing", "Plumbing", "Residential and commercial piping, leak detection, taps"),
        ("Electrical", "Electrical", "Wiring, short circuit repairs, switchboards, MCB"),
        ("Cleaning", "Cleaning & Sanitation", "Home deep clean, kitchen descaling, sanitization"),
        ("Carpentry", "Carpentry", "Furniture repair, door locks, hinges, cabinetry"),
        ("Painting", "Painting", "Interior emulsion, dampness treatment, waterproofing"),
        ("Appliance Repair", "Appliance Repair", "Washing machine, refrigerator, microwave service"),
        ("AC Repair", "AC & Cooling", "AC deep clean, refrigerant gas filling, cooling diagnostics"),
        ("Gardening", "Gardening & Landscape", "Lawn maintenance, tree trimming, garden landscaping"),
        ("Home Maintenance", "General Maintenance", "Masonry, tile fixes, door latches, miscellaneous repairs")
    ]
    skill_objs = {}
    for name, cat, desc in skills_data:
        s = Skill(name=name, category=cat, description=desc)
        db.add(s)
        skill_objs[name] = s
    db.commit()

    cert1 = Certification(name="Government Certified Wireman", issuing_authority="Maharashtra State Skill Board", description="Grade 1 Licensed Electrician")
    cert2 = Certification(name="Master Plumber Certification", issuing_authority="Indian Plumbing Skills Council", description="Residential & Commercial Plumbing Standard")
    cert3 = Certification(name="HVAC Refrigeration & Safety", issuing_authority="National Skill Development Corporation", description="Certified AC Specialist")
    db.add_all([cert1, cert2, cert3])
    db.commit()

    print("Seeding 10 Service Categories & Services...")
    categories_spec = [
        ("Plumbing", "wrench", [
            ("Pipe Leakage & Tap Repair", "Fix leaking taps, kitchen sink pipes, and bathroom fittings", 350.0, 45, True),
            ("Drain Blockage Clearing", "Deep mechanical drain clearing and sewage pipe unblocking", 450.0, 60, True),
            ("Water Tank & Motor Repair", "Overhead tank cleaning and booster pump overhaul", 650.0, 90, False)
        ]),
        ("Electrical", "zap", [
            ("Fan & Switchboard Repair", "Ceiling fan installation, switchboard repair, MCB trip fixes", 300.0, 45, True),
            ("Short Circuit Emergency", "Immediate diagnosis of tripping power and sparking hazard", 500.0, 40, True),
            ("Full House Wiring Check", "Complete voltage, earthing, and distribution box diagnostic", 800.0, 120, False)
        ]),
        ("Cleaning", "sparkles", [
            ("Bathroom Deep Cleaning", "Chemical descaling of hard water stains, tiles, and fixtures", 499.0, 60, False),
            ("Full Home Deep Sanitization", "Eco-friendly dusting, vacuuming, and kitchen scrub", 1799.0, 240, False)
        ]),
        ("Carpentry", "hammer", [
            ("Door Lock & Hinge Repair", "Jammed lock replacement, alignment, and cabinet hinges", 350.0, 45, True),
            ("Furniture Assembly & Repair", "Bed, table, drawer fitting and wooden restoration", 550.0, 90, False)
        ]),
        ("Painting", "paint-brush", [
            ("Wall Dampness & Waterproofing", "Polymer coating and dampness sealant for monsoon walls", 850.0, 120, False),
            ("Interior Room Touch-up", "Wall priming and double coat touch-up painting", 1200.0, 180, False)
        ]),
        ("Appliance Repair", "tv", [
            ("Refrigerator Repair", "Frost-free fridge cooling issue, thermostat, compressor check", 450.0, 60, True),
            ("Washing Machine Service", "Drum spin issue, inlet valve, and motor diagnostic", 500.0, 75, False)
        ]),
        ("AC Repair", "cpu", [
            ("AC Deep Jet Cleaning", "Indoor and outdoor unit foam pressure jet service", 599.0, 60, False),
            ("AC Gas Refill & Cooling Fix", "Refrigerant leak detection and complete gas refill", 1450.0, 90, True)
        ]),
        ("Gardening", "leaf", [
            ("Lawn Mowing & Hedge Trim", "Professional lawn mowing, weed removal, and pruning", 400.0, 90, False),
            ("Complete Garden Cleanup", "Soil turning, fertilizing, and seasonal plant pruning", 750.0, 150, False)
        ]),
        ("Home Maintenance", "home", [
            ("General Handyman Service", "Wall drilling, curtain rod fitting, tile grout repair", 350.0, 60, False),
            ("Door / Window Mesh Fitting", "Mosquito mesh installation for doors and windows", 600.0, 90, False)
        ]),
        ("Other Services", "more-horizontal", [
            ("Labour Assistance for Moving", "Physical moving, lifting, and cooperative labour assist", 500.0, 120, False)
        ])
    ]

    for cat_name, icon, srvs in categories_spec:
        cat = ServiceCategory(name=cat_name, description=f"Professional cooperative {cat_name} services", icon=icon)
        db.add(cat)
        db.commit()
        db.refresh(cat)
        for s_name, s_desc, price, dur, emerg in srvs:
            s = Service(
                category_id=cat.id,
                name=s_name,
                description=s_desc,
                base_price=price,
                estimated_duration_mins=dur,
                is_emergency_enabled=emerg,
                is_active=True
            )
            db.add(s)
        db.commit()

    print("Loading Worker records from CSV: backend/data/workers.csv...")
    csv_path = os.path.join(os.path.dirname(__file__), "..", "..", "data", "workers.csv")
    csv_path = os.path.abspath(csv_path)

    workers_geo = []
    with open(csv_path, newline="", encoding="utf-8") as f:
        reader = csv.DictReader(f)
        for row in reader:
            workers_geo.append(row)

    # Map existing demo user by email so Ramesh Jadhav links to worker@demo.com
    existing_user_map = {
        "ramesh.worker@demo.com": worker_user.id
    }

    worker_records = []
    standard_slots = [
        "09:00 AM - 10:00 AM",
        "11:00 AM - 12:00 PM",
        "02:00 PM - 03:00 PM",
        "04:00 PM - 05:00 PM",
        "06:00 PM - 07:00 PM"
    ]

    for row in workers_geo:
        name       = row["name"]
        email      = row["email"]
        phone      = row["phone"]
        skill      = row["skill"]
        area       = row["area"]
        lat        = float(row["lat"])
        lon        = float(row["lon"])
        exp        = float(row["experience_years"])
        rating     = float(row["average_rating"])
        r_count    = int(row["rating_count"])
        jobs       = int(row["total_jobs_completed"])
        recent     = int(row["recent_jobs_count"])
        v_status   = row["verification_status"]
        id_status  = row["identity_status"]
        price      = float(row["starting_price"])
        languages  = row.get("languages", "Marathi, Hindi, English")
        bio        = row.get("bio", f"Cooperative worker specialising in {skill}.")

        # Re-use an existing user account if the email is pre-mapped (e.g. worker@demo.com)
        existing_uid = existing_user_map.get(email)

        if not existing_uid:
            u = User(
                email=email,
                phone=phone,
                hashed_password=hashed_pwd,
                full_name=name,
                role=UserRole.WORKER,
                address=f"Ward Road, {area}, Kopargaon",
                city="Kopargaon",
                district="Ahmednagar",
                pincode="423601",
                preferred_language="mr",
                lat=lat,
                lon=lon,
                email_verified=True,
                is_active=True
            )
            db.add(u)
            db.commit()
            uid = u.id
        else:
            uid = existing_uid

        w = Worker(
            user_id=uid,
            cooperative_id=coop.id,
            verification_status=v_status,
            identity_status=id_status,
            identity_ref=f"DL-DEMO-202610-{uid:04d}" if id_status != "PENDING" else None,
            experience_years=exp,
            starting_price=price,
            bio=bio,
            service_area=area,
            lat=lat,
            lon=lon,
            is_available=True,
            emergency_available=True,
            languages=languages,
            reliability_score=96.0,
            average_rating=rating,
            rating_count=r_count,
            total_jobs_completed=jobs,
            recent_jobs_count=recent,
            total_earnings=jobs * price
        )
        db.add(w)
        db.commit()
        db.refresh(w)
        worker_records.append(w)

        # Attach skill and category
        if skill in skill_objs:
            db.add(WorkerSkill(
                worker_id=w.id,
                skill_id=skill_objs[skill].id,
                proficiency_level="Expert" if exp > 5 else "Intermediate",
                verified_by_coop=(v_status == "VERIFIED")
            ))

        # Attach explicit verified category
        cat_match = db.query(ServiceCategory).filter(ServiceCategory.name.ilike(f"%{skill}%")).first()
        db.add(WorkerCategory(
            worker_id=w.id,
            category_id=cat_match.id if cat_match else None,
            category_name=skill,
            is_verified=(v_status == "VERIFIED")
        ))

        # Seed Availability slots for Monday through Sunday
        for day in range(7):
            for slot in standard_slots:
                db.add(WorkerAvailability(
                    worker_id=w.id,
                    day_of_week=day,
                    slot_time=slot,
                    is_active=True
                ))

        # Welfare & Insurance
        db.add(WelfareAccount(worker_id=w.id, balance=3500.0, total_contributed=750.0, emergency_fund_eligible=True))
        db.add(InsuranceRecord(worker_id=w.id, policy_number=f"MH-COOP-LIFE-KPG-{w.id:04d}", coverage_amount=500000.0, status="ACTIVE"))
        db.add(TrainingRecord(worker_id=w.id, title="Cooperative Workplace & Safety Standards", trainer_or_coop="Kopargaon Labour Council", status="COMPLETED"))

    db.commit()

    print("Seeding Sample Completed Booking, Invoice and Rating...")
    w_ramesh = worker_records[0] # Ramesh Jadhav
    sample_srv = db.query(Service).filter(Service.name == "Pipe Leakage & Tap Repair").first()

    bk1 = Booking(
        booking_ref="BK-20261001-KPG891",
        customer_id=customer_user.id,
        worker_id=w_ramesh.id,
        service_id=sample_srv.id,
        status=BookingStatus.RATED,
        is_emergency=False,
        address="Flat 204, Shanti Heights, Near Shivaji Chowk, Kopargaon",
        city="Kopargaon",
        district="Ahmednagar",
        pincode="423601",
        lat=19.8917,
        lon=74.4795,
        booking_date="2026-10-01",
        time_slot="11:00 AM - 12:00 PM",
        scheduled_time=datetime.now(timezone.utc) - timedelta(days=7),
        problem_description="Kitchen pipe leakage under sink",
        urgency="Normal",
        match_score=94.5,
        match_explanation="Skill: 100%, Avail: 100%, Dist: 2.5km (88%), Rel: 96%, Rating: 98%, Fair: 88% => Final: 94.5%",
        labour_charge=350.0,
        material_charge=50.0,
        total_amount=400.0,
        coop_fee=20.0,
        worker_earnings=380.0
    )
    db.add(bk1)
    db.commit()

    pmt1 = Payment(
        booking_id=bk1.id,
        customer_id=customer_user.id,
        worker_id=w_ramesh.id,
        amount=400.0,
        coop_fee=20.0,
        worker_payout=380.0,
        method="UPI",
        status=PaymentStatus.SUCCESS,
        transaction_ref="TXN_UPI_20261001_KPG912",
        paid_at=datetime.now(timezone.utc) - timedelta(days=7)
    )
    db.add(pmt1)

    inv1 = Invoice(
        invoice_number="INV-2026-00001",
        booking_id=bk1.id,
        customer_name="Pooja Sharma",
        worker_name="Ramesh Jadhav",
        coop_name="Shramik Sahakari Labour Cooperative Federation",
        service_name="Pipe Leakage & Tap Repair",
        labour_charge=350.0,
        material_charge=50.0,
        coop_fee=20.0,
        worker_earnings=380.0,
        total_amount=400.0,
        payment_method="UPI",
        transaction_ref="TXN_UPI_20261001_KPG912",
        issue_date=datetime.now(timezone.utc) - timedelta(days=7)
    )
    db.add(inv1)

    rt1 = Rating(
        booking_id=bk1.id,
        customer_id=customer_user.id,
        worker_id=w_ramesh.id,
        score=5,
        feedback="Excellent service by cooperative plumber! Prompt arrival in Kopargaon and clean repair work."
    )
    db.add(rt1)
    db.commit()

    print("Seeding Historical Booking Demand Data for Kopargaon / Ahmednagar...")
    today = datetime.now(timezone.utc)
    for day_offset in range(35, 0, -1):
        dt = today - timedelta(days=day_offset)
        is_weekend = dt.weekday() in [5, 6]
        
        # Plumbing
        base_p = 22 + (8 if is_weekend else 0) + (day_offset % 4)
        db.add(DemandData(
            service_category="Plumbing",
            district="Ahmednagar",
            date=dt,
            number_of_requests=base_p,
            emergency_requests=3 if is_weekend else 1,
            available_workers=3
        ))

        # Electrical
        base_e = 16 + (6 if is_weekend else 0)
        db.add(DemandData(
            service_category="Electrical",
            district="Ahmednagar",
            date=dt,
            number_of_requests=base_e,
            emergency_requests=2,
            available_workers=2
        ))

    db.commit()
    print("Database seeding completed with Kopargaon 20 KM dataset successfully!")
    db.close()

if __name__ == "__main__":
    run_seed()
