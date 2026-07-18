"""
Single shared Limiter instance. Kept in its own module (rather than living
inside routers/auth.py) so any router - auth, contact, future ones - can
import it without risking circular imports through app.main.
"""
from slowapi import Limiter
from slowapi.util import get_remote_address

limiter = Limiter(key_func=get_remote_address)
