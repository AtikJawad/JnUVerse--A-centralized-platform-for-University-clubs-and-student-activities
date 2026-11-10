import io
from datetime import timedelta

import pytest
from django.core.files.uploadedfile import SimpleUploadedFile
from django.utils import timezone
from PIL import Image

from tests.helpers import make_club, make_event, make_student

pytestmark = pytest.mark.django_db


def png():
    buf = io.BytesIO()
    Image.new("RGB", (40, 20), "green").save(buf, "PNG")
    return buf.getvalue()


def upload(content=None, name="b.png"):
    return {"banner": SimpleUploadedFile(name, content if content is not None else png(), content_type="image/png")}


def auth(api, login, email):
    api.credentials(HTTP_AUTHORIZATION=f"Bearer {login(email).data['access']}")


def url(ev):
    return f"/api/events/{ev.id}/banner/"


def test_event_without_banner_works(api, club):
    ev = make_event(club)
    assert api.get(f"/api/events/{ev.id}/").data["banner"] is None
    assert api.get("/api/events/").data["results"][0]["banner"] is None


def test_owner_uploads_banner(api, club, login):
    ev = make_event(club)
    auth(api, login, "op@example.com")
    r = api.put(url(ev), upload(), format="multipart")
    assert r.status_code == 200 and "events/banners/" in r.data["banner"] and r.data["banner"].startswith("http")
    api.credentials()
    assert api.get(f"/api/events/{ev.id}/").data["banner"] == r.data["banner"]
    assert api.get("/api/events/").data["results"][0]["banner"] == r.data["banner"]


def test_draft_banner_upload_and_visibility(api, club, login):
    ev = make_event(club, status="draft")
    auth(api, login, "op@example.com")
    assert api.put(url(ev), upload(), format="multipart").status_code == 200
    make_club(name="Other Club", email="other@example.com")
    auth(api, login, "other@example.com")
    assert api.put(url(ev), upload(), format="multipart").status_code == 404  # drafts are invisible to others


def test_other_operator_forbidden_on_published(api, club, login):
    ev = make_event(club)
    make_club(name="Other Club", email="other@example.com")
    auth(api, login, "other@example.com")
    assert api.put(url(ev), upload(), format="multipart").status_code == 403
    assert api.delete(url(ev)).status_code == 403
    ev.refresh_from_db()
    assert not ev.banner


def test_student_forbidden(api, club, login):
    ev = make_event(club)
    make_student()
    auth(api, login, "s1@example.com")
    assert api.put(url(ev), upload(), format="multipart").status_code == 403


def test_anonymous_rejected(api, club):
    assert api.put(url(make_event(club)), upload(), format="multipart").status_code in (401, 403)


def test_invalid_and_missing_file(api, club, login):
    ev = make_event(club)
    auth(api, login, "op@example.com")
    assert api.put(url(ev), upload(b"junk"), format="multipart").status_code == 400
    assert api.put(url(ev), {}, format="multipart").status_code == 400


def test_oversize_rejected(api, club, login, settings):
    settings.EVENT_BANNER_MAX_BYTES = 100
    ev = make_event(club)
    auth(api, login, "op@example.com")
    assert api.put(url(ev), upload(), format="multipart").status_code == 400


def test_replace_and_delete(api, club, login):
    ev = make_event(club)
    auth(api, login, "op@example.com")
    api.put(url(ev), upload(), format="multipart")
    ev.refresh_from_db()
    old = ev.banner.name
    api.put(url(ev), upload(), format="multipart")
    ev.refresh_from_db()
    assert ev.banner.name != old and not ev.banner.storage.exists(old)
    assert api.delete(url(ev)).status_code == 204
    ev.refresh_from_db()
    assert not ev.banner


def test_cancelled_and_ended_events_locked(api, club, login):
    now = timezone.now()
    cancelled = make_event(club, status="cancelled")
    ended = make_event(club, title="Past", starts_at=now - timedelta(days=2), ends_at=now - timedelta(days=1))
    auth(api, login, "op@example.com")
    for ev in (cancelled, ended):
        assert api.put(url(ev), upload(), format="multipart").status_code == 409
        assert api.delete(url(ev)).status_code == 409


def test_event_patch_does_not_accept_banner(api, club, login):
    ev = make_event(club)
    auth(api, login, "op@example.com")
    r = api.patch(f"/api/events/{ev.id}/", {"banner": "x", "title": "T2"}, format="json")
    assert r.status_code == 200 and r.data["title"] == "T2" and r.data["banner"] is None
