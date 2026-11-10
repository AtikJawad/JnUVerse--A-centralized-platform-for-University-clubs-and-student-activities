"""Image validation + media-URL helper tests (no database needed)."""
import io

import pytest
from django.core.files.uploadedfile import SimpleUploadedFile
from PIL import Image

from config.images import ImageRejected, validate_image


def img_bytes(fmt="PNG", size=(20, 10)):
    buf = io.BytesIO()
    Image.new("RGB", size, "red").save(buf, fmt)
    return buf.getvalue()


@pytest.mark.parametrize("fmt,ext", [("PNG", "png"), ("JPEG", "jpg"), ("WEBP", "webp")])
def test_valid_formats_accepted(fmt, ext):
    data, got = validate_image(SimpleUploadedFile("x.bin", img_bytes(fmt)), 1024 * 1024)
    assert got == ext and data


def test_gif_rejected():
    with pytest.raises(ImageRejected):
        validate_image(SimpleUploadedFile("x.png", img_bytes("GIF")), 1024 * 1024)


def test_fake_image_rejected():
    with pytest.raises(ImageRejected):
        validate_image(SimpleUploadedFile("x.png", b"<?php echo 1;"), 1024 * 1024)


def test_empty_rejected():
    with pytest.raises(ImageRejected):
        validate_image(SimpleUploadedFile("x.png", b""), 1024)


def test_too_large_rejected():
    with pytest.raises(ImageRejected):
        validate_image(SimpleUploadedFile("x.png", img_bytes()), 10)


def test_dimensions_rejected():
    with pytest.raises(ImageRejected):
        validate_image(SimpleUploadedFile("x.png", img_bytes(size=(300, 10))), 1024 * 1024, max_side=200)
