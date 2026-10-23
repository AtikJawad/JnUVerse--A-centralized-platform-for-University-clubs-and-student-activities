import pytest

from apps.clubs.models import ClubFollow
from tests.helpers import make_student

pytestmark = pytest.mark.django_db


def as_user(api, login, ident):
    api.credentials(HTTP_AUTHORIZATION=f"Bearer {login(ident).data['access']}")


def test_follow_and_unfollow_are_idempotent(api, login, club, student):
    as_user(api, login, "s1@example.com")
    url = f"/api/clubs/{club.slug}/follow/"
    r = api.post(url)
    assert r.status_code == 201 and r.data == {"following": True, "follower_count": 1}
    r = api.post(url)
    assert r.status_code == 200 and r.data["follower_count"] == 1
    assert ClubFollow.objects.count() == 1
    assert api.delete(url).status_code == 204
    assert api.delete(url).status_code == 204
    assert ClubFollow.objects.count() == 0


def test_follow_permissions(api, login, club, student):
    url = f"/api/clubs/{club.slug}/follow/"
    assert api.post(url).status_code == 401
    as_user(api, login, "op@example.com")
    assert api.post(url).status_code == 403
    as_user(api, login, "s1@example.com")
    assert api.post("/api/clubs/no-such-club/follow/").status_code == 404


def test_follower_count_across_students(api, login, club, student):
    make_student("B220305051", "s2@example.com")
    for email in ("s1@example.com", "s2@example.com"):
        as_user(api, login, email)
        r = api.post(f"/api/clubs/{club.slug}/follow/")
    assert r.data["follower_count"] == 2
    assert api.get(f"/api/clubs/{club.slug}/").data["follower_count"] == 2


def test_is_following_flag(api, login, club, student):
    detail = f"/api/clubs/{club.slug}/"
    assert api.get(detail).data["is_following"] is None          # anonymous
    as_user(api, login, "op@example.com")
    assert api.get(detail).data["is_following"] is None          # club operator
    as_user(api, login, "s1@example.com")
    assert api.get(detail).data["is_following"] is False
    api.post(f"{detail}follow/")
    assert api.get(detail).data["is_following"] is True
    assert api.get("/api/clubs/").data["results"][0]["is_following"] is True