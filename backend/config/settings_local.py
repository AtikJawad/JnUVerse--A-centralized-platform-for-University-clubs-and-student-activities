"""Local stack for frontend/integration work: local PostgreSQL + local media only.

Run with:  DJANGO_SETTINGS_MODULE=config.settings_local python manage.py <command>
Refuses any non-local database, and never writes images to Supabase.
"""
import os

from .settings import *  # noqa: F401,F403

_host = os.environ.get("LOCAL_DB_HOST", "localhost")
if _host not in ("localhost", "127.0.0.1"):
    raise RuntimeError("settings_local only works with a LOCAL PostgreSQL server (LOCAL_DB_HOST).")

DATABASES = {
    "default": {
        "ENGINE": "django.db.backends.postgresql",
        "NAME": os.environ.get("LOCAL_DB_NAME", "jnuverse_local"),
        "USER": os.environ.get("LOCAL_DB_USER", "postgres"),
        "PASSWORD": os.environ.get("LOCAL_DB_PASSWORD", "postgres"),
        "HOST": _host,
        "PORT": os.environ.get("LOCAL_DB_PORT", "5432"),
    }
}

MEDIA_ROOT = BASE_DIR / "media_local"  # noqa: F405
STORAGES = {**STORAGES, "default": {"BACKEND": "django.core.files.storage.FileSystemStorage"}}  # noqa: F405
