"""Test settings: local PostgreSQL only. Never Supabase."""
import os

from .settings import *  # noqa: F401,F403

_host = os.environ.get("TEST_DB_HOST", "localhost")
if _host not in ("localhost", "127.0.0.1"):
    raise RuntimeError("Tests must run against a LOCAL PostgreSQL server, never a remote/Supabase one.")

DATABASES = {
    "default": {
        "ENGINE": "django.db.backends.postgresql",
        "NAME": os.environ.get("TEST_DB_NAME", "jnuverse"),
        "USER": os.environ.get("TEST_DB_USER", "postgres"),
        "PASSWORD": os.environ.get("TEST_DB_PASSWORD", "postgres"),
        "HOST": _host,
        "PORT": os.environ.get("TEST_DB_PORT", "5432"),
    }
}

PASSWORD_HASHERS = ["django.contrib.auth.hashers.MD5PasswordHasher"]  # faster tests