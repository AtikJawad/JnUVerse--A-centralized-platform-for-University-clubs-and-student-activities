from datetime import timedelta

import pytest
from django.utils import timezone

from apps.clubs.models import ClubMembership
from apps.events.models import EventRegistration
from apps.feedback.models import EventRating
from tests.helpers import make_club, make_event, make_student

pytestmark = pytest.mark.django_db
BASE = "/api/analytics"


def as_user(api, login, ident):
    api.credentials(HTTP_AUTHORIZATION=f"Bearer {login(ident).data['access']}")


def ended(club, **kw):
    now = timezone.now()
    d = dict(title="Past", starts_at=now - timedelta(hours=3), ends_at=now - timedelta(hours=1), capacity=4)
    d.update(kw)
    return make_event(club, **d)


@pytest.fixture
def seeded(club):
    """One ended event (capacity 4): CSE s0 + English s1 attended and rated, CSE s2 registered only."""
    e = ended(club)
    students = []
    for i, dept in enumerate(["Computer Science and Engineering (CSE)", "English",
                              "Computer Science and Engineering (CSE)"]):
        s = make_student(f"B22030520{i}", f"an{i}@example.com")
        s.department = dept
        s.save()
        EventRegistration.objects.create(event=e, student=s, attended=i < 2)
        students.append(s)
    EventRating.objects.create(event=e, student=students[0], rating=5)
    EventRating.objects.create(event=e, student=students[1], rating=4)
    return e, students


# ---- Report 1: department participation ----
def test_department_participation(api, club, login, seeded):
    e, _ = seeded
    as_user(api, login, "op@example.com")
    r = api.get(f"{BASE}/events/{e.id}/department-participation/")
    assert r.status_code == 200
    assert r.data["totals"] == {"registered": 3, "attended": 2, "attendance_rate": 66.7}
    rows = {d["department"]: d for d in r.data["departments"]}
    cse = rows["Computer Science and Engineering (CSE)"]
    assert (cse["registered"], cse["attended"], cse["attendance_rate"], cse["share_of_attended"]) == (2, 1, 50.0, 50.0)
    assert rows["English"]["attended"] == 1


def test_department_report_needs_ended_published_event(api, club, login):
    as_user(api, login, "op@example.com")
    assert api.get(f"{BASE}/events/{make_event(club).id}/department-participation/").status_code == 409
    assert api.get(f"{BASE}/events/{ended(club, status='cancelled').id}/department-participation/").status_code == 409


def test_event_reports_permissions(api, club, login, seeded):
    e, _ = seeded
    draft = make_event(club, status="draft")
    make_club(name="Other", email="other@example.com")
    as_user(api, login, "other@example.com")
    for path in ("department-participation", "ratings"):
        assert api.get(f"{BASE}/events/{e.id}/{path}/").status_code == 403
        assert api.get(f"{BASE}/events/{draft.id}/{path}/").status_code == 404
    as_user(api, login, "an0@example.com")
    assert api.get(f"{BASE}/events/{e.id}/ratings/").status_code == 403
    api.credentials()
    assert api.get(f"{BASE}/events/{e.id}/ratings/").status_code in (401, 403)


# ---- Report 2: post-event rating ----
def test_post_event_rating_report(api, club, login, seeded):
    e, _ = seeded
    as_user(api, login, "op@example.com")
    r = api.get(f"{BASE}/events/{e.id}/ratings/")
    assert r.status_code == 200
    assert r.data["total_ratings"] == 2 and r.data["average"] == 4.5
    assert r.data["attended"] == 2 and r.data["response_rate"] == 100.0
    dist = {d["rating"]: d for d in r.data["distribution"]}
    assert [dist[i]["count"] for i in range(1, 6)] == [0, 0, 0, 1, 1]
    assert dist[5]["percent"] == 50.0 and dist[1]["percent"] == 0.0


def test_rating_report_with_no_ratings_and_cancelled(api, club, login):
    e = make_event(club)
    as_user(api, login, "op@example.com")
    r = api.get(f"{BASE}/events/{e.id}/ratings/")
    assert r.status_code == 200 and r.data["total_ratings"] == 0 and r.data["average"] is None
    assert r.data["response_rate"] is None and len(r.data["distribution"]) == 5
    assert api.get(f"{BASE}/events/{make_event(club, status='cancelled').id}/ratings/").status_code == 409


# ---- Report 3: club comparison ----
def test_club_comparison(api, club, login, seeded):
    other = make_club(name="Other Club", email="other@example.com")
    make_event(club, title="Upcoming", capacity=None)  # launched, not completed
    make_event(club, title="Cancelled", status="cancelled")
    make_event(club, title="Draft", status="draft")  # drafts are not launched
    as_user(api, login, "op@example.com")
    r = api.get(f"{BASE}/club-comparison/")
    assert r.status_code == 200
    rows = {c["club"]["slug"]: c for c in r.data["clubs"]}
    a, b = rows[club.slug], rows[other.slug]
    assert a["is_mine"] and not b["is_mine"]
    assert (a["events_launched"], a["cancelled_events"], a["completed_events"]) == (3, 1, 1)
    assert a["registrations"] == 3 and a["attended"] == 2
    assert a["attendance_rate"] == 66.7 and a["average_rating"] == 4.5 and a["rating_count"] == 2
    assert a["registration_rate"] == 75.0  # 3 registered / capacity 4 (events without a capacity are skipped)
    assert b["events_launched"] == 0 and b["registration_rate"] is None and b["average_rating"] is None
    assert r.data["clubs"][0]["club"]["slug"] == club.slug  # most events first


def test_club_comparison_period_and_permissions(api, club, login, seeded):
    as_user(api, login, "op@example.com")
    future = (timezone.now() + timedelta(days=30)).date().isoformat()
    r = api.get(f"{BASE}/club-comparison/", {"date_from": future})
    assert r.data["clubs"][0]["events_launched"] == 0
    assert api.get(f"{BASE}/club-comparison/", {"date_from": "2026-12-31", "date_to": "2026-01-01"}).status_code == 400
    assert api.get(f"{BASE}/club-comparison/", {"date_from": "not-a-date"}).status_code == 400
    as_user(api, login, "an0@example.com")
    assert api.get(f"{BASE}/club-comparison/").status_code == 403


# ---- Report 4: student activity ----
def test_student_activity(api, club, login, seeded):
    _, students = seeded
    ClubMembership.objects.create(student=students[0], club=club, status="approved")
    ClubMembership.objects.create(student=students[1], club=club, status="pending")
    as_user(api, login, "an0@example.com")
    r = api.get(f"{BASE}/student-activity/")
    assert r.status_code == 200
    assert r.data == {"clubs_joined": 1, "clubs_followed": 0, "events_registered": 1, "events_attended": 1,
                      "attendance_rate": 100.0, "ratings_given": 1, "activity_score": 3}
    as_user(api, login, "an2@example.com")  # registered but did not attend, no rating
    r = api.get(f"{BASE}/student-activity/")
    assert r.data["events_attended"] == 0 and r.data["attendance_rate"] == 0.0 and r.data["activity_score"] == 0


def test_student_activity_empty_and_permissions(api, club, login):
    make_student()
    as_user(api, login, "s1@example.com")
    r = api.get(f"{BASE}/student-activity/")
    assert r.status_code == 200 and r.data["activity_score"] == 0 and r.data["attendance_rate"] is None
    as_user(api, login, "op@example.com")
    assert api.get(f"{BASE}/student-activity/").status_code == 403
    api.credentials()
    assert api.get(f"{BASE}/student-activity/").status_code in (401, 403)


# ---- Report 5: a club's own report ----
def test_my_club_report(api, club, login, seeded):
    e, _ = seeded
    make_event(club, title="Upcoming", capacity=10)
    make_event(club, title="Cancelled", status="cancelled")
    make_event(club, title="Draft", status="draft")
    as_user(api, login, "op@example.com")
    r = api.get(f"{BASE}/my-club/")
    assert r.status_code == 200
    s = r.data["summary"]
    assert (s["events_launched"], s["cancelled_events"], s["completed_events"]) == (3, 1, 1)
    assert s["registrations"] == 3 and s["attended"] == 2 and s["attendance_rate"] == 66.7
    assert s["average_rating"] == 4.5 and s["rating_count"] == 2 and s["registration_rate"] == 21.4  # 3 / (4 + 10)
    assert len(r.data["events"]) == 3 and "Draft" not in [x["title"] for x in r.data["events"]]
    past = next(x for x in r.data["events"] if str(x["id"]) == str(e.id))
    assert past["fill_rate"] == 75.0 and past["attendance_rate"] == 66.7 and past["average_rating"] == 4.5
    assert str(r.data["best_rated_event"]["id"]) == str(e.id)
    assert sum(m["events_launched"] for m in r.data["monthly"]) == 3


def test_my_club_report_empty_club_and_permissions(api, club, login):
    as_user(api, login, "op@example.com")
    r = api.get(f"{BASE}/my-club/")
    assert r.status_code == 200 and r.data["events"] == [] and r.data["monthly"] == []
    assert r.data["best_rated_event"] is None and r.data["summary"]["average_rating"] is None
    assert api.get(f"{BASE}/my-club/", {"date_from": "bad"}).status_code == 400
    make_student()
    as_user(api, login, "s1@example.com")
    assert api.get(f"{BASE}/my-club/").status_code == 403


def test_my_club_report_only_shows_own_events(api, club, login):
    other = make_club(name="Other", email="other@example.com")
    make_event(other, title="Theirs")
    as_user(api, login, "op@example.com")
    assert api.get(f"{BASE}/my-club/").data["events"] == []
