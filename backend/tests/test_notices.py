import pytest

from apps.accounts.constants import DEPARTMENT_CHOICES
from apps.clubs.models import ClubFollow, ClubMembership
from apps.notifications.models import Notice
from tests.helpers import DEPT, make_club, make_student

pytestmark = pytest.mark.django_db
URL = "/api/notices/"
OTHER_DEPT = next(d for d, _ in DEPARTMENT_CHOICES if d != DEPT)


def as_user(api, login, ident):
    api.credentials(HTTP_AUTHORIZATION=f"Bearer {login(ident).data['access']}")


def titles(r):
    return {n["title"] for n in r.data["results"]}


def payload(**kw):
    d = {"title": "Hello", "body": "Text", "audience": "public"}
    d.update(kw)
    return d


@pytest.fixture
def notices(club):
    """One notice per audience; the department notice targets DEPT (the test student's department)."""
    return {
        a: Notice.objects.create(
            club=club, created_by=club.operator, title=a, body="b", audience=a,
            target_department=DEPT if a == "department" else "",
        )
        for a in ("public", "followers", "members", "department")
    }


@pytest.fixture
def outsider(db):
    p = make_student("B220305051", "s2@example.com")
    p.department = OTHER_DEPT
    p.save()
    return p


def test_anonymous_sees_public_only(api, notices):
    assert titles(api.get(URL)) == {"public"}


def test_student_sees_public_and_own_department(api, login, student, notices):
    as_user(api, login, "s1@example.com")
    assert titles(api.get(URL)) == {"public", "department"}


def test_follower_sees_followers_notices(api, login, student, club, notices):
    ClubFollow.objects.create(student=student, club=club)
    as_user(api, login, "s1@example.com")
    assert titles(api.get(URL)) == {"public", "followers", "department"}


def test_approved_member_sees_members_notices(api, login, student, club, notices):
    ClubMembership.objects.create(student=student, club=club, status="approved")
    as_user(api, login, "s1@example.com")
    assert titles(api.get(URL)) == {"public", "followers", "members", "department"}


def test_pending_member_gets_no_member_access(api, login, student, club, notices):
    ClubMembership.objects.create(student=student, club=club, status="pending")
    as_user(api, login, "s1@example.com")
    assert titles(api.get(URL)) == {"public", "department"}


def test_other_department_student_sees_public_only(api, login, outsider, notices):
    as_user(api, login, "s2@example.com")
    assert titles(api.get(URL)) == {"public"}


def test_operators_see_own_club_fully_others_public_only(api, login, club, notices):
    make_club("Other Club", "other@example.com")
    as_user(api, login, "op@example.com")
    assert titles(api.get(URL)) == {"public", "followers", "members", "department"}
    as_user(api, login, "other@example.com")
    assert titles(api.get(URL)) == {"public"}


def test_operator_creates_notice(api, login, club):
    as_user(api, login, "op@example.com")
    r = api.post(URL, payload(), format="json")
    assert r.status_code == 201
    assert r.data["club"]["slug"] == "test-club" and r.data["department"] is None
    assert Notice.objects.get().created_by == club.operator


def test_department_notice_created(api, login, club):
    as_user(api, login, "op@example.com")
    r = api.post(URL, payload(audience="department", department=DEPT), format="json")
    assert r.status_code == 201 and r.data["department"] == DEPT


@pytest.mark.parametrize("over,field", [
    ({"audience": "department"}, "department"),
    ({"audience": "public", "department": DEPT}, "department"),
    ({"audience": "everyone"}, "audience"),
    ({"audience": "department", "department": "Astrology"}, "department"),
    ({"title": ""}, "title"),
    ({"body": ""}, "body"),
])
def test_create_validation(api, login, club, over, field):
    as_user(api, login, "op@example.com")
    r = api.post(URL, payload(**over), format="json")
    assert r.status_code == 400 and field in r.data
    assert Notice.objects.count() == 0


def test_only_operators_create(api, login, student, club):
    assert api.post(URL, payload(), format="json").status_code == 401
    as_user(api, login, "s1@example.com")
    assert api.post(URL, payload(), format="json").status_code == 403


def test_club_and_mine_filters(api, login, student, club, notices):
    other = make_club("Other Club", "other@example.com")
    Notice.objects.create(club=other, created_by=other.operator, title="other public", body="b", audience="public")
    assert titles(api.get(URL, {"club": "test-club"})) == {"public"}
    assert api.get(URL, {"mine": "true"}).status_code == 401
    as_user(api, login, "s1@example.com")
    assert api.get(URL, {"mine": "true"}).status_code == 403
    as_user(api, login, "op@example.com")
    assert titles(api.get(URL, {"mine": "true"})) == {"public", "followers", "members", "department"}
    assert len(titles(api.get(URL))) == 5  # own four plus the other club's public notice


def test_detail_visibility(api, notices):
    assert api.get(f"{URL}{notices['public'].id}/").status_code == 200
    assert api.get(f"{URL}{notices['members'].id}/").status_code == 404


def test_owner_edits_title_and_body_only(api, login, club, notices):
    as_user(api, login, "op@example.com")
    r = api.patch(f"{URL}{notices['public'].id}/", {"title": "New", "body": "B2", "audience": "members"}, format="json")
    assert r.status_code == 200
    assert (r.data["title"], r.data["body"], r.data["audience"]) == ("New", "B2", "public")


def test_edit_permissions(api, login, student, club, notices):
    url = f"{URL}{notices['public'].id}/"
    assert api.patch(url, {"title": "x"}, format="json").status_code == 401
    as_user(api, login, "s1@example.com")
    assert api.patch(url, {"title": "x"}, format="json").status_code == 403
    make_club("Other Club", "other@example.com")
    as_user(api, login, "other@example.com")
    assert api.patch(url, {"title": "x"}, format="json").status_code == 403
    as_user(api, login, "op@example.com")
    assert api.put(url, payload(), format="json").status_code == 405


def test_delete_notice(api, login, club, notices):
    url = f"{URL}{notices['public'].id}/"
    make_club("Other Club", "other@example.com")
    as_user(api, login, "other@example.com")
    assert api.delete(url).status_code == 403
    as_user(api, login, "op@example.com")
    assert api.delete(url).status_code == 204
    assert api.delete(url).status_code == 404