import pytest

from apps.clubs.models import ClubFollow, ClubMembership
from tests.helpers import make_club, make_student

pytestmark = pytest.mark.django_db
URL = "/api/clubs/"


def as_user(api, login, ident):
    api.credentials(HTTP_AUTHORIZATION=f"Bearer {login(ident).data['access']}")


def test_list_is_public_paginated_and_searchable(api, club):
    make_club("Debating Society", "d@example.com")
    r = api.get(URL)
    assert r.status_code == 200 and r.data["count"] == 2 and {"next", "previous", "results"} <= set(r.data)
    assert [c["name"] for c in r.data["results"]] == ["Debating Society", "Test Club"]
    r = api.get(URL, {"search": "debat"})
    assert [c["slug"] for c in r.data["results"]] == ["debating-society"]


def test_detail_and_counts(api, club, student):
    s2 = make_student("B220305051", "s2@example.com")
    ClubFollow.objects.create(student=student, club=club)
    ClubFollow.objects.create(student=s2, club=club)
    ClubMembership.objects.create(student=student, club=club, status="approved")
    ClubMembership.objects.create(student=s2, club=club)  # pending: not counted
    r = api.get(f"{URL}{club.slug}/")
    assert r.status_code == 200 and (r.data["follower_count"], r.data["member_count"]) == (2, 1)
    assert r.data["is_verified"] is True
    assert api.get(f"{URL}no-such-club/").status_code == 404


def test_owner_updates_only_allowed_fields(api, login, club):
    as_user(api, login, "op@example.com")
    r = api.patch(f"{URL}{club.slug}/", {"description": "New", "contact_email": "c@example.com",
                                          "name": "Hacked", "slug": "hacked"}, format="json")
    assert r.status_code == 200 and r.data["description"] == "New"
    assert r.data["name"] == "Test Club" and r.data["slug"] == "test-club"
    club.refresh_from_db()
    assert club.contact_email == "c@example.com"


def test_update_validation(api, login, club):
    as_user(api, login, "op@example.com")
    r = api.patch(f"{URL}{club.slug}/", {"contact_email": "not-an-email"}, format="json")
    assert r.status_code == 400 and "contact_email" in r.data


def test_non_owners_cannot_update(api, login, club, student):
    make_club("Other Club", "other@example.com")
    body = {"description": "x"}
    assert api.patch(f"{URL}{club.slug}/", body, format="json").status_code == 401
    as_user(api, login, "s1@example.com")
    assert api.patch(f"{URL}{club.slug}/", body, format="json").status_code == 403
    as_user(api, login, "other@example.com")
    assert api.patch(f"{URL}{club.slug}/", body, format="json").status_code == 403
    as_user(api, login, "op@example.com")
    assert api.put(f"{URL}{club.slug}/", body, format="json").status_code == 405