from fastapi import APIRouter, Request

from app import schemas
from app.config import settings
from app.services import email_service
from app.rate_limit import limiter

router = APIRouter(prefix="/contact", tags=["contact"])


@router.post("/", response_model=schemas.MessageOut)
@limiter.limit(settings.RATE_LIMIT_CONTACT)
async def submit_contact_form(request: Request, payload: schemas.ContactRequest):
    email_service.send_contact_email(payload.name, payload.email, payload.message)
    return schemas.MessageOut(message="Thanks for reaching out - we'll get back to you soon.")
