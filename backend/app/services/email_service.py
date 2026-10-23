import os
import smtplib
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from typing import Optional
from sqlalchemy.orm import Session
from app.models.models import EmailNotification
from app.core.config import settings

class EmailService:

    @classmethod
    def _cfg(cls):
        """Resolve SMTP config from pydantic settings (loaded from .env)."""
        return {
            "host": settings.SMTP_HOST.strip(),
            "port": settings.SMTP_PORT,
            "user": settings.SMTP_USER.strip(),
            "password": settings.SMTP_PASS.strip(),
            "from_addr": settings.SMTP_FROM.strip() or settings.SMTP_USER.strip(),
        }

    @classmethod
    def is_smtp_configured(cls) -> bool:
        cfg = cls._cfg()
        return bool(cfg["host"] and cfg["user"] and cfg["password"])

    @classmethod
    def send_email(
        cls,
        db: Session,
        to_email: str,
        subject: str,
        body: str,
        booking_id: Optional[int] = None
    ) -> dict:
        """
        Sends email using SMTP if configured, or development/mock email adapter mode.
        Persists email notification record in database.
        """
        if cls.is_smtp_configured():
            cfg = cls._cfg()
            try:
                msg = MIMEMultipart()
                msg["From"] = cfg["from_addr"]
                msg["To"] = to_email
                msg["Subject"] = subject
                msg.attach(MIMEText(body, "html"))

                with smtplib.SMTP(cfg["host"], cfg["port"], timeout=10) as server:
                    server.starttls()
                    server.login(cfg["user"], cfg["password"])
                    server.sendmail(cfg["from_addr"], to_email, msg.as_string())

                status = "SENT"
                print(f"[EmailService - SMTP LIVE] Email sent to {to_email}: {subject}")
            except Exception as e:
                print(f"[EmailService - SMTP ERROR] Failed sending to {to_email}: {e}")
                status = "FAILED"
        else:
            # Development / Mock Mode
            status = "MOCK_SENT"
            try:
                print(f"==================================================")
                print(f"[EmailService - DEV/MOCK ADAPTER MODE]")
                print(f"To: {to_email}")
                print(f"Subject: {subject.encode('ascii', 'replace').decode('ascii')}")
                print(f"Body:\n{body.encode('ascii', 'replace').decode('ascii')}")
                print(f"==================================================")
            except Exception:
                pass

        # Persist email in database for audit and testing inspection
        email_record = EmailNotification(
            to_email=to_email,
            subject=subject,
            body=body,
            booking_id=booking_id,
            status=status
        )
        db.add(email_record)
        db.commit()

        return {
            "status": status,
            "to_email": to_email,
            "subject": subject,
            "is_mock": not cls.is_smtp_configured()
        }

    @classmethod
    def send_booking_request_email(
        cls,
        db: Session,
        worker_email: str,
        customer_name: str,
        service_name: str,
        category_name: str,
        date_str: str,
        time_slot: str,
        location_area: str,
        problem_description: str,
        estimated_amount: float,
        booking_ref: str,
        booking_id: int
    ) -> dict:
        subject = f"New Booking Request #{booking_ref} - {service_name}"
        body = f"""
        <html>
        <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
            <div style="background-color: #059669; color: white; padding: 16px 20px; border-radius: 8px 8px 0 0;">
                <h2 style="margin: 0;">New Booking Request</h2>
                <p style="margin: 4px 0 0 0; font-size: 14px;">Cooperative Gig Services Platform</p>
            </div>
            <div style="border: 1px solid #e2e8f0; border-top: none; padding: 20px; border-radius: 0 0 8px 8px;">
                <p>Hello, you have received a new service request from a customer nearby!</p>
                <table style="width: 100%; border-collapse: collapse; margin: 16px 0;">
                    <tr><td style="padding: 8px 0; color: #64748b;"><strong>Booking ID:</strong></td><td style="padding: 8px 0;"><strong>#{booking_ref}</strong></td></tr>
                    <tr><td style="padding: 8px 0; color: #64748b;"><strong>Customer:</strong></td><td style="padding: 8px 0;">{customer_name}</td></tr>
                    <tr><td style="padding: 8px 0; color: #64748b;"><strong>Category:</strong></td><td style="padding: 8px 0;">{category_name}</td></tr>
                    <tr><td style="padding: 8px 0; color: #64748b;"><strong>Service:</strong></td><td style="padding: 8px 0;">{service_name}</td></tr>
                    <tr><td style="padding: 8px 0; color: #64748b;"><strong>Date:</strong></td><td style="padding: 8px 0;">{date_str}</td></tr>
                    <tr><td style="padding: 8px 0; color: #64748b;"><strong>Requested Time:</strong></td><td style="padding: 8px 0;">{time_slot}</td></tr>
                    <tr><td style="padding: 8px 0; color: #64748b;"><strong>Location:</strong></td><td style="padding: 8px 0;">{location_area}</td></tr>
                    <tr><td style="padding: 8px 0; color: #64748b;"><strong>Estimated Amount:</strong></td><td style="padding: 8px 0; color: #059669; font-size: 16px; font-weight: bold;">₹{estimated_amount:.2f}</td></tr>
                    <tr><td style="padding: 8px 0; color: #64748b;"><strong>Problem Details:</strong></td><td style="padding: 8px 0;">{problem_description or 'Standard service request'}</td></tr>
                </table>
                <p>Please log in to your Cooperative Worker Dashboard to Accept or Propose a Price for this request.</p>
                <div style="margin-top: 20px; padding: 12px; background-color: #f8fafc; border-radius: 6px; font-size: 13px; color: #64748b;">
                    <strong>Cooperative Guarantee:</strong> Fair 95% worker direct payout with 5% collective welfare pool contribution.
                </div>
            </div>
        </body>
        </html>
        """
        return cls.send_email(
            db=db,
            to_email=worker_email,
            subject=subject,
            body=body,
            booking_id=booking_id
        )

    @classmethod
    def send_otp_email(cls, db: Session, to_email: str, otp_code: str, purpose: str = "Verification") -> dict:
        subject = f"Your Cooperative Platform OTP: {otp_code}"
        body = f"""
        <html>
        <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
            <div style="background-color: #2563eb; color: white; padding: 16px 20px; border-radius: 8px 8px 0 0;">
                <h2 style="margin: 0;">Cooperative Security OTP</h2>
            </div>
            <div style="border: 1px solid #e2e8f0; border-top: none; padding: 20px; border-radius: 0 0 8px 8px;">
                <p>Your one-time security code for <strong>{purpose}</strong> is:</p>
                <div style="text-align: center; margin: 24px 0;">
                    <span style="font-size: 32px; font-weight: bold; letter-spacing: 6px; color: #2563eb; background: #eff6ff; padding: 10px 24px; border-radius: 8px; border: 1px dashed #93c5fd;">
                        {otp_code}
                    </span>
                </div>
                <p style="color: #64748b; font-size: 13px;">This code is valid for 10 minutes. Do not share this OTP with anyone.</p>
            </div>
        </body>
        </html>
        """
        return cls.send_email(db=db, to_email=to_email, subject=subject, body=body)
