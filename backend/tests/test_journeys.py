"""The four end-to-end journeys from the Week 9 handoff, through the public API only."""
import json
from datetime import timedelta

import pytest
from django.utils import timezone

from apps.events.models import EventRegistration
from tests.helpers import PASSWORD, make_event, make_student, student_payload

pytestmark = pytest.mark.django_db


def as_user(api, login, ident):
    api.credentials(HTTP_AUTHORIZATION=f"Bearer {login(ident).data['access']}")


def test_journey_1_student_onboarding(api, records):
    assert api.post("/api/auth/register/student/", student_payload(), format="json").status_code == 201
    r = api.post("/api/auth/login/", {"identifier": "B220305043", "password": PASSWORD}, format="json")
    assert r.status_code == 200 and r.data["user"]["role"] == "student"
    api.credentials(HTTP_AUTHORIZATION=f"Bearer {r.data['access']}")
    me = api.get("/api/auth/me/")
    assert me.status_code == 200 and me.data["student_id"] == "B220305043" and me.data["email"] == "atikjawad@gmail.com"
    # a refresh token keeps the session alive
    assert api.post("/api/auth/refresh/", {"refresh": r.data["refresh"]}, format="json").status_code == 200


def test_journey_2_club_engagement(api, login, club, student):
    as_user(api, login, "s1@example.com")
    found = api.get("/api/clubs/", {"search": "Test"})
    assert found.status_code == 200 and [c["slug"] for c in found.data["results"]] == [club.slug]
    assert api.post(f"/api/clubs/{club.slug}/follow/").status_code == 201
    assert api.post(f"/api/clubs/{club.slug}/membership/").data["status"] == "pending"
    detail = api.get(f"/api/clubs/{club.slug}/").data
    assert detail["is_following"] is True and detail["my_membership"] == "pending" and detail["follower_count"] == 1


def test_journey_3_operator_lifecycle_never_exposes_student_email(api, login, club, student):
    as_user(api, login, "s1@example.com")
    api.post(f"/api/clubs/{club.slug}/membership/")
    login_resp = login("op@example.com")
    assert login_resp.data["user"]["club"]["slug"] == club.slug  # operators get their club at login
    api.credentials(HTTP_AUTHORIZATION=f"Bearer {login_resp.data['access']}")
    queue = api.get(f"/api/clubs/{club.slug}/membership-requests/")
    assert queue.status_code == 200 and len(queue.data["results"]) == 1
    membership_id = queue.data["results"][0]["id"]
    approved = api.post(f"/api/clubs/{club.slug}/memberships/{membership_id}/approve/")
    assert approved.status_code == 200 and approved.data["status"] == "approved"
    members = api.get(f"/api/clubs/{club.slug}/members/")
    for resp in (queue, approved, members):
        assert "s1@example.com" not in json.dumps(resp.data, default=str)
        assert "email" not in json.dumps(resp.data, default=str).lower()
    assert api.post(f"/api/clubs/{club.slug}/memberships/{membership_id}/approve/").status_code == 409


def test_journey_4_event_lifecycle_to_rating(api, login, club, student):
    make_student("B220305051", "s2@example.com")
    as_user(api, login, "op@example.com")
    start = timezone.now() + timedelta(days=3)
    body = {"title": "Workshop", "description": "d", "venue": "Room 1", "capacity": 1,
            "starts_at": start.isoformat(), "ends_at": (start + timedelta(hours=2)).isoformat()}
    created = api.post("/api/events/", body, format="json")
    assert created.status_code == 201 and created.data["status"] == "draft"
    event_id = created.data["id"]
    api.credentials()
    assert api.get(f"/api/events/{event_id}/").status_code == 404  # drafts are invisible to the public
    as_user(api, login, "op@example.com")
    assert api.post(f"/api/events/{event_id}/publish/").status_code == 200

    as_user(api, login, "s1@example.com")
    reg = api.post(f"/api/events/{event_id}/register/")
    assert reg.status_code == 201 and reg.data["remaining_capacity"] == 0 and reg.data["is_registered"] is True
    as_user(api, login, "s2@example.com")
    assert api.post(f"/api/events/{event_id}/register/").status_code == 409  # full

    # an ended event the student attended can be rated 1 to 5
    now = timezone.now()
    past = make_event(club, title="Past", starts_at=now - timedelta(hours=3), ends_at=now - timedelta(hours=1))
    EventRegistration.objects.create(event=past, student=student, attended=True)
    as_user(api, login, "s1@example.com")
    assert api.put(f"/api/events/{past.id}/rating/", {"rating": 6}, format="json").status_code == 400
    rated = api.put(f"/api/events/{past.id}/rating/", {"rating": 5}, format="json")
    assert rated.status_code == 201 and rated.data["average_rating"] == 5.0 and rated.data["rating_count"] == 1
