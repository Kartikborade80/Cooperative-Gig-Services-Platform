from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.core.config import settings
from app.core.database import engine, Base
from app.models import models
from app.api import (
    auth, workers, cooperatives, services, 
    matching, bookings, payments, invoices, 
    ratings, welfare, demand, complaints, notifications
)

# Ensure tables exist
Base.metadata.create_all(bind=engine)

app = FastAPI(
    title=settings.PROJECT_NAME,
    description="Fair Work. Trusted Services. Stronger Cooperatives. AI-powered Cooperative Gig Platform.",
    version="1.0.0",
    docs_url="/docs",
    redoc_url="/redoc"
)

# CORS Middleware
origins = settings.cors_origins or ["*"]
app.add_middleware(
    CORSMiddleware,
    allow_origins=origins if origins != ["*"] else ["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Register Routers
app.include_router(auth.router, prefix="/api")
app.include_router(workers.router, prefix="/api")
app.include_router(cooperatives.router, prefix="/api")
app.include_router(services.router, prefix="/api")
app.include_router(matching.router, prefix="/api")
app.include_router(bookings.router, prefix="/api")
app.include_router(payments.router, prefix="/api")
app.include_router(invoices.router, prefix="/api")
app.include_router(ratings.router, prefix="/api")
app.include_router(welfare.router, prefix="/api")
app.include_router(demand.router, prefix="/api")
app.include_router(complaints.router, prefix="/api")
app.include_router(notifications.router, prefix="/api")

@app.get("/")
def root():
    return {
        "platform": settings.PROJECT_NAME,
        "tagline": "Fair Work. Trusted Services. Stronger Cooperatives.",
        "status": "operational",
        "docs": "/docs"
    }

@app.get("/health")
def healthcheck():
    return {"status": "healthy"}
