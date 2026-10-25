import pytest

from apps.clubs.models import ClubFollow, ClubMembership
from tests.helpers import make_club

pytestmark = pytest.mark.django_db
URL = "/api/clubs/"


def as_user(api, login, ident):
    api.credentials(HTTP_AUTHORIZATION=f"Bearer {login(ident).data['access']}")


def names(r):
    return [c["name"] for c in r.data["results"]]


@pytest.fixture
def clubs(club, student):
    other = make_club("Other Club", "other@example.com")
    third = make_club("Third Club", "third@example.com")
    ClubFollow.objects.create(student=student, club=club)                          # follows Test Club
    ClubMembership.objects.create(student=student, club=other, status="approved")  # member of Other Club
    ClubMembership.objects.create(student=student, club=third, status="pending")   # only pending at Third Club
    return club, other, third


def test_joined_returns_only_approved(api, login, clubs):
    as_user(api, login, "s1@example.com")
    assert names(api.get(URL, {"joined": "true"})) == ["Other Club"]


def test_following_filter(api, login, clubs):
    as_user(api, login, "s1@example.com")
    assert names(api.get(URL, {"following": "true"})) == ["Test Club"]


def test_both_filters_combine(api, login, clubs, student):
    as_user(api, login, "s1@example.com")
    assert names(api.get(URL, {"joined": "true", "following": "true"})) == []
    ClubFollow.objects.create(student=student, club=clubs[1])
    assert names(api.get(URL, {"joined": "true", "following": "true"})) == ["Other Club"]


def test_filters_require_a_student(api, login, clubs):
    assert api.get(URL, {"joined": "true"}).status_code == 401
    assert api.get(URL, {"following": "true"}).status_code == 401
    as_user(api, login, "op@example.com")
    assert api.get(URL, {"joined": "true"}).status_code == 403


def test_false_or_missing_means_no_filter(api, login, clubs):
    as_user(api, login, "s1@example.com")
    assert len(names(api.get(URL))) == 3
    assert len(names(api.get(URL, {"joined": "false", "following": "false"}))) == 3