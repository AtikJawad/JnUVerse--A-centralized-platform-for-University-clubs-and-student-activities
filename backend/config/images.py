"""Image helpers shared by club logos and event banners (pure Pillow, no Django models)."""
import io
import uuid
from pathlib import PurePosixPath

from django.conf import settings
from PIL import Image, UnidentifiedImageError

ALLOWED_FORMATS = {"JPEG": "jpg", "PNG": "png", "WEBP": "webp"}


class ImageRejected(ValueError):
    """The upload is not an acceptable image (message is safe to show to the user)."""


def validate_image(upload, max_bytes, max_side=None):
    """Return (bytes, extension) for a valid JPEG/PNG/WebP, else raise ImageRejected.

    The file's real content is checked with Pillow; the client's filename and
    Content-Type are never trusted.
    """
    max_side = max_side or settings.IMAGE_MAX_SIDE
    data = upload.read(max_bytes + 1)
    if len(data) > max_bytes:
        raise ImageRejected(f"Image is too large. Maximum size is {max_bytes / (1024 * 1024):g} MB.")
    if not data:
        raise ImageRejected("The uploaded file is empty.")
    try:
        with Image.open(io.BytesIO(data)) as img:
            fmt = img.format
            width, height = img.size
            img.verify()
    except (UnidentifiedImageError, OSError, SyntaxError, ValueError, Image.DecompressionBombError):
        raise ImageRejected("Upload a valid image file (JPEG, PNG or WebP).")
    if fmt not in ALLOWED_FORMATS:
        raise ImageRejected("Unsupported image type. Allowed types: JPEG, PNG, WebP.")
    if max(width, height) > max_side:
        raise ImageRejected(f"Image dimensions are too large. Maximum is {max_side}px on the longest side.")
    return data, ALLOWED_FORMATS[fmt]


def club_logo_path(instance, filename):
    return f"clubs/logos/{uuid.uuid4().hex}{PurePosixPath(filename).suffix.lower()}"


def event_banner_path(instance, filename):
    return f"events/banners/{uuid.uuid4().hex}{PurePosixPath(filename).suffix.lower()}"


def media_url(field_file):
    """Absolute URL of an uploaded file, or None when there is no file."""
    if not field_file:
        return None
    url = field_file.url
    if url.startswith("/"):  # local dev storage returns a relative URL
        url = settings.PUBLIC_BASE_URL.rstrip("/") + url
    return url


def club_logo_url(club):
    """Uploaded logo URL; falls back to the legacy URL value; None when neither exists."""
    return media_url(club.logo_image) or club.logo or None
