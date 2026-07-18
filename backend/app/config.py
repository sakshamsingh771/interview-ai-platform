from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    """
    Central place for all environment-driven configuration.
    Attribute names match the .env keys exactly (case-sensitive) so that
    `settings.SECRET_KEY` etc. used elsewhere in the app actually resolves.
    """

    DATABASE_URL: str
    SECRET_KEY: str
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 1440
    REFRESH_TOKEN_EXPIRE_DAYS: int = 30
    EMAIL_VERIFICATION_TOKEN_EXPIRE_HOURS: int = 24
    PASSWORD_RESET_TOKEN_EXPIRE_HOURS: int = 1

    ANTHROPIC_API_KEY: str = ""
    OPENAI_API_KEY: str = ""
    OPENAI_MODEL: str = "gpt-4o-mini"
    FRONTEND_ORIGIN: str = "http://localhost:5173"

    # Must match the frontend's VITE_GOOGLE_CLIENT_ID - the backend verifies
    # that Google ID tokens were issued for this exact client.
    GOOGLE_CLIENT_ID: str = ""

    GITHUB_CLIENT_ID: str = ""
    GITHUB_CLIENT_SECRET: str = ""
    # Must exactly match the callback URL registered on the GitHub OAuth App
    # and the one the frontend redirects to. Falls back to FRONTEND_ORIGIN + /auth/github/callback.
    GITHUB_REDIRECT_URI: str = ""

    # SMTP - if SMTP_HOST is empty, email_service logs the email instead of
    # sending it, so verification/reset flows are fully testable without a
    # real mail server (same "demo mode" philosophy as the AI service).
    SMTP_HOST: str = ""
    SMTP_PORT: int = 587
    SMTP_USER: str = ""
    SMTP_PASSWORD: str = ""
    SMTP_FROM: str = "PrepRoom <no-reply@preproom.local>"

    RATE_LIMIT_LOGIN: str = "5/minute"
    RATE_LIMIT_SIGNUP: str = "5/minute"
    RATE_LIMIT_PASSWORD_RESET: str = "3/minute"
    RATE_LIMIT_CONTACT: str = "3/minute"

    # Where contact-form submissions get emailed. Falls back to logging
    # (like every other email in this app) if left empty.
    CONTACT_RECEIVER_EMAIL: str = ""

    model_config = SettingsConfigDict(env_file=".env", extra="ignore")


settings = Settings()
