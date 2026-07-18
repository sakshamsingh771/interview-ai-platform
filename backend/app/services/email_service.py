"""
All outbound email lives here. If SMTP_HOST isn't configured, emails are
logged instead of sent - this keeps signup/password-reset flows fully
testable in dev/demo environments without a real mail server, mirroring
the offline fallback already used in ai_service.py.
"""
import logging
import smtplib
from email.mime.text import MIMEText

from app.config import settings

logger = logging.getLogger("preproom.email")


def _send(to_email: str, subject: str, html_body: str) -> None:
    if not settings.SMTP_HOST:
        logger.info(
            "SMTP not configured - logging email instead of sending.\n"
            "To: %s\nSubject: %s\nBody:\n%s",
            to_email, subject, html_body,
        )
        return

    message = MIMEText(html_body, "html")
    message["Subject"] = subject
    message["From"] = settings.SMTP_FROM
    message["To"] = to_email

    with smtplib.SMTP(settings.SMTP_HOST, settings.SMTP_PORT) as server:
        server.starttls()
        if settings.SMTP_USER:
            server.login(settings.SMTP_USER, settings.SMTP_PASSWORD)
        server.sendmail(settings.SMTP_FROM, [to_email], message.as_string())


def send_verification_email(to_email: str, full_name: str, token: str) -> None:
    link = f"{settings.FRONTEND_ORIGIN}/verify-email?token={token}"
    _send(
        to_email,
        "Verify your PrepRoom account",
        f"""
        <p>Hi {full_name},</p>
        <p>Welcome to PrepRoom. Please verify your email address to unlock all features:</p>
        <p><a href="{link}">{link}</a></p>
        <p>This link expires in {settings.EMAIL_VERIFICATION_TOKEN_EXPIRE_HOURS} hours.</p>
        """,
    )


def send_password_reset_email(to_email: str, full_name: str, token: str) -> None:
    link = f"{settings.FRONTEND_ORIGIN}/reset-password?token={token}"
    _send(
        to_email,
        "Reset your PrepRoom password",
        f"""
        <p>Hi {full_name},</p>
        <p>We received a request to reset your password. This link expires in
        {settings.PASSWORD_RESET_TOKEN_EXPIRE_HOURS} hour(s):</p>
        <p><a href="{link}">{link}</a></p>
        <p>If you didn't request this, you can safely ignore this email.</p>
        """,
    )


def send_contact_email(name: str, from_email: str, message: str) -> None:
    receiver = settings.CONTACT_RECEIVER_EMAIL or settings.SMTP_FROM
    _send(
        receiver,
        f"PrepRoom contact form: {name}",
        f"""
        <p><strong>From:</strong> {name} ({from_email})</p>
        <p><strong>Message:</strong></p>
        <p>{message}</p>
        """,
    )
