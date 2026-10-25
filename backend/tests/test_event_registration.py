from datetime import timedelta

import pytest
from django.utils import timezone

from apps.events.models import EventRegistration
from tests.helpers import make_club, make_event, make_student

pytestmark = pytest.mark.django_db
URL = "/api/events/"
ZERO = "00000000-0000-0000-0000-000000000000"


def as_user(api, login, ident):
    api.credentials(HTTP_AUTHORIZATION=f"Bearer {login(ident).data['access']}")


def rurl(event):
    return f"{URL}{event.id}/register/"


def test_register_is_idempotent(api, login, club, student):
    e = make_event(club, capacity=10)
    as_user(api, login, "s1@example.com")
    r = api.post(rurl(e))
    assert r.status_code == 201 and r.data["is_registered"] is True and r.data["registered_count"] == 1
    r = api.post(rurl(e))
    assert r.status_code == 200 and r.data["registered_count"] == 1
    assert EventRegistration.objects.count() == 1


def test_capacity_is_enforced(api, login, club, student):
    make_student("B220305051", "s2@example.com")
    e = make_event(club, capacity=1)
    as_user(api, login, "s1@example.com")
    assert api.post(rurl(e)).status_code == 201
    as_user(api, login, "s2@example.com")
    r = api.post(rurl(e))
    assert r.status_code == 409 and "full" in r.data["detail"]
    assert EventRegistration.objects.count() == 1
    as_user(api, login, "s1@example.com")
    assert api.delete(rurl(e)).status_code == 204          # frees the seat
    as_user(api, login, "s2@example.com")
    r = api.post(rurl(e))
    assert r.status_code == 201 and r.data["remaining_capacity"] == 0


def test_cancel_and_reregister_reuse_the_row(api, login, club, student):
    e = make_event(club)
    old = timezone.now() - timedelta(days=2)
    reg = EventRegistration.objects.create(event=e, student=student, status="cancelled", registered_at=old)
    as_user(api, login, "s1@example.com")
    assert api.post(rurl(e)).status_code == 201
    reg.refresh_from_db()
    assert reg.status == "registered" and reg.registered_at > old
    assert EventRegistration.objects.count() == 1
    assert api.delete(rurl(e)).status_code == 204
    reg.refresh_from_db()
    assert reg.status == "cancelled"
    assert api.delete(rurl(e)).status_code == 204          # idempotent
    assert api.get(f"{URL}{e.id}/").data["registered_count"] == 0


def test_registration_closed_cases(api, login, club, student):
    now = timezone.now()
    draft = make_event(club, status="draft")
    cancelled = make_event(club, status="cancelled")
    started = make_event(club, starts_at=now - timedelta(hours=1), ends_at=now + timedelta(hours=1))
    ended = make_event(club, starts_at=now - timedelta(days=2), ends_at=now - timedelta(days=1))
    as_user(api, login, "s1@example.com")
    assert api.post(rurl(draft)).status_code == 404
    for e in (cancelled, started, ended):
        assert api.post(rurl(e)).status_code == 409
    assert EventRegistration.objects.count() == 0
    EventRegistration.objects.create(event=started, student=student)
    assert api.delete(rurl(started)).status_code == 409    # cannot cancel after the start
    assert EventRegistration.objects.get().status == "registered"


def test_register_permissions(api, login, club, student):
    e = make_event(club)
    assert api.post(rurl(e)).status_code == 401 and api.delete(rurl(e)).status_code == 401
    as_user(api, login, "op@example.com")
    assert api.post(rurl(e)).status_code == 403 and api.delete(rurl(e)).status_code == 403
    as_user(api, login, "s1@example.com")
    assert api.post(f"{URL}{ZERO}/register/").status_code == 404


def test_registration_list_for_owner_only(api, login, club, student):
    make_club("Other Club", "other@example.com")
    s2, s3 = make_student("B220305051", "s2@example.com"), make_student("B220305052", "s3@example.com")
    e, now = make_event(club), timezone.now()
    EventRegistration.objects.create(event=e, student=s2, registered_at=now - timedelta(hours=2))
    EventRegistration.objects.create(event=e, student=student, registered_at=now - timedelta(hours=1))
    EventRegistration.objects.create(event=e, student=s3, status="cancelled")
    url = f"{URL}{e.id}/registrations/"
    assert api.get(url).status_code == 401
    for ident in ("s1@example.com", "other@example.com"):
        as_user(api, login, ident)
        assert api.get(url).status_code == 403
    as_user(api, login, "op@example.com")
    r = api.get(url)
    assert r.status_code == 200 and [x["student_id"] for x in r.data["results"]] == ["B220305051", "B220305050"]
    assert set(r.data["results"][0]) == {"id", "student_id", "name", "department", "batch", "status", "registered_at"}
    assert api.get(f"{URL}{ZERO}/registrations/").status_code == 404


def test_registered_filter_follows_api_actions(api, login, club, student):
    e = make_event(club, title="Mine")
    as_user(api, login, "s1@example.com")
    assert api.get(URL, {"registered": "true"}).data["results"] == []
    api.post(rurl(e))
    assert [x["title"] for x in api.get(URL, {"registered": "true"}).data["results"]] == ["Mine"]
    api.delete(rurl(e))
    assert api.get(URL, {"registered": "true"}).data["results"] == []