from datetime import timedelta

import pytest
from django.utils import timezone

from apps.events.models import EventRegistration
from tests.helpers import make_club, make_event, make_student

pytestmark = pytest.mark.django_db
ZERO = "00000000-0000-0000-0000-000000000000"


def as_user(api, login, ident):
    api.credentials(HTTP_AUTHORIZATION=f"Bearer {login(ident).data['access']}")


def started(club, **kw):
    now = timezone.now()
    return make_event(club, starts_at=now - timedelta(hours=2), ends_at=now + timedelta(hours=1), **kw)


def url(e):
    return f"/api/events/{e.id}/attendance/"


def regs(event, n=2):
    out = []
    for i in range(n):
        s = make_student(f"B22030510{i}", f"att{i}@example.com")
        out.append(EventRegistration.objects.create(event=event, student=s))
    return out


def test_owner_marks_and_replaces_attendance(api, club, login):
    e = started(club)
    r1, r2 = regs(e)
    as_user(api, login, "op@example.com")
    res = api.put(url(e), {"registration_ids": [str(r1.id)]}, format="json")
    assert res.status_code == 200 and res.data == {"registered": 2, "attended": 1}
    r1.refresh_from_db(); r2.refresh_from_db()
    assert r1.attended and not r2.attended
    listing = api.get(f"/api/events/{e.id}/registrations/").data["results"]
    assert {x["id"]: x["attended"] for x in listing} == {str(r1.id): True, str(r2.id): False}
    assert api.put(url(e), {"registration_ids": []}, format="json").data["attended"] == 0
    r1.refresh_from_db()
    assert not r1.attended


def test_not_started_draft_and_cancelled_are_409(api, club, login):
    now = timezone.now()
    future = make_event(club)
    draft = make_event(club, status="draft", starts_at=now - timedelta(hours=2), ends_at=now + timedelta(hours=1))
    cancelled = started(club, status="cancelled")
    as_user(api, login, "op@example.com")
    for e in (future, draft, cancelled):
        assert api.put(url(e), {"registration_ids": []}, format="json").status_code == 409


def test_other_operator_student_anonymous(api, club, login):
    e = started(club)
    make_club(name="Other", email="other@example.com")
    as_user(api, login, "other@example.com")
    assert api.put(url(e), {"registration_ids": []}, format="json").status_code == 403
    make_student()
    as_user(api, login, "s1@example.com")
    assert api.put(url(e), {"registration_ids": []}, format="json").status_code == 403
    api.credentials()
    assert api.put(url(e), {"registration_ids": []}, format="json").status_code in (401, 403)


def test_unknown_event_404(api, club, login):
    as_user(api, login, "op@example.com")
    assert api.put(f"/api/events/{ZERO}/attendance/", {"registration_ids": []}, format="json").status_code == 404


def test_cancelled_registration_and_foreign_id_rejected(api, club, login):
    e = started(club)
    r1, r2 = regs(e)
    r2.status = "cancelled"; r2.save()
    as_user(api, login, "op@example.com")
    assert api.put(url(e), {"registration_ids": [str(r2.id)]}, format="json").status_code == 400
    assert api.put(url(e), {"registration_ids": [ZERO]}, format="json").status_code == 400
    assert api.put(url(e), {"registration_ids": "nope"}, format="json").status_code == 400
    r1.refresh_from_db()
    assert not r1.attended  # a rejected request changes nothing
