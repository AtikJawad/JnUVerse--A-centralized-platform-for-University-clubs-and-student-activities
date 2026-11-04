from datetime import timedelta

import pytest
from django.utils import timezone

from apps.events.models import EventRegistration
from apps.feedback.models import EventRating
from tests.helpers import make_club, make_event, make_student

pytestmark = pytest.mark.django_db
ZERO = "00000000-0000-0000-0000-000000000000"


def as_user(api, login, ident):
    api.credentials(HTTP_AUTHORIZATION=f"Bearer {login(ident).data['access']}")


def ended(club, hours_ago=1, **kw):
    now = timezone.now()
    ends = now - timedelta(hours=hours_ago)
    return make_event(club, starts_at=ends - timedelta(hours=2), ends_at=ends, **kw)


def rurl(e):
    return f"/api/events/{e.id}/rating/"


def surl(e):
    return f"/api/events/{e.id}/rating-summary/"


@pytest.fixture
def s2(db):
    return make_student("B220305051", "s2@example.com")


def register(e, *students):
    for s in students:
        EventRegistration.objects.create(event=e, student=s)


def test_student_rates_then_changes_rating(api, login, club, student):
    e = ended(club)
    register(e, student)
    as_user(api, login, "s1@example.com")
    r = api.put(rurl(e), {"rating": 4}, format="json")
    assert r.status_code == 201 and r.data["my_rating"] == 4 and r.data["average_rating"] == 4.0
    assert r.data["rating_count"] == 1
    r = api.put(rurl(e), {"rating": 2}, format="json")
    assert r.status_code == 200 and r.data["my_rating"] == 2 and r.data["rating_count"] == 1
    assert EventRating.objects.count() == 1


def test_average_and_count_are_public_my_rating_is_not(api, login, club, student, s2):
    e = ended(club)
    register(e, student, s2)
    for ident, value in (("s1@example.com", 5), ("s2@example.com", 4)):
        as_user(api, login, ident)
        assert api.put(rurl(e), {"rating": value}, format="json").status_code == 201
    api.credentials()
    r = api.get(f"/api/events/{e.id}/")
    assert (r.data["average_rating"], r.data["rating_count"], r.data["my_rating"]) == (4.5, 2, None)
    assert r.data["registered_count"] == 2  # ratings must not inflate registrations


def test_only_registered_students_can_rate(api, login, club, student, s2):
    e = ended(club)
    EventRegistration.objects.create(event=e, student=s2, status="cancelled")
    as_user(api, login, "s1@example.com")
    assert api.put(rurl(e), {"rating": 5}, format="json").status_code == 403
    as_user(api, login, "s2@example.com")
    assert api.put(rurl(e), {"rating": 5}, format="json").status_code == 403
    assert EventRating.objects.count() == 0


def test_state_and_time_window(api, login, club, student):
    as_user(api, login, "s1@example.com")
    upcoming = make_event(club)
    cancelled = ended(club, status="cancelled")
    too_late = ended(club, hours_ago=8 * 24)
    in_window = ended(club, hours_ago=6 * 24)
    register(upcoming, student)
    register(cancelled, student)
    register(too_late, student)
    register(in_window, student)
    assert api.put(rurl(upcoming), {"rating": 5}, format="json").status_code == 409
    assert api.put(rurl(cancelled), {"rating": 5}, format="json").status_code == 409
    assert api.put(rurl(too_late), {"rating": 5}, format="json").status_code == 409
    assert api.put(rurl(in_window), {"rating": 5}, format="json").status_code == 201


@pytest.mark.parametrize("value", [0, 6, "x"])
def test_rating_must_be_1_to_5(api, login, club, student, value):
    e = ended(club)
    register(e, student)
    as_user(api, login, "s1@example.com")
    r = api.put(rurl(e), {"rating": value}, format="json")
    assert r.status_code == 400 and "rating" in r.data
    assert EventRating.objects.count() == 0


def test_rating_permissions_and_visibility(api, login, club, student):
    e = ended(club)
    assert api.put(rurl(e), {"rating": 5}, format="json").status_code == 401
    as_user(api, login, "op@example.com")
    assert api.put(rurl(e), {"rating": 5}, format="json").status_code == 403
    as_user(api, login, "s1@example.com")
    assert api.put(f"/api/events/{ZERO}/rating/", {"rating": 5}, format="json").status_code == 404
    draft = make_event(club, status="draft")
    assert api.put(rurl(draft), {"rating": 5}, format="json").status_code == 404


def test_get_own_rating(api, login, club, student):
    e = ended(club)
    register(e, student)
    as_user(api, login, "s1@example.com")
    assert api.get(rurl(e)).data == {"rating": None}
    api.put(rurl(e), {"rating": 3}, format="json")
    assert api.get(rurl(e)).data == {"rating": 3}


def test_operator_summary(api, login, club, student, s2):
    e = ended(club)
    as_user(api, login, "op@example.com")
    assert api.get(surl(e)).data == {
        "average": None, "count": 0, "breakdown": {"1": 0, "2": 0, "3": 0, "4": 0, "5": 0}}
    register(e, student, s2)
    EventRating.objects.create(event=e, student=student, rating=5)
    EventRating.objects.create(event=e, student=s2, rating=4)
    r = api.get(surl(e))
    assert r.data == {"average": 4.5, "count": 2, "breakdown": {"1": 0, "2": 0, "3": 0, "4": 1, "5": 1}}
    make_club("Other Club", "other@example.com")
    as_user(api, login, "other@example.com")
    assert api.get(surl(e)).status_code == 403
    as_user(api, login, "s1@example.com")
    assert api.get(surl(e)).status_code == 403
    api.credentials()
    assert api.get(surl(e)).status_code == 401