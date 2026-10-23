import pytest
from datetime import date, timedelta
from fastapi.testclient import TestClient
from app.main import app

client = TestClient(app)

def test_category_specific_worker_search():
    """
    Requirements 1, 2, 5:
    When a customer selects Plumbing -> ONLY workers who have Plumbing appear.
    When Electrical is selected -> ONLY Electrical workers appear.
    When Cleaning is selected -> ONLY Cleaning workers appear.
    All must be within 20 KM.
    """
    # 1. Search Plumbing
    res_plumbing = client.get("/api/workers/?category=Plumbing&max_radius_km=20")
    assert res_plumbing.status_code == 200
    plumbers = res_plumbing.json()
    assert len(plumbers) > 0
    for p in plumbers:
        assert p["distance_km"] <= 20.0
        # Category or skills must match Plumbing
        cat_matches = any("plumb" in c.lower() for c in p["service_categories"])
        skill_matches = any("plumb" in s["skill_name"].lower() for s in p["skills"])
        assert cat_matches or skill_matches, f"Worker {p['full_name']} is not a plumber!"
        # Should not be Santosh Shinde (Electrician) or Sunita More (Cleaning)
        assert "Santosh Shinde" not in p["full_name"]
        assert "Sunita More" not in p["full_name"]

    # 2. Search Electrical
    res_elec = client.get("/api/workers/?category=Electrical&max_radius_km=20")
    assert res_elec.status_code == 200
    electricians = res_elec.json()
    assert len(electricians) > 0
    for e in electricians:
        assert e["distance_km"] <= 20.0
        cat_matches = any("electr" in c.lower() for c in e["service_categories"])
        skill_matches = any("electr" in s["skill_name"].lower() for s in e["skills"])
        assert cat_matches or skill_matches
        assert "Ramesh Jadhav" not in e["full_name"]
        assert "Sunita More" not in e["full_name"]

    # 3. Search Cleaning
    res_clean = client.get("/api/workers/?category=Cleaning&max_radius_km=20")
    assert res_clean.status_code == 200
    cleaners = res_clean.json()
    assert len(cleaners) > 0
    for c in cleaners:
        assert c["distance_km"] <= 20.0
        cat_matches = any("clean" in cat.lower() for cat in c["service_categories"])
        skill_matches = any("clean" in s["skill_name"].lower() for s in c["skills"])
        assert cat_matches or skill_matches
        assert "Ramesh Jadhav" not in c["full_name"]
        assert "Santosh Shinde" not in c["full_name"]


def test_otp_flow_and_login():
    """
    Requirements 18, 19:
    Send OTP -> Verify OTP -> Login with OTP.
    """
    email = "customer@demo.com"
    # Send OTP
    send_res = client.post("/api/auth/send-otp", json={"email": email, "purpose": "LOGIN"})
    assert send_res.status_code == 200
    data = send_res.json()
    assert "debug_otp" in data
    otp = data["debug_otp"]

    # Verify OTP
    verify_res = client.post("/api/auth/verify-otp", json={"email": email, "otp_code": otp, "purpose": "LOGIN"})
    assert verify_res.status_code == 200
    assert verify_res.json()["verified"] is True

    # Send new OTP for login
    send_login = client.post("/api/auth/send-otp", json={"email": email, "purpose": "LOGIN"})
    otp_login = send_login.json()["debug_otp"]

    login_res = client.post("/api/auth/login-otp", json={"email": email, "otp_code": otp_login})
    assert login_res.status_code == 200
    assert "access_token" in login_res.json()


def test_customer_profile_and_addresses():
    """
    Requirements 15, 16, 17:
    Customer Profile, Default Booking Address, Alternative Contact.
    """
    login_res = client.post("/api/auth/login", json={"email": "customer@demo.com", "password": "Demo@123"})
    token = login_res.json()["access_token"]
    headers = {"Authorization": f"Bearer {token}"}

    # Update profile with alternative contact number
    update_res = client.put("/api/auth/profile", json={
        "alt_phone": "+91-9890099887",
        "city": "Kopargaon"
    }, headers=headers)
    assert update_res.status_code == 200
    assert update_res.json()["alt_phone"] == "+91-9890099887"

    # Add a saved address
    addr_res = client.post("/api/auth/addresses", json={
        "title": "Office",
        "address_line": "Near Bus Stand, Station Road, Kopargaon",
        "city": "Kopargaon",
        "pincode": "423601",
        "is_default": False
    }, headers=headers)
    assert addr_res.status_code == 200
    addr_id = addr_res.json()["id"]

    # Set as default
    def_res = client.put(f"/api/auth/addresses/{addr_id}/default", headers=headers)
    assert def_res.status_code == 200
    assert def_res.json()["is_default"] is True


def test_worker_quote_and_contact_privacy():
    """
    Requirements 8, 10, 13, 14, 20:
    Booking request -> worker proposes price quote -> customer accepts ->
    customer phone becomes visible only after acceptance -> in-app messaging.
    """
    # Customer logs in
    c_res = client.post("/api/auth/login", json={"email": "customer@demo.com", "password": "Demo@123"})
    c_token = c_res.json()["access_token"]
    c_headers = {"Authorization": f"Bearer {c_token}"}

    # Worker logs in
    w_res = client.post("/api/auth/login", json={"email": "worker@demo.com", "password": "Demo@123"})
    w_token = w_res.json()["access_token"]
    w_headers = {"Authorization": f"Bearer {w_token}"}

    # 1. Create booking with Ramesh Jadhav (worker_id 1)
    import random
    b_date = (date.today() + timedelta(days=random.randint(15, 90))).isoformat()
    book_res = client.post("/api/bookings/", json={
        "service_id": 1,
        "worker_id": 1,
        "address": "Shivaji Chowk, Kopargaon",
        "scheduled_date": b_date,
        "time_slot": "04:00 PM - 05:00 PM",
        "problem_description": "Water pipe burst"
    }, headers=c_headers)
    assert book_res.status_code == 200
    booking = book_res.json()
    b_id = booking["id"]
    assert booking["status"] == "WORKER_ASSIGNED"

    # Worker views booking BEFORE acceptance: customer phone must NOT be exposed!
    w_view = client.get(f"/api/bookings/{b_id}", headers=w_headers)
    assert w_view.status_code == 200
    assert w_view.json()["customer_phone"] is None, "Customer phone must NOT be visible before acceptance!"

    # 2. Worker proposes price ₹550
    quote_res = client.post(f"/api/bookings/{b_id}/propose-price", json={
        "booking_id": b_id,
        "worker_proposed_price": 550.0,
        "notes": "Emergency pipe fittings required"
    }, headers=w_headers)
    assert quote_res.status_code == 200
    assert quote_res.json()["status"] == "PRICE_PROPOSED"
    assert quote_res.json()["worker_proposed_price"] == 550.0

    # 3. Customer accepts proposed price
    accept_res = client.post(f"/api/bookings/{b_id}/respond-price", json={
        "action": "ACCEPT"
    }, headers=c_headers)
    assert accept_res.status_code == 200
    assert accept_res.json()["status"] == "ACCEPTED"
    assert accept_res.json()["final_agreed_price"] == 550.0

    # Worker views booking AFTER acceptance: customer phone IS NOW VISIBLE!
    w_view_after = client.get(f"/api/bookings/{b_id}", headers=w_headers)
    assert w_view_after.status_code == 200
    assert w_view_after.json()["customer_phone"] is not None, "Customer phone should be visible after acceptance"

    # 4. In-app messaging test
    msg_res = client.post(f"/api/bookings/{b_id}/messages", json={
        "message": "Hello, I will be reaching your location shortly."
    }, headers=w_headers)
    assert msg_res.status_code == 200
    assert msg_res.json()["message"] == "Hello, I will be reaching your location shortly."

    msgs_res = client.get(f"/api/bookings/{b_id}/messages", headers=c_headers)
    assert msgs_res.status_code == 200
    assert len(msgs_res.json()) >= 1


def test_invoice_pdf_download():
    """
    Requirement 25:
    Invoice PDF download must actually generate and return a real PDF file.
    """
    c_res = client.post("/api/auth/login", json={"email": "customer@demo.com", "password": "Demo@123"})
    c_token = c_res.json()["access_token"]
    c_headers = {"Authorization": f"Bearer {c_token}"}

    # Booking 1 is completed/rated in seed data
    pdf_res = client.get("/api/invoices/1/pdf", headers=c_headers)
    assert pdf_res.status_code == 200
    assert pdf_res.headers["content-type"] == "application/pdf"
    assert "attachment; filename=" in pdf_res.headers["content-disposition"]
    # PDF files start with %PDF-
    assert pdf_res.content.startswith(b"%PDF-")


def test_forgot_password_otp_flow():
    """
    Forgot Password Flow:
    1. Register user
    2. Request OTP for FORGOT_PASSWORD
    3. Reset password using OTP
    4. Login with newly reset password
    """
    import uuid
    uid = uuid.uuid4().hex[:6]
    email = f"reset_test_{uid}@example.com"

    # Register user first
    reg = client.post("/api/auth/register", json={
        "email": email,
        "password": "InitialPassword@123",
        "full_name": "Reset Test User"
    })
    assert reg.status_code == 200

    send_res = client.post("/api/auth/send-otp", json={"email": email, "purpose": "FORGOT_PASSWORD"})
    assert send_res.status_code == 200
    otp = send_res.json()["debug_otp"]

    reset_res = client.post("/api/auth/reset-password", json={
        "email": email,
        "otp_code": otp,
        "new_password": "NewSecretPassword@123"
    })
    assert reset_res.status_code == 200
    assert "successfully reset" in reset_res.json()["message"]

    # Login with new password
    new_login = client.post("/api/auth/login", json={"email": email, "password": "NewSecretPassword@123"})
    assert new_login.status_code == 200
    assert "access_token" in new_login.json()


def test_worker_registration_careers_flow():
    """
    Worker Registration via Careers Section:
    1. Worker sends OTP to email
    2. Registers with Email, Password, OTP, Mobile, Personal Details, Service Category, Address, Location, Aadhaar
    3. Account created as WORKER with PENDING official verification
    4. Worker is categorized under selected category
    """
    import uuid
    uid = uuid.uuid4().hex[:6]
    w_email = f"careers_worker_{uid}@example.com"
    w_phone = f"+91-7788{uid[:6]}"

    # Send OTP
    send_res = client.post("/api/auth/send-otp", json={"email": w_email, "purpose": "REGISTRATION"})
    assert send_res.status_code == 200
    otp = send_res.json()["debug_otp"]

    # Register worker
    reg_res = client.post("/api/auth/register-worker", json={
        "email": w_email,
        "password": "WorkerSecurePassword@123",
        "otp_code": otp,
        "full_name": f"Ganesh Shinde {uid}",
        "phone": w_phone,
        "service_categories": ["Plumbing", "Carpentry"],
        "skills": ["Pipe Fitting"],
        "experience_years": 5.0,
        "bio": "Experienced certified plumber & carpenter in Kopargaon.",
        "address": "Bhadgaon Road, Kopargaon",
        "city": "Kopargaon",
        "district": "Ahmednagar",
        "pincode": "423601",
        "service_area": "Kopargaon North",
        "lat": 19.8917,
        "lon": 74.4795,
        "document_type": "AADHAAR",
        "document_number": "123456789012"
    })
    assert reg_res.status_code == 200
    w_data = reg_res.json()
    assert "access_token" in w_data
    assert w_data["role"] == "WORKER"

    # Worker can log in
    w_login = client.post("/api/auth/login", json={"email": w_email, "password": "WorkerSecurePassword@123"})
    assert w_login.status_code == 200


def test_change_password_and_instant_subscription():
    """
    Customer Profile:
    - Change Password
    - Subscription for instant-service-based system toggle
    """
    c_res = client.post("/api/auth/login", json={"email": "customer@demo.com", "password": "Demo@123"})
    token = c_res.json()["access_token"]
    headers = {"Authorization": f"Bearer {token}"}

    # Toggle instant subscription
    sub_res = client.post("/api/auth/subscription/toggle?enable=true", headers=headers)
    assert sub_res.status_code == 200
    sub_data = sub_res.json()
    assert sub_data["has_instant_subscription"] is True
    assert sub_data["instant_subscription_plan"] == "INSTANT_PRIORITY"

    # Change password
    cp_res = client.post("/api/auth/change-password", json={
        "current_password": "Demo@123",
        "new_password": "Demo@Updated123"
    }, headers=headers)
    assert cp_res.status_code == 200

    # Test login with updated password
    up_login = client.post("/api/auth/login", json={"email": "customer@demo.com", "password": "Demo@Updated123"})
    assert up_login.status_code == 200

    # Revert password back
    up_token = up_login.json()["access_token"]
    up_headers = {"Authorization": f"Bearer {up_token}"}
    client.post("/api/auth/change-password", json={
        "current_password": "Demo@Updated123",
        "new_password": "Demo@123"
    }, headers=up_headers)

