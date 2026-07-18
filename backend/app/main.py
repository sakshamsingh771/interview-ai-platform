from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from slowapi import _rate_limit_exceeded_handler
from slowapi.errors import RateLimitExceeded
from slowapi.middleware import SlowAPIMiddleware

from app.database import Base, engine
from app.routers import auth, interviews, contact
from app.rate_limit import limiter
from app import models  # noqa: F401 - ensures models are registered on Base before create_all

app = FastAPI(
    title="Interview AI Platform API",
    description="Backend for an AI-powered mock interview platform.",
    version="1.0.0",
)

app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)
app.add_middleware(SlowAPIMiddleware)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # tighten this to settings.FRONTEND_ORIGIN in production
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.middleware("http")
async def security_headers(request: Request, call_next):
    response = await call_next(request)
    response.headers["X-Content-Type-Options"] = "nosniff"
    response.headers["X-Frame-Options"] = "DENY"
    response.headers["Referrer-Policy"] = "strict-origin-when-cross-origin"
    return response


@app.on_event("startup")
async def on_startup():
    # For a learning/demo project, create_all is fine. For production, switch
    # to Alembic migrations so schema changes are versioned and reviewable.
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)


@app.get("/health", tags=["meta"])
def health_check():
    return {"status": "ok"}


app.include_router(auth.router)
app.include_router(interviews.router)
app.include_router(contact.router)
