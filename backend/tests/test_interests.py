import uuid

import pytest

from apps.accounts.models import Interest
from tests.helpers import make_club

pytestmark = pytest.mark.django_db
ME = "/api/auth/me/interests/"
CLUB = "/api/clubs/test-club/"


def as_user(api, login, ident):
    api.credentials(HTTP_AUTHORIZATION=f"Bearer {login(ident).data['access']}")


def three():
    return list(Interest.objects.order_by("name")[:3])


def ids(*objs):
    return [str(o.id) for o in objs]


def names(r):
    return {i["name"] for i in r.data["interests"]}


def test_interest_list_is_public(api):
    r = api.get("/api/auth/interests/")
    assert r.status_code == 200
    assert len(r.data["interests"]) == Interest.objects.count() >= 1
    assert set(r.data["interests"][0]) == {"id", "name"}


def test_student_sets_replaces_and_clears_interests(api, login, student):
    a, b, c = three()
    as_user(api, login, "s1@example.com")
    assert names(api.put(ME, {"interests": ids(a, b)}, format="json")) == {a.name, b.name}
    assert names(api.put(ME, {"interests": ids(c)}, format="json")) == {c.name}
    assert names(api.get(ME)) == {c.name}
    assert api.put(ME, {"interests": []}, format="json").data["interests"] == []
    assert api.get(ME).data["interests"] == []


@pytest.mark.parametrize("body", [{"interests": [str(uuid.uuid4())]}, {}, {"interests": "x"}])
def test_student_interest_validation(api, login, student, body):
    as_user(api, login, "s1@example.com")
    r = api.put(ME, body, format="json")
    assert r.status_code == 400 and "interests" in r.data


def test_my_interests_students_only(api, login, club):
    assert api.get(ME).status_code == 401
    as_user(api, login, "op@example.com")
    assert api.get(ME).status_code == 403
    assert api.put(ME, {"interests": []}, format="json").status_code == 403


def test_operator_sets_club_interests(api, login, club):
    a, b, c = three()
    as_user(api, login, "op@example.com")
    assert names(api.patch(CLUB, {"interests": ids(a, b)}, format="json")) == {a.name, b.name}
    assert names(api.patch(CLUB, {"interests": ids(c)}, format="json")) == {c.name}
    assert names(api.patch(CLUB, {"description": "x"}, format="json")) == {c.name}  # untouched
    assert api.patch(CLUB, {"interests": []}, format="json").data["interests"] == []


def test_club_interest_validation_and_permissions(api, login, club, student):
    a = three()[0]
    as_user(api, login, "op@example.com")
    r = api.patch(CLUB, {"interests": [str(uuid.uuid4())]}, format="json")
    assert r.status_code == 400 and "interests" in r.data
    make_club("Other Club", "other@example.com")
    as_user(api, login, "other@example.com")
    assert api.patch(CLUB, {"interests": ids(a)}, format="json").status_code == 403
    as_user(api, login, "s1@example.com")
    assert api.patch(CLUB, {"interests": ids(a)}, format="json").status_code == 403


def test_interests_show_on_club_list_and_detail(api, club):
    a = three()[0]
    club.interests.set([a])
    expected = [{"id": str(a.id), "name": a.name}]
    assert api.get("/api/clubs/").data["results"][0]["interests"] == expected
    assert api.get(CLUB).data["interests"] == expected