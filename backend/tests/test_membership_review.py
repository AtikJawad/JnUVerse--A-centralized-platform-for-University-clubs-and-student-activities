import pytest

from apps.clubs.models import ClubMembership
from tests.helpers import make_club, make_student

pytestmark = pytest.mark.django_db
ZERO = "00000000-0000-0000-0000-000000000000"


def as_user(api, login, ident):
    api.credentials(HTTP_AUTHORIZATION=f"Bearer {login(ident).data['access']}")


def base(club):
    return f"/api/clubs/{club.slug}"


def mk(club, student, status="pending"):
    return ClubMembership.objects.create(student=student, club=club, status=status)


def test_lists_show_only_the_right_status(api, login, club, student):
    s2, s3 = make_student("B220305051", "s2@example.com"), make_student("B220305052", "s3@example.com")
    mk(club, s2)
    mk(club, student, "approved")
    mk(club, s3, "rejected")
    as_user(api, login, "op@example.com")
    req = api.get(f"{base(club)}/membership-requests/")
    assert req.status_code == 200 and [m["student_id"] for m in req.data["results"]] == ["B220305051"]
    assert set(req.data["results"][0]) == {"id", "student_id", "name", "department", "batch",
                                            "status", "requested_at", "reviewed_at"}
    mem = api.get(f"{base(club)}/members/")
    assert [m["student_id"] for m in mem.data["results"]] == ["B220305050"]


def test_approve(api, login, club, student):
    m = mk(club, student)
    url = f"{base(club)}/memberships/{m.id}/approve/"
    as_user(api, login, "op@example.com")
    r = api.post(url)
    assert r.status_code == 200 and r.data["status"] == "approved"
    m.refresh_from_db()
    assert m.reviewed_by == club.operator and m.reviewed_at is not None
    assert api.get(f"{base(club)}/").data["member_count"] == 1
    assert api.post(url).status_code == 409
    as_user(api, login, "s1@example.com")
    assert api.get(f"{base(club)}/").data["my_membership"] == "approved"


def test_reject_then_student_can_rerequest(api, login, club, student):
    m = mk(club, student)
    as_user(api, login, "op@example.com")
    assert api.post(f"{base(club)}/memberships/{m.id}/reject/").data["status"] == "rejected"
    assert api.get(f"{base(club)}/").data["member_count"] == 0
    as_user(api, login, "s1@example.com")
    r = api.post(f"{base(club)}/membership/")
    assert r.status_code == 201 and r.data["status"] == "pending"


def test_remove_member(api, login, club, student):
    m = mk(club, student, "approved")
    url = f"{base(club)}/memberships/{m.id}/"
    as_user(api, login, "op@example.com")
    assert api.delete(url).status_code == 204
    m.refresh_from_db()
    assert m.status == "removed" and m.reviewed_by == club.operator and m.reviewed_at is not None
    assert api.get(f"{base(club)}/").data["member_count"] == 0
    assert api.delete(url).status_code == 409                 # no longer approved
    as_user(api, login, "s1@example.com")
    assert api.post(f"{base(club)}/membership/").status_code == 201   # may rejoin


@pytest.mark.parametrize("old", ["rejected", "left", "removed", "approved"])
def test_only_pending_can_be_approved_or_rejected(api, login, club, student, old):
    m = mk(club, student, old)
    as_user(api, login, "op@example.com")
    for action in ("approve", "reject"):
        assert api.post(f"{base(club)}/memberships/{m.id}/{action}/").status_code == 409
    m.refresh_from_db()
    assert m.status == old


def test_review_permissions(api, login, club, student):
    make_club("Other Club", "other@example.com")
    m = mk(club, student)
    calls = [("get", f"{base(club)}/members/"), ("get", f"{base(club)}/membership-requests/"),
             ("post", f"{base(club)}/memberships/{m.id}/approve/"),
             ("post", f"{base(club)}/memberships/{m.id}/reject/"),
             ("delete", f"{base(club)}/memberships/{m.id}/")]
    for verb, url in calls:
        assert getattr(api, verb)(url).status_code == 401
    for ident in ("s1@example.com", "other@example.com"):      # a student, then another club's operator
        as_user(api, login, ident)
        for verb, url in calls:
            assert getattr(api, verb)(url).status_code == 403
    assert ClubMembership.objects.get().status == "pending"
    as_user(api, login, "op@example.com")
    assert api.get("/api/clubs/no-such-club/members/").status_code == 404
    assert api.post(f"{base(club)}/memberships/{ZERO}/approve/").status_code == 404
    other_club = make_club("Third Club", "third@example.com")
    foreign = mk(other_club, make_student("B220305053", "s4@example.com"))
    assert api.post(f"{base(club)}/memberships/{foreign.id}/approve/").status_code == 404