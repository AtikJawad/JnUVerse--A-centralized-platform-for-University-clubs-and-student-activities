import io

import pytest
from django.core.files.uploadedfile import SimpleUploadedFile
from PIL import Image

from tests.helpers import make_club, make_student, PASSWORD

pytestmark = pytest.mark.django_db


def png(size=(20, 20)):
    buf = io.BytesIO()
    Image.new("RGB", size, "blue").save(buf, "PNG")
    return buf.getvalue()


def upload(content=None, name="logo.png", ctype="image/png"):
    return {"logo": SimpleUploadedFile(name, content if content is not None else png(), content_type=ctype)}


def auth(api, login, email):
    token = login(email).data["access"]
    api.credentials(HTTP_AUTHORIZATION=f"Bearer {token}")


def url(club):
    return f"/api/clubs/{club.slug}/logo/"


def test_club_without_logo_works(api, club):
    r = api.get(f"/api/clubs/{club.slug}/")
    assert r.status_code == 200 and r.data["logo"] is None


def test_legacy_url_logo_still_returned(api, club):
    club.logo = "https://example.com/old.png"
    club.save()
    assert api.get(f"/api/clubs/{club.slug}/").data["logo"] == "https://example.com/old.png"


def test_owner_uploads_logo(api, club, login):
    auth(api, login, "op@example.com")
    r = api.put(url(club), upload(), format="multipart")
    assert r.status_code == 200
    assert r.data["logo"].startswith("http") and "clubs/logos/" in r.data["logo"]
    api.credentials()
    assert api.get(f"/api/clubs/{club.slug}/").data["logo"] == r.data["logo"]
    club.refresh_from_db()
    assert club.logo_image.name.startswith("clubs/logos/") and club.logo_image.name.endswith(".png")


def test_replace_deletes_old_file(api, club, login):
    auth(api, login, "op@example.com")
    api.put(url(club), upload(), format="multipart")
    club.refresh_from_db()
    old = club.logo_image.name
    api.put(url(club), upload(), format="multipart")
    club.refresh_from_db()
    assert club.logo_image.name != old
    assert not club.logo_image.storage.exists(old)


def test_delete_logo(api, club, login):
    auth(api, login, "op@example.com")
    api.put(url(club), upload(), format="multipart")
    assert api.delete(url(club)).status_code == 204
    club.refresh_from_db()
    assert not club.logo_image
    assert api.delete(url(club)).status_code == 204  # idempotent


def test_other_operator_forbidden(api, club, login):
    make_club(name="Other Club", email="other@example.com")
    auth(api, login, "other@example.com")
    assert api.put(url(club), upload(), format="multipart").status_code == 403
    assert api.delete(url(club)).status_code == 403
    club.refresh_from_db()
    assert not club.logo_image


def test_student_forbidden(api, club, login):
    make_student()
    auth(api, login, "s1@example.com")
    assert api.put(url(club), upload(), format="multipart").status_code == 403


def test_anonymous_rejected(api, club):
    assert api.put(url(club), upload(), format="multipart").status_code in (401, 403)


def test_unknown_club_404(api, club, login):
    auth(api, login, "op@example.com")
    assert api.put("/api/clubs/nope/logo/", upload(), format="multipart").status_code == 404


@pytest.mark.parametrize("content,name", [
    (b"not an image", "logo.png"),
    (b"<script>alert(1)</script>", "logo.jpg"),
])
def test_invalid_content_rejected(api, club, login, content, name):
    auth(api, login, "op@example.com")
    r = api.put(url(club), upload(content, name), format="multipart")
    assert r.status_code == 400 and "logo" in r.data


def test_gif_rejected(api, club, login):
    buf = io.BytesIO()
    Image.new("RGB", (5, 5)).save(buf, "GIF")
    auth(api, login, "op@example.com")
    assert api.put(url(club), upload(buf.getvalue(), "a.gif", "image/gif"), format="multipart").status_code == 400


def test_missing_file_rejected(api, club, login):
    auth(api, login, "op@example.com")
    assert api.put(url(club), {}, format="multipart").status_code == 400


def test_oversize_rejected(api, club, login, settings):
    settings.CLUB_LOGO_MAX_BYTES = 100
    auth(api, login, "op@example.com")
    assert api.put(url(club), upload(), format="multipart").status_code == 400


def test_patch_club_ignores_logo_field(api, club, login):
    auth(api, login, "op@example.com")
    r = api.patch(f"/api/clubs/{club.slug}/", {"description": "New", "logo": "https://evil.example/x.png"}, format="json")
    assert r.status_code == 200 and r.data["description"] == "New" and r.data["logo"] is None
