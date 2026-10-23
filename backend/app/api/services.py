from typing import List
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.models.models import ServiceCategory, Service, Skill
from app.schemas.schemas import ServiceCategoryResponse, ServiceResponse, SkillResponse

router = APIRouter(prefix="/services", tags=["Services & Skills"])

@router.get("/categories", response_model=List[ServiceCategoryResponse])
def get_categories_with_services(db: Session = Depends(get_db)):
    categories = db.query(ServiceCategory).all()
    results = []
    for cat in categories:
        services = [
            ServiceResponse(
                id=s.id,
                category_id=s.category_id,
                name=s.name,
                description=s.description,
                base_price=s.base_price,
                unit=s.unit,
                estimated_duration_mins=s.estimated_duration_mins,
                is_emergency_enabled=s.is_emergency_enabled
            )
            for s in cat.services
        ]
        results.append(ServiceCategoryResponse(
            id=cat.id,
            name=cat.name,
            description=cat.description,
            icon=cat.icon,
            services=services
        ))
    return results

@router.get("/", response_model=List[ServiceResponse])
def get_all_services(db: Session = Depends(get_db)):
    services = db.query(Service).all()
    return services

@router.get("/skills", response_model=List[SkillResponse])
def get_all_skills(db: Session = Depends(get_db)):
    skills = db.query(Skill).all()
    return skills
