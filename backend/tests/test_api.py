import uuid
import pytest
from datetime import date, timedelta
from fastapi.testclient import TestClient
from app.main import app
from app.models.models import BookingStatus

client = TestClient(app)

# Unique suffix to avoid DB collision across test runs
_RUN_ID = uuid.uuid4().hex[:6]
CUSTOMER_EMAIL = f"test_cust_{_RUN_ID}@example.com"
CUSTOMER_PHONE = f"+91-98765{_RUN_ID[:5]}"
WORKER_EMAIL = f"test_worker_{_RUN_ID}@example.com"
WORKER_PHONE = f"+91-88765{_RUN_ID[:5]}"


# ─────────────────────────────────────────────
# BASIC HEALTH & AUTH
# ─────────────────────────────────────────────

def test_healthcheck():
    response = client.get("/health")
    assert response.status_code == 200
    assert response.json()["status"] == "healthy"


def test_login_demo_users_email_and_mobile():
    # Login by email
    res = client.post("/api/auth/login", json={"email": "customer@demo.com", "password": "Demo@123"})
    assert res.status_code == 200
    data = res.json()
    assert "access_token" in data
    assert data["role"] == "CUSTOMER"

    # Login by mobile number (using username field)
    res_mobile = client.post("/api/auth/login", json={"username": "+91-9890011223", "password": "Demo@123"})
    assert res_mobile.status_code == 200
    assert res_mobile.json()["role"] == "CUSTOMER"

    # Worker login
    res_worker = client.post("/api/auth/login", json={"email": "worker@demo.com", "password": "Demo@123"})
    assert res_worker.status_code == 200
    assert res_worker.json()["role"] == "WORKER"

    # Admin login
    res_admin = client.post("/api/auth/login", json={"email": "admin@demo.com", "password": "Demo@123"})
    assert res_admin.status_code == 200
    assert res_admin.json()["role"] == "COOPERATIVE_ADMIN"


def test_invalid_login():
    res = client.post("/api/auth/login", json={"email": "customer@demo.com", "password": "WrongPassword"})
    assert res.status_code == 401


# ─────────────────────────────────────────────
# REGISTRATION
# ─────────────────────────────────────────────

def test_customer_registration():
    reg_payload = {
        "full_name": "Test Customer Kopargaon",
        "email": CUSTOMER_EMAIL,
        "phone": CUSTOMER_PHONE,
        "password": "Password@123",
        "role": "CUSTOMER",
        "address": "Shivaji Chowk, Kopargaon",
        "city": "Kopargaon",
        "district": "Ahmednagar",
        "pincode": "423601",
        "preferred_language": "mr"
    }
    res = client.post("/api/auth/register", json=reg_payload)
    assert res.status_code == 200, f"Registration failed: {res.json()}"
    data = res.json()
    assert data["email"] == CUSTOMER_EMAIL
    assert data["role"] == "CUSTOMER"

    # Registered customer can login with mobile
    login_res = client.post("/api/auth/login", json={"username": CUSTOMER_PHONE, "password": "Password@123"})
    assert login_res.status_code == 200


def test_worker_registration_and_identity_verification():
    w_reg = {
        "full_name": "Anil Rathod",
        "email": WORKER_EMAIL,
        "phone": WORKER_PHONE,
        "password": "Password@123",
        "role": "WORKER",
        "address": "Station Road, Kopargaon",
        "city": "Kopargaon",
        "district": "Ahmednagar",
        "pincode": "423601",
        "skills": ["Plumbing", "Carpentry"],
        "experience_years": 4,
        "cooperative_id": 1
    }
    res = client.post("/api/auth/register", json=w_reg)
    assert res.status_code == 200, f"Worker registration failed: {res.json()}"

    # Login
    login_res = client.post("/api/auth/login", json={"email": WORKER_EMAIL, "password": "Password@123"})
    assert login_res.status_code == 200
    token = login_res.json()["access_token"]
    headers = {"Authorization": f"Bearer {token}"}

    # Worker profile - status should be PENDING initially
    me_worker = client.get("/api/workers/me", headers=headers)
    assert me_worker.status_code == 200
    w_profile = me_worker.json()
    assert w_profile["verification_status"] in ["PENDING", "UNDER_REVIEW"]

    # Submit Demo DigiLocker identity verification
    verify_res = client.post(
        "/api/workers/me/verify-identity",
        json={"aadhaar_last_four": "9812", "consent_granted": True, "use_digilocker_demo": True},
        headers=headers
    )
    assert verify_res.status_code == 200
    v_data = verify_res.json()
    assert v_data["identity_status"] in ["PENDING", "VERIFIED_DEMO"]
    assert v_data["worker_status"] == "UNDER_REVIEW"


# ─────────────────────────────────────────────
# AI SERVICE ASSISTANT
# ─────────────────────────────────────────────

def test_ai_service_assistant():
    res = client.post(
        "/api/matching/ai-assistant",
        json={"prompt": "My kitchen pipe is leaking severely and water is spilling everywhere"}
    )
    assert res.status_code == 200
    data = res.json()
    assert data["category"] == "Plumbing"
    assert "Plumbing" in data["required_skill"]
    assert data["urgency"] in ["Medium", "High"]


# ─────────────────────────────────────────────
# 20 KM RADIUS ENFORCEMENT
# ─────────────────────────────────────────────

def test_kopargaon_20km_radius_enforcement():
    # From Kopargaon center: should find workers within 20 KM
    res = client.get("/api/matching/find-workers?service_id=1&lat=19.8917&lon=74.4795")
    assert res.status_code == 200
    candidates = res.json()
    assert len(candidates) > 0, "Expected workers within 20 KM of Kopargaon"

    for cand in candidates:
        # distance_km is at the top level of MatchedWorkerResponse
        assert cand["distance_km"] <= 20.0, f"Worker {cand['worker']['full_name']} is outside 20 KM!"
        assert "consumer_badge" in cand
        assert cand["consumer_badge"] in ["Best Match", "Nearest", "Top Rated", "Available Now"]
        # Deepak Shinde at ~28.5 KM must NEVER appear
        assert "Deepak Shinde" not in cand["worker"]["full_name"]

    # From Pune (~150 KM away): all workers are beyond 20 KM → empty result
    far_res = client.get("/api/matching/find-workers?service_id=1&lat=18.5204&lon=73.8567")
    assert far_res.status_code == 200
    assert len(far_res.json()) == 0, "Workers outside 20 KM radius should not be returned"


# ─────────────────────────────────────────────
# TIME SLOTS & DOUBLE-BOOKING PREVENTION
# ─────────────────────────────────────────────

def test_worker_available_slots_and_booking_prevention():
    booking_date = (date.today() + timedelta(days=2)).isoformat()

    # Get available slots for worker 1
    slots_res = client.get(f"/api/workers/1/available-slots?date={booking_date}")
    assert slots_res.status_code == 200
    slots_data = slots_res.json()
    assert "available_slots" in slots_data
    assert len(slots_data["available_slots"]) > 0

    chosen_slot = slots_data["available_slots"][0]

    # Customer 1 books that slot
    cust1_login = client.post("/api/auth/login", json={"email": "customer@demo.com", "password": "Demo@123"})
    cust1_token = cust1_login.json()["access_token"]
    cust1_headers = {"Authorization": f"Bearer {cust1_token}"}

    booking_payload = {
        "service_id": 1,
        "worker_id": 1,
        "address": "Kopargaon Bazaar Road, Kopargaon",
        "city": "Kopargaon",
        "district": "Ahmednagar",
        "pincode": "423601",
        "lat": 19.8917,
        "lon": 74.4795,
        "problem_description": "Water leaking from tap in kitchen",
        "scheduled_date": booking_date,
        "time_slot": chosen_slot
    }

    b1_res = client.post("/api/bookings/", json=booking_payload, headers=cust1_headers)
    assert b1_res.status_code == 200, f"Booking failed: {b1_res.json()}"
    booking1 = b1_res.json()
    assert booking1["scheduled_date"] == booking_date
    assert booking1["time_slot"] == chosen_slot

    # Slot now shows as booked
    slots_after_res = client.get(f"/api/workers/1/available-slots?date={booking_date}")
    slots_after = slots_after_res.json()
    assert chosen_slot not in slots_after["available_slots"]
    assert chosen_slot in slots_after["booked_slots"]

    # Customer 2 tries the SAME worker, SAME date, SAME slot → must get 400
    cust2_login = client.post("/api/auth/login", json={"username": CUSTOMER_PHONE, "password": "Password@123"})
    cust2_token = cust2_login.json()["access_token"]
    cust2_headers = {"Authorization": f"Bearer {cust2_token}"}

    b2_conflict_res = client.post("/api/bookings/", json=booking_payload, headers=cust2_headers)
    assert b2_conflict_res.status_code == 400
    assert "already booked" in b2_conflict_res.json()["detail"].lower()


# ─────────────────────────────────────────────
# FULL SERVICE LIFECYCLE: booking → payment → invoice → rating
# ─────────────────────────────────────────────

def test_full_service_lifecycle_payment_invoice_rating():
    # 1. Login
    cust_res = client.post("/api/auth/login", json={"email": "customer@demo.com", "password": "Demo@123"})
    cust_token = cust_res.json()["access_token"]
    cust_headers = {"Authorization": f"Bearer {cust_token}"}

    w_res = client.post("/api/auth/login", json={"email": "worker@demo.com", "password": "Demo@123"})
    w_token = w_res.json()["access_token"]
    w_headers = {"Authorization": f"Bearer {w_token}"}

    # 2. Book for day+3 in an open slot
    b_date = (date.today() + timedelta(days=3)).isoformat()
    slots_res = client.get(f"/api/workers/1/available-slots?date={b_date}")
    available_slots = slots_res.json()["available_slots"]
    assert len(available_slots) > 0, f"No available slots for worker 1 on {b_date}"
    selected_slot = available_slots[0]

    b_res = client.post("/api/bookings/", json={
        "service_id": 1,
        "worker_id": 1,
        "address": "Tilak Road, Kopargaon",
        "city": "Kopargaon",
        "district": "Ahmednagar",
        "pincode": "423601",
        "lat": 19.8920,
        "lon": 74.4780,
        "problem_description": "Drain pipe unclogging required",
        "scheduled_date": b_date,
        "time_slot": selected_slot
    }, headers=cust_headers)
    assert b_res.status_code == 200, f"Booking failed: {b_res.json()}"
    b_id = b_res.json()["id"]

    # 3. State machine: ACCEPTED → ON_THE_WAY → ARRIVED → SERVICE_STARTED → COMPLETED
    for new_status in ["ACCEPTED", "ON_THE_WAY", "ARRIVED", "SERVICE_STARTED"]:
        step = client.patch(f"/api/bookings/{b_id}/status", json={"status": new_status}, headers=w_headers)
        assert step.status_code == 200, f"Status {new_status} failed: {step.json()}"
        assert step.json()["status"] == new_status

    completed = client.patch(f"/api/bookings/{b_id}/status", json={
        "status": "COMPLETED",
        "labour_charge": 400.0,
        "material_charge": 100.0
    }, headers=w_headers)
    assert completed.status_code == 200
    assert completed.json()["status"] == "COMPLETED"
    assert completed.json()["total_amount"] == 500.0

    # 4. Rating before payment must fail
    premature_rate = client.post(
        "/api/ratings/",
        json={"booking_id": b_id, "score": 5},
        headers=cust_headers
    )
    assert premature_rate.status_code == 400

    # 5. UPI Payment (₹500 → Worker 95%=₹475, Coop 5%=₹25)
    pay_res = client.post("/api/payments/process", json={
        "booking_id": b_id,
        "method": "UPI",
        "upi_id": "customer@oksbi"
    }, headers=cust_headers)
    assert pay_res.status_code == 200
    pay_data = pay_res.json()
    assert pay_data["status"] == "SUCCESS"
    assert pay_data["amount"] == 500.0
    assert pay_data["worker_payout"] == 475.0
    assert pay_data["coop_fee"] == 25.0

    # 6. Duplicate payment must fail
    dup_pay = client.post("/api/payments/process", json={
        "booking_id": b_id, "method": "UPI"
    }, headers=cust_headers)
    assert dup_pay.status_code == 400

    # 7. Invoice
    inv_res = client.get(f"/api/invoices/{b_id}", headers=cust_headers)
    assert inv_res.status_code == 200
    inv = inv_res.json()
    assert inv["total_amount"] == 500.0
    assert inv["worker_earnings"] == 475.0
    assert inv["cooperative_contribution"] == 25.0
    assert "invoice_number" in inv

    # 8. Rating
    rate_res = client.post("/api/ratings/", json={
        "booking_id": b_id,
        "score": 5,
        "feedback": "Punctual cooperative worker, excellent repair!"
    }, headers=cust_headers)
    assert rate_res.status_code == 200
    assert rate_res.json()["score"] == 5

    # 9. Duplicate rating prevention
    dup_rate = client.post("/api/ratings/", json={"booking_id": b_id, "score": 4}, headers=cust_headers)
    assert dup_rate.status_code == 400


# ─────────────────────────────────────────────
# DEMAND FORECASTING
# ─────────────────────────────────────────────

def test_demand_forecasting_and_recommendations():
    admin_login = client.post("/api/auth/login", json={"email": "admin@demo.com", "password": "Demo@123"})
    admin_token = admin_login.json()["access_token"]
    headers = {"Authorization": f"Bearer {admin_token}"}

    forecast_res = client.get(
        "/api/demand/forecast?service_category=Plumbing&district=Ahmednagar",
        headers=headers
    )
    assert forecast_res.status_code == 200
    forecasts = forecast_res.json()
    assert len(forecasts) == 7
    assert forecasts[0]["predicted_demand"] > 0

    rec_res = client.get("/api/demand/recommendations", headers=headers)
    assert rec_res.status_code == 200
    assert isinstance(rec_res.json(), list)
