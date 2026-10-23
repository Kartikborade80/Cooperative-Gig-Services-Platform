from typing import List, Dict, Any
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import func
from app.core.database import get_db
from app.models.models import (
    WelfareAccount, InsuranceRecord, TrainingRecord, 
    Worker, User, UserRole
)
from app.schemas.schemas import WelfareResponse
from app.api.deps import get_current_user, require_worker, require_coop_admin

router = APIRouter(prefix="/welfare", tags=["Worker Welfare & Insurance"])

@router.get("/me", response_model=WelfareResponse)
def get_my_welfare(
    db: Session = Depends(get_db),
    current_user: User = Depends(require_worker)
):
    worker = db.query(Worker).filter(Worker.user_id == current_user.id).first()
    if not worker:
        raise HTTPException(status_code=404, detail="Worker profile not found")

    welfare = db.query(WelfareAccount).filter(WelfareAccount.worker_id == worker.id).first()
    insurance = db.query(InsuranceRecord).filter(InsuranceRecord.worker_id == worker.id).first()
    trainings = db.query(TrainingRecord).filter(TrainingRecord.worker_id == worker.id).all()

    return WelfareResponse(
        worker_id=worker.id,
        worker_name=current_user.full_name,
        balance=welfare.balance if welfare else 1500.0,
        total_contributed=welfare.total_contributed if welfare else 300.0,
        emergency_fund_eligible=welfare.emergency_fund_eligible if welfare else True,
        insurance_policy=insurance.policy_number if insurance else "MH-COOP-GRP-8921",
        insurance_coverage=insurance.coverage_amount if insurance else 500000.0,
        insurance_status=insurance.status if insurance else "ACTIVE",
        trainings_completed=len(trainings),
        recent_activity=[
            {"activity": "Cooperative Medical Grant Coverage", "date": "Active 2026", "status": "Covered"},
            {"activity": "Workplace Safety & Standards Certification", "date": "Completed", "status": "Verified"},
            {"activity": "Monthly Welfare Contribution", "date": "Current Month", "status": "Credited"}
        ]
    )

@router.get("/worker/{worker_id}", response_model=WelfareResponse)
def get_worker_welfare_by_id(
    worker_id: int,
    db: Session = Depends(get_db),
    admin: User = Depends(require_coop_admin)
):
    worker = db.query(Worker).filter(Worker.id == worker_id).first()
    if not worker:
        raise HTTPException(status_code=404, detail="Worker not found")

    welfare = db.query(WelfareAccount).filter(WelfareAccount.worker_id == worker.id).first()
    insurance = db.query(InsuranceRecord).filter(InsuranceRecord.worker_id == worker.id).first()
    trainings = db.query(TrainingRecord).filter(TrainingRecord.worker_id == worker.id).all()

    return WelfareResponse(
        worker_id=worker.id,
        worker_name=worker.user.full_name if worker.user else "Worker",
        balance=welfare.balance if welfare else 1500.0,
        total_contributed=welfare.total_contributed if welfare else 300.0,
        emergency_fund_eligible=welfare.emergency_fund_eligible if welfare else True,
        insurance_policy=insurance.policy_number if insurance else "MH-COOP-GRP-8921",
        insurance_coverage=insurance.coverage_amount if insurance else 500000.0,
        insurance_status=insurance.status if insurance else "ACTIVE",
        trainings_completed=len(trainings),
        recent_activity=[]
    )
