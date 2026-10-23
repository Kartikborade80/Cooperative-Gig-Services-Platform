import os
from typing import List
from pydantic_settings import BaseSettings, SettingsConfigDict

class Settings(BaseSettings):
    PROJECT_NAME: str = "Cooperative Gig Services Platform"
    ENVIRONMENT: str = "development"
    DEBUG: bool = True
    
    # Database
    DATABASE_URL: str = "sqlite:///./coop_gig.db"
    
    # Security
    SECRET_KEY: str = "cooperative-gig-platform-super-secure-production-secret-key-change-me"
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60 * 24  # 24 hours
    
    # Cooperative & Location Defaults
    DEFAULT_COOP_NAME: str = "Shramik Sahakari Labour Cooperative Federation"
    COOP_COMMISSION_PERCENTAGE: float = 5.0
    WORKER_SHARE_PERCENTAGE: float = 95.0
    SERVICE_RADIUS_KM: float = 20.0
    DEFAULT_LAT: float = 19.8917 # Kopargaon, Maharashtra
    DEFAULT_LON: float = 74.4795
    DEFAULT_CITY: str = "Kopargaon"
    DEFAULT_DISTRICT: str = "Ahmednagar"
    
    # SMTP / Email Configuration
    SMTP_HOST: str = ""
    SMTP_PORT: int = 587
    SMTP_USER: str = ""
    SMTP_PASS: str = ""
    SMTP_FROM: str = "notifications@cooperativegig.org"

    # Optional DigiLocker Production Credentials
    DIGILOCKER_CLIENT_ID: str = ""
    DIGILOCKER_CLIENT_SECRET: str = ""
    DIGILOCKER_REDIRECT_URI: str = ""

    # Allowed CORS Origins
    ALLOWED_ORIGINS: str = "http://localhost:5173,http://127.0.0.1:5173,http://localhost:3000"

    @property
    def cors_origins(self) -> List[str]:
        return [origin.strip() for origin in self.ALLOWED_ORIGINS.split(",") if origin.strip()]

    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8", extra="allow")

settings = Settings()
