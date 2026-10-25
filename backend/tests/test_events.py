from datetime import timedelta

import pytest
from django.utils import timezone

from apps.events.models import Event, EventRegistration
from tests.helpers import make_club, make_event, make_student

pytestmark = pytest.mark.django_db
URL = "/api/events/"
FIELDS = {"id", "club", "title", "description", "venue", "starts_at", "ends_at", "capacity",
          "registered_count", "remaining_capacity", "status", "is_completed", "is_registered", "created_at"}


def as_user(api, login, ident):
    api.credentials(HTTP_AUTHORIZATION=f"Bearer {login(ident).data['access']}")


def titles(r):
    return [e["title"] for e in r.data["results"]]


def ev(club, title, start_days, hours=1, **kw):
    start = timezone.now() + timedelta(days=start_days)
    return make_event(club, title=title, starts_at=start, ends_at=start + timedelta(hours=hours), **kw)


def valid_body():
    start = timezone.now() + timedelta(days=2)
    return {"title": "Workshop", "description": "d", "venue": "Room 1", "capacity": 30,
            "starts_at": start.isoformat(), "ends_at": (start + timedelta(hours=2)).isoformat()}


def test_draft_visibility(api, login, club, student):
    make_club("Other Club", "other@example.com")
    d = make_event(club, title="Secret", status="draft")
    assert titles(api.get(URL)) == [] and api.get(f"{URL}{d.id}/").status_code == 404
    for ident in ("s1@example.com", "other@example.com"):
        as_user(api, login, ident)
        assert titles(api.get(URL)) == [] and api.get(f"{URL}{d.id}/").status_code == 404
    as_user(api, login, "op@example.com")
    assert titles(api.get(URL)) == ["Secret"]
    assert api.get(f"{URL}{d.id}/").data["status"] == "draft"


def test_cancelled_events_are_public(api, club):
    make_event(club, title="Called off", status="cancelled")
    r = api.get(URL)
    assert titles(r) == ["Called off"] and r.data["results"][0]["status"] == "cancelled"


def test_list_fields_and_counts(api, club, student):
    s2, s3 = make_student("B220305051", "s2@example.com"), make_student("B220305052", "s3@example.com")
    e = make_event(club, title="Limited", capacity=3)
    make_event(club, title="Open", capacity=None)
    EventRegistration.objects.create(event=e, student=student)
    EventRegistration.objects.create(event=e, student=s2)
    EventRegistration.objects.create(event=e, student=s3, status="cancelled")
    items = {i["title"]: i for i in api.get(URL).data["results"]}
    assert set(items["Limited"]) == FIELDS
    assert items["Limited"]["registered_count"] == 2 and items["Limited"]["remaining_capacity"] == 1
    assert items["Limited"]["club"] == {"id": str(club.id), "name": "Test Club", "slug": "test-club"}
    assert items["Limited"]["is_completed"] is False and items["Limited"]["is_registered"] is None
    assert items["Open"]["remaining_capacity"] is None and items["Open"]["capacity"] is None


def test_is_registered_flag(api, login, club, student):
    e = make_event(club)
    url = f"{URL}{e.id}/"
    assert api.get(url).data["is_registered"] is None
    as_user(api, login, "s1@example.com")
    assert api.get(url).data["is_registered"] is False
    reg = EventRegistration.objects.create(event=e, student=student)
    assert api.get(url).data["is_registered"] is True
    reg.status = "cancelled"
    reg.save()
    assert api.get(url).data["is_registered"] is False
    as_user(api, login, "op@example.com")
    assert api.get(url).data["is_registered"] is None


def test_filters_and_ordering(api, club):
    other = make_club("Other Club", "other@example.com")
    now = timezone.now()
    make_event(club, title="Now", starts_at=now - timedelta(hours=1), ends_at=now + timedelta(hours=1))
    ev(club, "Soon", 1)
    ev(club, "Later", 5)
    ev(other, "Elsewhere", 3)
    ev(club, "Old", -3)
    ev(club, "Older", -6)
    assert titles(api.get(URL, {"upcoming": "true"})) == ["Now", "Soon", "Elsewhere", "Later"]
    assert titles(api.get(URL, {"upcoming": "false"})) == ["Old", "Older"]
    assert titles(api.get(URL)) == ["Later", "Elsewhere", "Soon", "Now", "Old", "Older"]
    assert titles(api.get(URL, {"club": "test-club", "upcoming": "true"})) == ["Now", "Soon", "Later"]
    assert titles(api.get(URL, {"search": "old"})) == ["Old", "Older"]


def test_mine_and_registered_filters(api, login, club, student):
    other = make_club("Other Club", "other@example.com")
    ev(club, "Mine", 1)
    ev(club, "My draft", 2, status="draft")
    ev(other, "Not mine", 3)
    for title in ("Mine", "Not mine"):
        pass
    assert api.get(URL, {"mine": "true"}).status_code == 401
    assert api.get(URL, {"registered": "true"}).status_code == 401
    as_user(api, login, "op@example.com")
    assert sorted(titles(api.get(URL, {"mine": "true"}))) == ["Mine", "My draft"]
    assert api.get(URL, {"registered": "true"}).status_code == 403
    as_user(api, login, "s1@example.com")
    assert api.get(URL, {"mine": "true"}).status_code == 403
    EventRegistration.objects.create(event=Event.objects.get(title="Mine"), student=student)
    EventRegistration.objects.create(event=Event.objects.get(title="Not mine"), student=student, status="cancelled")
    assert titles(api.get(URL, {"registered": "true"})) == ["Mine"]


def test_create_event(api, login, club):
    as_user(api, login, "op@example.com")
    r = api.post(URL, valid_body(), format="json")
    assert r.status_code == 201 and r.data["status"] == "draft" and r.data["club"]["slug"] == "test-club"
    assert r.data["registered_count"] == 0 and r.data["remaining_capacity"] == 30
    assert Event.objects.get().created_by == club.operator


@pytest.mark.parametrize("case,field", [("past_start", "starts_at"), ("end_before_start", "ends_at"),
                                        ("capacity_zero", "capacity"), ("missing_title", "title")])
def test_create_validation(api, login, club, case, field):
    body, now = valid_body(), timezone.now()
    if case == "past_start":
        body["starts_at"], body["ends_at"] = (now - timedelta(days=1)).isoformat(), (now + timedelta(hours=1)).isoformat()
    elif case == "end_before_start":
        body["ends_at"] = (now + timedelta(days=1)).isoformat()
    elif case == "capacity_zero":
        body["capacity"] = 0
    else:
        del body["title"]
    as_user(api, login, "op@example.com")
    r = api.post(URL, body, format="json")
    assert r.status_code == 400 and field in r.data and Event.objects.count() == 0


def test_create_permissions(api, login, club, student):
    assert api.post(URL, valid_body(), format="json").status_code == 401
    as_user(api, login, "s1@example.com")
    assert api.post(URL, valid_body(), format="json").status_code == 403


def test_edit_rules(api, login, club, student):
    s2 = make_student("B220305051", "s2@example.com")
    as_user(api, login, "op@example.com")
    e = make_event(club, capacity=5)
    EventRegistration.objects.create(event=e, student=student)
    EventRegistration.objects.create(event=e, student=s2)
    url = f"{URL}{e.id}/"
    r = api.patch(url, {"title": "New title", "status": "cancelled"}, format="json")
    assert r.status_code == 200 and r.data["title"] == "New title" and r.data["status"] == "published"
    assert "capacity" in api.patch(url, {"capacity": 1}, format="json").data
    assert api.patch(url, {"capacity": 0}, format="json").status_code == 400
    assert api.patch(url, {"capacity": 2}, format="json").status_code == 200
    assert api.patch(url, {"capacity": None}, format="json").data["remaining_capacity"] is None
    now = timezone.now()
    ongoing = make_event(club, starts_at=now - timedelta(hours=1), ends_at=now + timedelta(hours=1))
    ongoing_url = f"{URL}{ongoing.id}/"
    assert api.patch(ongoing_url, {"description": "x"}, format="json").status_code == 200
    bad = api.patch(ongoing_url, {"starts_at": (now - timedelta(minutes=30)).isoformat()}, format="json")
    assert bad.status_code == 400 and "starts_at" in bad.data
    ended = ev(club, "Ended", -2)
    assert api.patch(f"{URL}{ended.id}/", {"title": "x"}, format="json").status_code == 409
    called_off = make_event(club, status="cancelled")
    assert api.patch(f"{URL}{called_off.id}/", {"title": "x"}, format="json").status_code == 409
    assert api.put(url, {"title": "x"}, format="json").status_code == 405


def test_edit_permissions(api, login, club, student):
    make_club("Other Club", "other@example.com")
    e = make_event(club)
    url = f"{URL}{e.id}/"
    assert api.patch(url, {"title": "x"}, format="json").status_code == 401
    for ident in ("s1@example.com", "other@example.com"):
        as_user(api, login, ident)
        assert api.patch(url, {"title": "x"}, format="json").status_code == 403
    assert Event.objects.get().title == "Event"


def test_publish(api, login, club):
    as_user(api, login, "op@example.com")
    d = make_event(club, status="draft")
    url = f"{URL}{d.id}/publish/"
    r = api.post(url)
    assert r.status_code == 200 and r.data["status"] == "published"
    assert api.post(url).status_code == 409
    now = timezone.now()
    started = make_event(club, status="draft", starts_at=now - timedelta(hours=1), ends_at=now + timedelta(hours=1))
    r = api.post(f"{URL}{started.id}/publish/")
    assert r.status_code == 400 and "starts_at" in r.data
    started.refresh_from_db()
    assert started.status == "draft"


def test_action_permissions_and_visibility(api, login, club, student):
    make_club("Other Club", "other@example.com")
    draft, live = make_event(club, status="draft"), make_event(club)
    calls = [f"{URL}{draft.id}/publish/", f"{URL}{live.id}/cancel/"]
    for url in calls:
        assert api.post(url).status_code == 401
    as_user(api, login, "s1@example.com")
    for url in calls:
        assert api.post(url).status_code == 403
    as_user(api, login, "other@example.com")
    assert api.post(calls[0]).status_code == 404   # someone else's draft is invisible
    assert api.post(calls[1]).status_code == 403   # someone else's published event is visible but not theirs


def test_cancel(api, login, club, student):
    as_user(api, login, "op@example.com")
    e = make_event(club)
    EventRegistration.objects.create(event=e, student=student)
    url = f"{URL}{e.id}/cancel/"
    r = api.post(url)
    assert r.status_code == 200 and r.data["status"] == "cancelled" and r.data["registered_count"] == 1
    assert api.post(url).status_code == 409
    assert api.post(f"{URL}{make_event(club, status='draft').id}/cancel/").status_code == 409
    ended = ev(club, "Ended", -2)
    assert api.post(f"{URL}{ended.id}/cancel/").status_code == 409