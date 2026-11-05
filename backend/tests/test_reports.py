import pytest

from apps.reports.models import ContentReport
from tests.helpers import make_club, make_event

pytestmark = pytest.mark.django_db
URL = "/api/reports/"
ZERO = "00000000-0000-0000-0000-000000000000"


def as_user(api, login, ident):
    api.credentials(HTTP_AUTHORIZATION=f"Bearer {login(ident).data['access']}")


def payload(**kw):
    d = {"target_type": "club", "target": "other-club", "reason": "spam"}
    d.update(kw)
    return d


@pytest.fixture
def other(db):
    return make_club("Other Club", "other@example.com")


def test_student_reports_a_club(api, login, student, other):
    as_user(api, login, "s1@example.com")
    r = api.post(URL, payload(details="  Looks fake  "), format="json")
    assert r.status_code == 201
    assert (r.data["target_type"], r.data["event"], r.data["status"], r.data["details"]) == (
        "club", None, "open", "Looks fake")
    assert r.data["club"]["slug"] == "other-club"
    assert ContentReport.objects.get().reporter == student.user


def test_student_reports_published_and_cancelled_events(api, login, student, other):
    live = make_event(other, title="Live")
    cancelled = make_event(other, title="Called off", status="cancelled")
    as_user(api, login, "s1@example.com")
    r = api.post(URL, payload(target_type="event", target=str(live.id), reason="misleading"), format="json")
    assert r.status_code == 201 and r.data["target_type"] == "event" and r.data["event"]["title"] == "Live"
    assert api.post(URL, payload(target_type="event", target=str(cancelled.id)), format="json").status_code == 201


def test_club_operator_can_report_another_club(api, login, club, other):
    as_user(api, login, "op@example.com")
    assert api.post(URL, payload(), format="json").status_code == 201


@pytest.mark.parametrize("over,field", [
    ({"target": "nope"}, "target"),
    ({"target_type": "event", "target": "not-a-uuid"}, "target"),
    ({"target_type": "event", "target": ZERO}, "target"),
    ({"target_type": "user"}, "target_type"),
    ({"reason": "bad"}, "reason"),
    ({"reason": "other"}, "details"),
    ({"details": "x" * 1001}, "details"),
])
def test_report_validation(api, login, student, other, over, field):
    as_user(api, login, "s1@example.com")
    r = api.post(URL, payload(**over), format="json")
    assert r.status_code == 400 and field in r.data
    assert ContentReport.objects.count() == 0


def test_cannot_report_own_club_or_events(api, login, club, other):
    mine = make_event(club)
    as_user(api, login, "op@example.com")
    r = api.post(URL, payload(target="test-club"), format="json")
    assert r.status_code == 400 and "target" in r.data
    r = api.post(URL, payload(target_type="event", target=str(mine.id)), format="json")
    assert r.status_code == 400 and "target" in r.data


def test_draft_events_cannot_be_reported(api, login, student, other):
    draft = make_event(other, status="draft")
    as_user(api, login, "s1@example.com")
    assert api.post(URL, payload(target_type="event", target=str(draft.id)), format="json").status_code == 400


def test_one_report_per_user_per_target(api, login, student, club, other):
    e = make_event(other)
    as_user(api, login, "s1@example.com")
    assert api.post(URL, payload(), format="json").status_code == 201
    assert api.post(URL, payload(reason="harassment"), format="json").status_code == 409
    assert api.post(URL, payload(target_type="event", target=str(e.id)), format="json").status_code == 201
    assert api.post(URL, payload(target_type="event", target=str(e.id)), format="json").status_code == 409
    as_user(api, login, "op@example.com")  # a different user may report the same club
    assert api.post(URL, payload(), format="json").status_code == 201


def test_list_shows_only_own_reports_with_status(api, login, student, club, other):
    as_user(api, login, "s1@example.com")
    api.post(URL, payload(), format="json")
    as_user(api, login, "other@example.com")  # reported club's operator
    api.post(URL, payload(target="test-club"), format="json")
    assert api.get(URL).data["count"] == 1        # their own report, not the one against them
    ContentReport.objects.filter(reporter=student.user).update(status="under_review")
    as_user(api, login, "s1@example.com")
    r = api.get(URL)
    assert r.data["count"] == 1 and r.data["results"][0]["status"] == "under_review"
    assert r.data["results"][0]["club"]["slug"] == "other-club"


def test_login_required(api):
    assert api.get(URL).status_code == 401
    assert api.post(URL, payload(), format="json").status_code == 401