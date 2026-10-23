from datetime import timedelta

import pytest
from django.utils import timezone

from apps.clubs.models import ClubFollow, ClubMembership
from tests.helpers import make_student

pytestmark = pytest.mark.django_db


def as_user(api, login, ident):
    api.credentials(HTTP_AUTHORIZATION=f"Bearer {login(ident).data['access']}")


def murl(club):
    return f"/api/clubs/{club.slug}/membership/"


def test_request_is_idempotent(api, login, club, student):
    as_user(api, login, "s1@example.com")
    assert api.get(murl(club)).data == {"status": None, "requested_at": None}
    r = api.post(murl(club))
    assert r.status_code == 201 and r.data["status"] == "pending"
    assert api.post(murl(club)).status_code == 200
    assert ClubMembership.objects.count() == 1
    assert api.get(murl(club)).data["status"] == "pending"
    assert api.get(f"/api/clubs/{club.slug}/").data["my_membership"] == "pending"


def test_public_member_count_is_approved_only(api, login, club, student):
    s2 = make_student("B220305051", "s2@example.com")
    ClubMembership.objects.create(student=student, club=club, status="approved")
    ClubMembership.objects.create(student=s2, club=club, status="pending")
    assert api.get(f"/api/clubs/{club.slug}/").data["member_count"] == 1   # anonymous view
    as_user(api, login, "s1@example.com")
    assert api.get(f"/api/clubs/{club.slug}/").data["my_membership"] == "approved"
    assert api.post(murl(club)).status_code == 200                           # already a member: no change
    assert ClubMembership.objects.get(student=student).status == "approved"


def test_leave_approved_member_is_idempotent(api, login, club, student):
    ClubMembership.objects.create(student=student, club=club, status="approved")
    as_user(api, login, "s1@example.com")
    assert api.delete(murl(club)).status_code == 204
    assert ClubMembership.objects.get().status == "left"
    assert api.delete(murl(club)).status_code == 204
    assert ClubMembership.objects.get().status == "left"
    assert api.get(f"/api/clubs/{club.slug}/").data["member_count"] == 0


def test_cancel_pending_request(api, login, club, student):
    as_user(api, login, "s1@example.com")
    api.post(murl(club))
    assert api.delete(murl(club)).status_code == 204
    assert ClubMembership.objects.get().status == "left"


def test_delete_without_membership_is_noop(api, login, club, student):
    as_user(api, login, "s1@example.com")
    assert api.delete(murl(club)).status_code == 204
    assert ClubMembership.objects.count() == 0


@pytest.mark.parametrize("old", ["rejected", "left", "removed"])
def test_rejoin_resets_same_row(api, login, club, student, old):
    old_time = timezone.now() - timedelta(days=3)
    m = ClubMembership.objects.create(student=student, club=club, status=old, requested_at=old_time,
                                      reviewed_at=old_time, reviewed_by=club.operator)
    as_user(api, login, "s1@example.com")
    r = api.post(murl(club))
    assert r.status_code == 201 and r.data["status"] == "pending"
    m.refresh_from_db()
    assert m.status == "pending" and m.requested_at > old_time
    assert m.reviewed_at is None and m.reviewed_by is None
    assert ClubMembership.objects.count() == 1


def test_membership_permissions(api, login, club, student):
    for call in (api.get, api.post, api.delete):
        assert call(murl(club)).status_code == 401
    as_user(api, login, "op@example.com")
    for call in (api.get, api.post, api.delete):
        assert call(murl(club)).status_code == 403
    as_user(api, login, "s1@example.com")
    assert api.post("/api/clubs/no-such-club/membership/").status_code == 404


def test_my_membership_is_null_for_non_students(api, login, club, student):
    detail = f"/api/clubs/{club.slug}/"
    assert api.get(detail).data["my_membership"] is None
    as_user(api, login, "op@example.com")
    assert api.get(detail).data["my_membership"] is None
    as_user(api, login, "s1@example.com")
    assert api.get(detail).data["my_membership"] is None   # student with no membership


def test_membership_is_independent_of_following(api, login, club, student):
    as_user(api, login, "s1@example.com")
    api.post(murl(club))
    ClubMembership.objects.filter(student=student).update(status="approved")
    assert ClubFollow.objects.count() == 0
    api.delete(murl(club))
    ClubFollow.objects.create(student=student, club=club)
    assert ClubFollow.objects.count() == 1