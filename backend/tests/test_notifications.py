import pytest

from apps.accounts.constants import DEPARTMENT_CHOICES
from apps.clubs.models import ClubFollow, ClubMembership
from apps.events.models import EventRegistration
from apps.notifications.models import Notification
from tests.helpers import DEPT, make_event, make_student

pytestmark = pytest.mark.django_db
OTHER_DEPT = next(d for d, _ in DEPARTMENT_CHOICES if d != DEPT)
LIST = "/api/notifications/"


def as_user(api, login, ident):
    api.credentials(HTTP_AUTHORIZATION=f"Bearer {login(ident).data['access']}")


def who(**filters):
    return set(Notification.objects.filter(**filters).values_list("recipient__email", flat=True))


@pytest.fixture
def s2(db):
    return make_student("B220305051", "s2@example.com")


@pytest.fixture
def s3(db):
    return make_student("B220305052", "s3@example.com")


def post_notice(api, **kw):
    d = {"title": "T", "body": "B", "audience": "public"}
    d.update(kw)
    return api.post("/api/notices/", d, format="json")


def test_public_notice_notifies_followers_and_members_only(api, login, club, student, s2, s3):
    ClubFollow.objects.create(student=student, club=club)
    ClubMembership.objects.create(student=s2, club=club, status="approved")
    as_user(api, login, "op@example.com")
    assert post_notice(api).status_code == 201
    assert who(type="notice") == {"s1@example.com", "s2@example.com"}


def test_members_notice_notifies_approved_members_only(api, login, club, student, s2, s3):
    ClubFollow.objects.create(student=student, club=club)
    ClubMembership.objects.create(student=s2, club=club, status="approved")
    ClubMembership.objects.create(student=s3, club=club, status="pending")
    as_user(api, login, "op@example.com")
    assert post_notice(api, audience="members").status_code == 201
    assert who(type="notice") == {"s2@example.com"}


def test_department_notice_notifies_that_department(api, login, club, student, s2, s3):
    s3.department = OTHER_DEPT
    s3.save()
    as_user(api, login, "op@example.com")
    assert post_notice(api, audience="department", department=DEPT).status_code == 201
    assert who(type="notice") == {"s1@example.com", "s2@example.com"}


def test_publish_notifies_followers_and_members(api, login, club, student, s2, s3):
    ClubFollow.objects.create(student=student, club=club)
    ClubMembership.objects.create(student=s2, club=club, status="approved")
    ev = make_event(club, status="draft")
    as_user(api, login, "op@example.com")
    assert api.post(f"/api/events/{ev.id}/publish/").status_code == 200
    assert who(type="event_published", event=ev) == {"s1@example.com", "s2@example.com"}


def test_cancel_notifies_registered_students_only(api, login, club, student, s2):
    ev = make_event(club)
    EventRegistration.objects.create(event=ev, student=student)
    EventRegistration.objects.create(event=ev, student=s2, status="cancelled")
    as_user(api, login, "op@example.com")
    assert api.post(f"/api/events/{ev.id}/cancel/").status_code == 200
    assert who(type="event_cancelled", event=ev) == {"s1@example.com"}


def test_time_or_venue_change_notifies_once(api, login, club, student):
    ev = make_event(club)
    EventRegistration.objects.create(event=ev, student=student)
    as_user(api, login, "op@example.com")
    url = f"/api/events/{ev.id}/"
    assert api.patch(url, {"description": "More info"}, format="json").status_code == 200
    assert who(type="event_updated") == set()
    assert api.patch(url, {"venue": "New Hall"}, format="json").status_code == 200
    assert who(type="event_updated") == {"s1@example.com"}
    assert api.patch(url, {"venue": "Newer Hall"}, format="json").status_code == 200
    assert Notification.objects.filter(type="event_updated").count() == 1


def test_membership_request_approve_and_remove(api, login, club, student):
    as_user(api, login, "s1@example.com")
    assert api.post(f"/api/clubs/{club.slug}/membership/").status_code == 201
    assert who(type="membership_update") == {"op@example.com"}
    mid = ClubMembership.objects.get().id
    as_user(api, login, "op@example.com")
    assert api.post(f"/api/clubs/{club.slug}/memberships/{mid}/approve/").status_code == 200
    assert api.delete(f"/api/clubs/{club.slug}/memberships/{mid}/").status_code == 204
    mine = Notification.objects.filter(recipient__email="s1@example.com")
    assert set(mine.values_list("title", flat=True)) == {"Membership approved", "Removed from club"}


def test_membership_reject_notifies_student(api, login, club, student):
    m = ClubMembership.objects.create(student=student, club=club)
    as_user(api, login, "op@example.com")
    assert api.post(f"/api/clubs/{club.slug}/memberships/{m.id}/reject/").status_code == 200
    assert Notification.objects.get(recipient__email="s1@example.com").title == "Membership rejected"


@pytest.fixture
def inbox(student, club):
    return [Notification.objects.create(recipient=student.user, type="notice", title=f"n{i}", message="m")
            for i in range(3)]


def test_list_is_own_and_unread_filter(api, login, inbox, club):
    Notification.objects.create(recipient=club.operator, type="notice", title="other", message="m")
    as_user(api, login, "s1@example.com")
    r = api.get(LIST)
    assert r.data["count"] == 3 and {n["title"] for n in r.data["results"]} == {"n0", "n1", "n2"}
    assert all(n["is_read"] is False and n["notice"] is None for n in r.data["results"])
    assert api.post(f"{LIST}{inbox[0].id}/read/").status_code == 200
    assert api.get(LIST, {"unread": "true"}).data["count"] == 2


def test_unread_count_and_mark_read_is_idempotent(api, login, inbox):
    as_user(api, login, "s1@example.com")
    assert api.get(f"{LIST}unread-count/").data == {"unread_count": 3}
    first = api.post(f"{LIST}{inbox[0].id}/read/").data
    again = api.post(f"{LIST}{inbox[0].id}/read/").data
    assert first["is_read"] is True and first["read_at"] == again["read_at"]
    assert api.get(f"{LIST}unread-count/").data == {"unread_count": 2}


def test_cannot_read_someone_elses_notification(api, login, inbox, s2):
    as_user(api, login, "s2@example.com")
    assert api.post(f"{LIST}{inbox[0].id}/read/").status_code == 404


def test_read_all(api, login, inbox):
    as_user(api, login, "s1@example.com")
    assert api.post(f"{LIST}read-all/").data == {"updated": 3}
    assert api.get(f"{LIST}unread-count/").data == {"unread_count": 0}
    assert api.post(f"{LIST}read-all/").data == {"updated": 0}


def test_login_required(api, inbox):
    assert api.get(LIST).status_code == 401
    assert api.get(f"{LIST}unread-count/").status_code == 401
    assert api.post(f"{LIST}read-all/").status_code == 401


def test_operator_has_own_inbox(api, login, club):
    Notification.objects.create(recipient=club.operator, type="membership_update", title="x", message="m")
    as_user(api, login, "op@example.com")
    assert api.get(LIST).data["count"] == 1