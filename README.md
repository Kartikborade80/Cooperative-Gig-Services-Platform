# Cooperative Gig Services Platform
> **"Fair Work. Trusted Services. Stronger Cooperatives."**

An AI-powered digital platform that connects households and institutions with verified skilled workers belonging to Labour Cooperative Societies. Built with **FastAPI**, **React**, **SQLAlchemy**, **Scikit-learn**, and **OpenStreetMap (Leaflet)**.

---

## 🌟 Core Vision & Problem Solved

Traditional gig platforms extract 20%–30% commissions from informal workers, enforce opaque ratings-based algorithmic control, and offer zero collective social security.

The **Cooperative Gig Services Platform** addresses both sides:
1. **Customer Side:** Instant access to verified, skilled, trustworthy, nearby workers with transparent pricing, 1-click emergency dispatch, AI-powered problem diagnosis, and verified tax invoicing.
2. **Cooperative Side:** Transparent digital management for Labour Cooperative Societies to verify workers, manage welfare funds, eliminate algorithmic monopolies via fair rotation, collect a nominal 5% operations/welfare fee, and predict future demand with machine learning.

---

## 🏗️ System Architecture

```
                          ┌────────────────────────────────────────────────────────┐
                          │         React Frontend (Vite + Modern UI + i18n)       │
                          │   (Customer Portal | Worker Portal | Admin Portal)    │
                          └───────────────────────────┬────────────────────────────┘
                                                      │ REST APIs / JWT Auth
                                                      ▼
┌──────────────────────────────────────────────────────────────────────────────────────────────────┐
│                                   FastAPI Application Core                                       │
│                                                                                                  │
│  ┌─────────────────────────┐  ┌─────────────────────────┐  ┌──────────────────────────────────┐  │
│  │       API Routers       │  │    Business Services    │  │          AI / ML Engines         │  │
│  │  • /api/auth            │  │  • BookingWorkflowSvc   │  │  • AI Problem Classifier         │  │
│  │  • /api/workers         │  │  • PaymentService (Mock)│  │    (Intent & Skill Extraction)   │  │
│  │  • /api/bookings        │  │  • InvoiceService       │  │  • FairWorkerMatchingEngine      │  │
│  │  • /api/matching        │  │  • WelfareService       │  │    (6-Factor Multi-Scoring)      │  │
│  │  • /api/payments        │  │  • VerificationService  │  │  • DemandForecastingEngine       │  │
│  │  • /api/demand          │  │  • NotificationService  │  │    (Scikit-Learn Ridge Model)    │  │
│  │  • /api/welfare         │  │  • AuditLogService      │  │  • WorkforceAllocationEngine     │  │
│  └────────────┬────────────┘  └────────────┬────────────┘  └────────────────┬─────────────────┘  │
│               └────────────────────────────┼────────────────────────────────┘                    │
│                                            ▼                                                     │
│                                SQLAlchemy ORM & Repositories                                      │
└────────────────────────────────────────────┬─────────────────────────────────────────────────────┘
                                             │
                        ┌────────────────────┴────────────────────┐
                        ▼                                         ▼
            PostgreSQL (Production)                   SQLite (Local Zero-Config Dev)
```

---

## 👥 Role-Based Access Control (RBAC) & Test Credentials

The platform features real authentication with salted bcrypt password hashing and role-governed JWT tokens.

| Role | Demo Email | Demo Password | Persona / Scope |
|---|---|---|---|
| **Customer** | `customer@demo.com` | `Demo@123` | Pooja Sharma (Household Customer, Model Colony, Pune) |
| **Worker** | `worker@demo.com` | `Demo@123` | Ramesh Jadhav (Certified Master Plumber, Kothrud, Pune) |
| **Cooperative Admin** | `admin@demo.com` | `Demo@123` | Sunil Deshmukh (Secretary, Shramik Sahakari Federation) |
| **Super Admin** | `superadmin@demo.com` | `Demo@123` | State Registrar (State Cooperative Oversight & System Audit) |

*Note: 1-Click quick login buttons are integrated directly into the application navbar for effortless demonstration.*

---

## 🧠 AI & Machine Learning Modules

### 1. Natural Language AI Service Assistant
- **Endpoint:** `POST /api/matching/ai-assistant`
- **Engine:** `backend/app/ml/ai_service_assistant.py`
- **Functionality:** Customers describe home problems in plain natural language (e.g. *"My kitchen pipe is leaking severely and water is spilling everywhere"*). The NLP classifier parses problem category (`Plumbing`), identifies urgency level (`Medium` or `High`), selects the required skill (`Plumbing`), and automatically suggests candidate workers.

### 2. Fair Worker Matching Engine
- **Engine:** `backend/app/ml/matching_engine.py`
- **Algorithm:** Multi-factor weighted composite scoring:
  $$\text{Final Score} = 0.30 \times \text{Skill} + 0.20 \times \text{Availability} + 0.15 \times \text{Distance} + 0.15 \times \text{Reliability} + 0.10 \times \text{Rating} + 0.10 \times \text{Fairness}$$
- **Fairness Rotation Factor:** Inverse workload function penalizing work monopolization and boosting qualified workers with fewer recent assignments.
- **Auditable Breakdown:** Displayed in the UI with separate score meters for full transparency.

### 3. AI Demand Forecasting & Workforce Allocation
- **Endpoint:** `GET /api/demand/forecast`
- **Engine:** `backend/app/ml/demand_forecasting.py`
- **ML Model:** Scikit-Learn `Ridge` regression trained on historical daily demand, emergency callout ratios, day of week, and seasonality.
- **Shortage Alerts:** Compares 7-day predicted job volume against available active workers. When predicted volume exceeds workforce supply, a **WORKER SHORTAGE DETECTED** alarm is triggered.
- **Workforce Allocation Recommendations:** Generates actionable mobilization recommendations (e.g., *"Mobilize 12 certified plumbers from neighboring cooperative units"*), allowing Cooperative Admins to **Approve** or **Reject** recommendations with state persistence in the database.

---

## 💰 Payment & Invoicing Architecture

- **Simulated UPI Gateway:** Interactive payment modal calculating:
  - **Worker Direct Payout (95%)**
  - **Cooperative Welfare Contribution (5%)**
- **Duplicate Prevention:** Backend guarantees idempotent payments per booking reference.
- **Automatic Invoice Generation:** Generates official itemized tax invoice (`INV-2026-XXXXX`) detailing labour charge, material costs, cooperative contribution, worker payout, transaction ref, and print/download capability.

---

## 🌐 Multilingual Support (i18n)

The interface supports instantaneous language switching without reloading:
- **English (EN)**
- **हिंदी (Hindi)**
- **मराठी (Marathi)**

---

## 🚀 Setup & Execution Guide

### Prerequisites
- Python 3.10+ (Tested on Python 3.14.3)
- Node.js 18+ (Tested on Node.js v24.11.0)
- npm 9+

---

### Step 1: Backend Setup & Seed Data

1. Open a terminal in the project root:
   ```bash
   cd backend
   ```
2. Create and activate a Python virtual environment:
   ```bash
   # Windows PowerShell
   python -m venv venv
   .\venv\Scripts\Activate.ps1
   ```
3. Install dependencies:
   ```bash
   pip install -r requirements.txt
   ```
4. Seed the database with demo accounts, workers, services, and historical demand:
   ```bash
   python app/seed/seed_data.py
   ```
5. Run automated test suite:
   ```bash
   pytest -v tests/test_api.py
   ```
6. Start the FastAPI backend server:
   ```bash
   uvicorn app.main:app --reload --port 8000
   ```
   - Interactive Swagger API Documentation: [http://127.0.0.1:8000/docs](http://127.0.0.1:8000/docs)
   - ReDoc API Documentation: [http://127.0.0.1:8000/redoc](http://127.0.0.1:8000/redoc)

---

### Step 2: Frontend Setup

1. Open a second terminal:
   ```bash
   cd frontend
   ```
2. Install dependencies (if not already installed):
   ```bash
   npm install
   ```
3. Start the Vite React development server:
   ```bash
   npm run dev
   ```
4. Open the application in your browser:
   👉 **[http://localhost:5173](http://localhost:5173)**

---

## ⚙️ Environment Variables

### `.env` (Included in `backend/.env`)
```ini
PROJECT_NAME="Cooperative Gig Services Platform"
ENVIRONMENT="development"
DEBUG=True

# SQLite default for zero-setup demo
DATABASE_URL="sqlite:///./coop_gig.db"

# PostgreSQL production example:
# DATABASE_URL="postgresql+psycopg2://postgres:password@localhost:5432/coop_gig_db"

SECRET_KEY="cooperative-gig-platform-super-secure-production-secret-key-change-me"
ALGORITHM="HS256"
ACCESS_TOKEN_EXPIRE_MINUTES=1440

DEFAULT_COOP_NAME="Shramik Sahakari Labour Cooperative Federation"
COOP_COMMISSION_PERCENTAGE=5.0
WORKER_SHARE_PERCENTAGE=95.0

ALLOWED_ORIGINS="http://localhost:5173,http://127.0.0.1:5173,http://localhost:3000"
```

---

## 🧪 Automated Test Suite

Run all test cases verifying auth, verification, matching, booking state machine, payments, and forecasting:
```bash
cd backend
.\venv\Scripts\pytest -v tests/test_api.py
```
**Test Coverage Includes:**
- `test_healthcheck`: FastAPI operational status
- `test_login_demo_users`: JWT issuance for Customer, Worker, Admin
- `test_invalid_login`: 401 unauthorized rejection
- `test_ai_service_assistant`: NLP problem and skill classification
- `test_find_matching_workers`: 6-Factor multi-score evaluation
- `test_customer_booking_and_payment_flow`: Full lifecycle (Request -> Assigned -> Accepted -> On The Way -> Arrived -> Started -> Completed -> Mock UPI 95/5 Split -> Invoice Generation -> Rating Submission -> Duplicate Prevention)
- `test_demand_forecasting_and_recommendations`: ML model forecasting and shortage recommendation generation

---

## 🏛️ Cooperative Federation Profile
- **Federation:** Shramik Sahakari Labour Cooperative Federation
- **Registration No:** `MH/PUN/COOP/2022/4910`
- **Jurisdiction:** Pune & Mumbai Urban Districts, Maharashtra, India
- **Headquarters:** Sahakar Bhavan, Station Road, Shivajinagar, Pune 411005
- **Welfare & Health Cover:** ₹5,00,000 Group Accident & Health Cover with New India Assurance
