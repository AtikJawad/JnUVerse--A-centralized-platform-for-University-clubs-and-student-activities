from datetime import timedelta

import pytest
from django.utils import timezone

from apps.accounts.models import Interest
from apps.clubs.models import ClubFollow, ClubMembership
from apps.collaborations.models import CollaborationRequest
from apps.events.models import EventRegistration
from apps.feedback.models import EventRating
from apps.notifications.models import Notification
from tests.helpers import make_club, make_event, make_student

pytestmark = pytest.mark.django_db
S, C = "/api/dashboard/student/", "/api/dashboard/club/"


def as_user(api, login, ident):
    api.credentials(HTTP_AUTHORIZATION=f"Bearer {login(ident).data['access']}")


def future(club, days, **kw):
    start = timezone.now() + timedelta(days=days)
    return make_event(club, starts_at=start, ends_at=start + timedelta(hours=2), **kw)


def past(club, hours_ago, **kw):
    end = timezone.now() - timedelta(hours=hours_ago)
    return make_event(club, starts_at=end - timedelta(hours=2), ends_at=end, **kw)


def register(event, student, **kw):
    return EventRegistration.objects.create(event=event, student=student, **kw)


def titles(events):
    return [e["title"] for e in events]


def test_student_dashboard_empty(api, login, student, club):
    as_user(api, login, "s1@example.com")
    r = api.get(S)
    assert r.status_code == 200
    assert r.data["has_interests"] is False
    assert r.data["counts"] == {
        "clubs_followed": 0, "clubs_joined": 0, "pending_membership_requests": 0,
        "unread_notifications": 0, "events_registered_upcoming": 0, "events_to_rate": 0}
    assert (r.data["next_events"], r.data["rating_prompts"], r.data["suggested_clubs"]) == ([], [], [])


def test_student_counts(api, login, student, club):
    other, third = make_club("Other Club", "other@example.com"), make_club("Third Club", "third@example.com")
    ClubFollow.objects.create(student=student, club=club)
    ClubMembership.objects.create(student=student, club=other, status="approved")
    ClubMembership.objects.create(student=student, club=third, status="pending")
    Notification.objects.create(recipient=student.user, type="notice", title="a", message="m")
    Notification.objects.create(recipient=student.user, type="notice", title="b", message="m",
                                read_at=timezone.now())
    register(future(club, 2), student)                          # counts as upcoming
    register(future(club, 3, status="cancelled"), student)      # cancelled: not upcoming
    register(past(club, 24 * 20), student)                      # old: not upcoming, too late to rate
    register(past(club, 3), student)                            # recent: can be rated
    as_user(api, login, "s1@example.com")
    assert api.get(S).data["counts"] == {
        "clubs_followed": 1, "clubs_joined": 1, "pending_membership_requests": 1,
        "unread_notifications": 1, "events_registered_upcoming": 1, "events_to_rate": 1}


def test_student_next_events_sorted_and_limited(api, login, student, club):
    for d in (5, 1, 6, 3, 2, 4):
        register(future(club, d, title=f"d{d}"), student)
    as_user(api, login, "s1@example.com")
    r = api.get(S)
    assert titles(r.data["next_events"]) == ["d1", "d2", "d3", "d4", "d5"]
    assert r.data["counts"]["events_registered_upcoming"] == 6


def test_student_rating_prompts(api, login, student, club):
    s2 = make_student("B220305051", "s2@example.com")
    a = past(club, 1, title="A")
    rated = past(club, 1, title="B")
    old = past(club, 8 * 24, title="C")
    not_registered = past(club, 1, title="D")
    cancelled = past(club, 1, title="E", status="cancelled")
    for e in (a, rated, old, cancelled):
        register(e, student)
    register(not_registered, s2)
    EventRating.objects.create(event=rated, student=student, rating=4)
    as_user(api, login, "s1@example.com")
    r = api.get(S)
    assert titles(r.data["rating_prompts"]) == ["A"]
    assert r.data["counts"]["events_to_rate"] == 1


def test_student_suggestions_by_interest(api, login, student):
    i1, i2, i3 = list(Interest.objects.order_by("name")[:3])
    student.interests.set([i1, i2])
    clubs = {n: make_club(f"Club {n}", f"{n.lower()}@example.com") for n in "ABCDEF"}
    for name, interests in {"A": [i1, i2], "B": [i1], "C": [i3], "D": [i1], "E": [i2], "F": [i1]}.items():
        clubs[name].interests.set(interests)
    ClubFollow.objects.create(student=student, club=clubs["D"])                        # already follows
    ClubMembership.objects.create(student=student, club=clubs["E"], status="pending")  # already requested
    s2 = make_student("B220305051", "s2@example.com")
    ClubFollow.objects.create(student=s2, club=clubs["F"])                             # F is more popular than B
    as_user(api, login, "s1@example.com")
    r = api.get(S)
    assert r.data["has_interests"] is True
    assert [c["name"] for c in r.data["suggested_clubs"]] == ["Club A", "Club F", "Club B"]


def test_student_dashboard_permissions(api, login, club):
    assert api.get(S).status_code == 401
    as_user(api, login, "op@example.com")
    assert api.get(S).status_code == 403


def test_club_counts_and_isolation(api, login, student, club):
    s2 = make_student("B220305051", "s2@example.com")
    other, third = make_club("Other Club", "other@example.com"), make_club("Third Club", "third@example.com")
    ClubFollow.objects.create(student=student, club=club)
    ClubFollow.objects.create(student=s2, club=club)
    ClubFollow.objects.create(student=student, club=other)                  # other club: not counted
    ClubMembership.objects.create(student=student, club=club, status="approved")
    ClubMembership.objects.create(student=s2, club=club, status="pending")
    ClubMembership.objects.create(student=s2, club=other, status="approved")
    now = timezone.now()
    future(club, 1)
    make_event(club, starts_at=now - timedelta(hours=1), ends_at=now + timedelta(hours=1))  # ongoing counts
    future(club, 2, status="draft")
    future(club, 3, status="cancelled")
    past(club, 5)
    future(other, 1)
    CollaborationRequest.objects.create(requesting_club=other, target_club=club, title="in")
    CollaborationRequest.objects.create(requesting_club=club, target_club=third, title="out")
    Notification.objects.create(recipient=club.operator, type="membership_update", title="n", message="m")
    as_user(api, login, "op@example.com")
    r = api.get(C)
    assert r.data["club"]["slug"] == "test-club"
    assert r.data["counts"] == {
        "followers": 2, "members": 1, "pending_membership_requests": 1, "upcoming_events": 2,
        "draft_events": 1, "pending_collaboration_requests": 1, "unread_notifications": 1}


def test_club_next_events(api, login, club):
    now = timezone.now()
    future(club, 3, title="late")
    future(club, 1, title="soon")
    make_event(club, title="ongoing", starts_at=now - timedelta(hours=1), ends_at=now + timedelta(hours=1))
    future(club, 2, title="draft", status="draft")
    future(club, 2, title="called off", status="cancelled")
    past(club, 5, title="over")
    as_user(api, login, "op@example.com")
    assert titles(api.get(C).data["next_events"]) == ["ongoing", "soon", "late"]


def test_club_ratings_recent_events_and_registrations(api, login, student, club):
    s2, s3 = make_student("B220305051", "s2@example.com"), make_student("B220305052", "s3@example.com")
    old, new = past(club, 48, title="old"), past(club, 1, title="new")
    past(club, 5, title="called off", status="cancelled")
    future(club, 1, title="later")
    EventRating.objects.create(event=old, student=student, rating=5)
    EventRating.objects.create(event=old, student=s2, rating=4)
    register(old, student)
    register(old, s2)
    register(new, s3, registered_at=timezone.now() - timedelta(days=8))         # too old to count
    register(new, student, status="cancelled")                                   # cancelled: not counted
    as_user(api, login, "op@example.com")
    r = api.get(C)
    assert r.data["ratings"] == {"average": 4.5, "count": 2}
    assert r.data["registrations_last_7_days"] == 2
    assert titles(r.data["recent_events"]) == ["new", "old"]
    by_title = {e["title"]: e for e in r.data["recent_events"]}
    assert (by_title["new"]["average_rating"], by_title["new"]["rating_count"]) == (None, 0)
    assert (by_title["old"]["average_rating"], by_title["old"]["rating_count"]) == (4.5, 2)


def test_club_dashboard_empty_and_permissions(api, login, student, club):
    assert api.get(C).status_code == 401
    as_user(api, login, "s1@example.com")
    assert api.get(C).status_code == 403
    as_user(api, login, "op@example.com")
    r = api.get(C)
    assert r.status_code == 200
    assert r.data["counts"] == {
        "followers": 0, "members": 0, "pending_membership_requests": 0, "upcoming_events": 0,
        "draft_events": 0, "pending_collaboration_requests": 0, "unread_notifications": 0}
    assert r.data["ratings"] == {"average": None, "count": 0}
    assert (r.data["next_events"], r.data["recent_events"], r.data["registrations_last_7_days"]) == ([], [], 0)