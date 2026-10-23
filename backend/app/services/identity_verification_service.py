import uuid
from datetime import datetime, timezone
from typing import Dict, Any, Optional
from sqlalchemy.orm import Session
from fastapi import HTTPException
from app.models.models import Worker, AuditLog, User

class IdentityVerificationAdapter:
    """Abstract interface for Identity Verification (DigiLocker / Aadhaar / Gov IDs)"""
    def initiate_verification(self, worker_id: int) -> Dict[str, Any]:
        raise NotImplementedError

    def verify_document(self, worker: Worker, doc_type: str, doc_number: str) -> Dict[str, Any]:
        raise NotImplementedError


import os

class DemoIdentityVerificationAdapter(IdentityVerificationAdapter):
    """
    Identity Verification Adapter when official UIDAI / DigiLocker API is not configured.
    Accurately indicates that official verification is pending, rather than faking verification.
    """
    def verify_document(self, db: Session, worker: Worker, doc_type: str, doc_number: str, user: User) -> Dict[str, Any]:
        clean_num = doc_number.strip().replace(" ", "").replace("-", "")
        if len(clean_num) < 4:
            raise HTTPException(status_code=400, detail="Invalid identity document number provided.")

        ref_id = f"ID-REC-{datetime.now(timezone.utc).strftime('%Y%m')}-{uuid.uuid4().hex[:6].upper()}"
        
        # When official API is unconfigured, identity status is PENDING verification
        worker.identity_status = "PENDING"
        worker.identity_ref = ref_id
        
        # Profile is placed UNDER_REVIEW for Cooperative Society verification
        if worker.verification_status in ["PENDING", "REJECTED"]:
            worker.verification_status = "UNDER_REVIEW"

        audit = AuditLog(
            user_id=user.id,
            action="IDENTITY_DOC_SUBMITTED",
            entity_name="Worker",
            entity_id=str(worker.id),
            details=f"Document {doc_type} submitted (ref: {ref_id}). Official API verification pending."
        )
        db.add(audit)
        db.commit()
        db.refresh(worker)

        return {
            "status": "PENDING",
            "mode": "OFFICIAL_INTEGRATION_PENDING",
            "identity_status": worker.identity_status,
            "verification_status": worker.verification_status,
            "reference_id": ref_id,
            "official_api_configured": False,
            "message": "Identity document recorded. Official DigiLocker/UIDAI API credentials are not configured in system environment. Worker identity verification is PENDING cooperative review."
        }



class DigiLockerProductionAdapter(IdentityVerificationAdapter):
    """
    Production DigiLocker Architecture Adapter.
    Ready for DigiLocker OAuth2 consent and XML verification once production credentials are configured.
    """
    def __init__(self, client_id: Optional[str] = None, client_secret: Optional[str] = None, redirect_uri: Optional[str] = None):
        self.client_id = client_id or os.getenv("DIGILOCKER_CLIENT_ID", "").strip()
        self.client_secret = client_secret or os.getenv("DIGILOCKER_CLIENT_SECRET", "").strip()
        self.redirect_uri = redirect_uri or os.getenv("DIGILOCKER_REDIRECT_URI", "").strip()

    def is_configured(self) -> bool:
        return bool(self.client_id and self.client_secret)

    def initiate_verification(self, worker_id: int) -> Dict[str, Any]:
        if not self.is_configured():
            return {
                "configured": False,
                "message": "Production DigiLocker credentials not yet provided in .env. Using Demo Identity Verification adapter."
            }
        # Production OAuth redirect URL generation would occur here
        return {
            "configured": True,
            "oauth_url": f"https://api.digitallocker.gov.in/public/oauth2/1/authorize?client_id={self.client_id}&response_type=code"
        }


class IdentityVerificationService:
    _demo_adapter = DemoIdentityVerificationAdapter()
    _prod_adapter = DigiLockerProductionAdapter()

    @classmethod
    def verify_worker(cls, db: Session, worker: Worker, doc_type: str, doc_number: str, user: User) -> Dict[str, Any]:
        return cls._demo_adapter.verify_document(db, worker, doc_type, doc_number, user)

    @classmethod
    def get_status(cls, worker: Worker) -> Dict[str, Any]:
        return {
            "identity_status": worker.identity_status,
            "identity_ref": worker.identity_ref,
            "verification_status": worker.verification_status,
            "is_coop_verified": worker.verification_status == "VERIFIED",
            "prod_digilocker_configured": cls._prod_adapter.is_configured()
        }
