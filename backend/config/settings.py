"""
Django settings for the JnUVerse backend (config project).

Week 1 scope: project foundation only. Authentication (JWT/RBAC),
CORS, and app-specific business logic are wired up progressively in
their scheduled weeks per the 10-week development plan — this file establishes
the environment-variable-driven foundation they will build on.
"""

from pathlib import Path

from dotenv import load_dotenv
import os
from datetime import timedelta

BASE_DIR = Path(__file__).resolve().parent.parent

# Load variables from backend/.env in local development. In production,
# environment variables should be provided by the hosting platform instead
# of a committed .env file.
load_dotenv(BASE_DIR / ".env")


def env(key, default=None, required=False):
    value = os.environ.get(key, default)
    if required and not value:
        raise RuntimeError(
            f"Required environment variable '{key}' is not set. "
            f"Copy backend/.env.example to backend/.env and fill it in."
        )
    return value


def env_bool(key, default=False):
    value = os.environ.get(key)
    if value is None:
        return default
    return value.strip().lower() in ("1", "true", "yes", "on")


def env_list(key, default=""):
    value = os.environ.get(key, default)
    return [item.strip() for item in value.split(",") if item.strip()]


# ---------------------------------------------------------------------------
# Core / security
# ---------------------------------------------------------------------------

# SECURITY WARNING: keep the secret key used in production secret!
# Never commit a real value — this is only a development fallback.
SECRET_KEY = env(
    "DJANGO_SECRET_KEY",
    default="dev-only-insecure-secret-key-change-me",
)

DEBUG = env_bool("DJANGO_DEBUG", default=True)

ALLOWED_HOSTS = env_list("DJANGO_ALLOWED_HOSTS", default="localhost,127.0.0.1")

# ---------------------------------------------------------------------------
# Applications
# ---------------------------------------------------------------------------

DJANGO_APPS = [
    "django.contrib.admin",
    "django.contrib.auth",
    "django.contrib.contenttypes",
    "django.contrib.sessions",
    "django.contrib.messages",
    "django.contrib.staticfiles",
]

THIRD_PARTY_APPS = [
    "rest_framework",
    "corsheaders",
    # "rest_framework_simplejwt",  # enabled when JWT auth is wired up (Week 5)
    "drf_spectacular",           # enabled when OpenAPI/Swagger docs are wired up
]

# JnUVerse modular-monolith apps: one Django app per business domain,
# matching the locked repository structure under backend/apps/.
LOCAL_APPS = [
    "apps.accounts",
    "apps.clubs",
    "apps.events",
    "apps.notifications",
    "apps.feedback",
    "apps.collaborations",
    "apps.reports",
]

INSTALLED_APPS = DJANGO_APPS + THIRD_PARTY_APPS + LOCAL_APPS

AUTH_USER_MODEL = "accounts.User"

MIDDLEWARE = [
    "django.middleware.security.SecurityMiddleware",
    "whitenoise.middleware.WhiteNoiseMiddleware",
    "corsheaders.middleware.CorsMiddleware",
    "django.contrib.sessions.middleware.SessionMiddleware",
    "django.middleware.common.CommonMiddleware",
    "django.middleware.csrf.CsrfViewMiddleware",
    "django.contrib.auth.middleware.AuthenticationMiddleware",
    "django.contrib.messages.middleware.MessageMiddleware",
    "django.middleware.clickjacking.XFrameOptionsMiddleware",
]

ROOT_URLCONF = "config.urls"

TEMPLATES = [
    {
        "BACKEND": "django.template.backends.django.DjangoTemplates",
        "DIRS": [],
        "APP_DIRS": True,
        "OPTIONS": {
            "context_processors": [
                "django.template.context_processors.debug",
                "django.template.context_processors.request",
                "django.contrib.auth.context_processors.auth",
                "django.contrib.messages.context_processors.messages",
            ],
        },
    },
]

WSGI_APPLICATION = "config.wsgi.application"
ASGI_APPLICATION = "config.asgi.application"

# ---------------------------------------------------------------------------
# Database — hosted Supabase PostgreSQL, configured entirely via env vars.
# Credentials must never be committed; see backend/.env.example.
# ---------------------------------------------------------------------------

DATABASES = {
    "default": {
        "ENGINE": "django.db.backends.postgresql",
        "NAME": env("DB_NAME", required=False),
        "USER": env("DB_USER", required=False),
        "PASSWORD": env("DB_PASSWORD", required=False),
        "HOST": env("DB_HOST", required=False),
        "PORT": env("DB_PORT", default="5432"),
        "OPTIONS": {
            "sslmode": env("DB_SSLMODE", default="require"),
        },
    }
}

# ---------------------------------------------------------------------------
# Password validation
# ---------------------------------------------------------------------------

AUTH_PASSWORD_VALIDATORS = [
    {"NAME": "django.contrib.auth.password_validation.UserAttributeSimilarityValidator"},
    {"NAME": "django.contrib.auth.password_validation.MinimumLengthValidator"},
    {"NAME": "django.contrib.auth.password_validation.CommonPasswordValidator"},
    {"NAME": "django.contrib.auth.password_validation.NumericPasswordValidator"},
]

# ---------------------------------------------------------------------------
# Internationalization
# ---------------------------------------------------------------------------

LANGUAGE_CODE = "en-us"
TIME_ZONE = "Asia/Dhaka"
USE_I18N = True
USE_TZ = True

# ---------------------------------------------------------------------------
# Static files
# ---------------------------------------------------------------------------

STATIC_URL = "static/"

STATIC_ROOT = BASE_DIR / "staticfiles"
STORAGES = {
    "default": {"BACKEND": "django.core.files.storage.FileSystemStorage"},
    "staticfiles": {"BACKEND": "whitenoise.storage.CompressedStaticFilesStorage"},
}

DEFAULT_AUTO_FIELD = "django.db.models.BigAutoField"

# ---------------------------------------------------------------------------
# Django REST Framework — minimal foundation.
# Authentication classes and permission defaults are finalized in Week 5
# when JWT + RBAC are implemented.
# ---------------------------------------------------------------------------

REST_FRAMEWORK = {
    "DEFAULT_PERMISSION_CLASSES": [
        "rest_framework.permissions.IsAuthenticatedOrReadOnly",
    ],
    "DEFAULT_SCHEMA_CLASS": "drf_spectacular.openapi.AutoSchema",

    "DEFAULT_AUTHENTICATION_CLASSES": (
        "rest_framework_simplejwt.authentication.JWTAuthentication",
    ),
    
}

# ---------------------------------------------------------------------------
# CORS — the React frontend origin(s) allowed to call this API.
# The frontend must never talk to PostgreSQL/Supabase directly; it only
# ever calls this Django/DRF API.
# ---------------------------------------------------------------------------

CORS_ALLOWED_ORIGINS = env_list(
    "CORS_ALLOWED_ORIGINS",
    default="http://localhost:5173,http://127.0.0.1:5173",
)

CSRF_TRUSTED_ORIGINS = env_list(
    "CSRF_TRUSTED_ORIGINS",
    default="",
)

SIMPLE_JWT = {
    "ACCESS_TOKEN_LIFETIME": timedelta(minutes=30),
    "REFRESH_TOKEN_LIFETIME": timedelta(days=7),
}

SPECTACULAR_SETTINGS = {
    "TITLE": "JnUVerse API",
    "DESCRIPTION": "Backend API for JnUVerse (JnU clubs & student activities).",
    "VERSION": "0.2.0",
    "SERVE_INCLUDE_SCHEMA": False,
}

SECURE_PROXY_SSL_HEADER = ("HTTP_X_FORWARDED_PROTO", "https")
if not DEBUG:
    SESSION_COOKIE_SECURE = True
    CSRF_COOKIE_SECURE = True