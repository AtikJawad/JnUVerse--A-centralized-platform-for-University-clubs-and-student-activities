from datetime import timedelta

import pytest
from django.utils import timezone

from apps.notifications.models import Notification
from tests.helpers import make_club, make_event, make_student

pytestmark = pytest.mark.django_db
URL = "/api/collaborations/"


def as_user(api, login, ident):
    api.credentials(HTTP_AUTHORIZATION=f"Bearer {login(ident).data['access']}")


def payload(target="other-club", **kw):
    d = {"target_club": target, "title": "Joint workshop"}
    d.update(kw)
    return d


def send(api, login, ident="op@example.com", **kw):
    as_user(api, login, ident)
    r = api.post(URL, payload(**kw), format="json")
    assert r.status_code == 201, r.data
    return r.data["id"]


def inbox(email):
    return list(Notification.objects.filter(recipient__email=email, type="collaboration_update")
                .values_list("title", flat=True))


@pytest.fixture
def other(db):
    return make_club("Other Club", "other@example.com")


@pytest.fixture
def third(db):
    return make_club("Third Club", "third@example.com")


def test_send_request_notifies_target(api, login, club, other):
    as_user(api, login, "op@example.com")
    r = api.post(URL, payload(description="Let's co-host"), format="json")
    assert r.status_code == 201
    assert r.data["status"] == "pending" and r.data["event"] is None and r.data["responded_at"] is None
    assert (r.data["requesting_club"]["slug"], r.data["target_club"]["slug"]) == ("test-club", "other-club")
    assert inbox("other@example.com") == ["New collaboration request"]
    assert inbox("op@example.com") == []


def test_link_own_published_event(api, login, club, other):
    e = make_event(club)
    as_user(api, login, "op@example.com")
    r = api.post(URL, payload(event=str(e.id)), format="json")
    assert r.status_code == 201 and r.data["event"]["id"] == str(e.id)


@pytest.mark.parametrize("kind", ["foreign", "ended", "draft"])
def test_invalid_event_links(api, login, club, other, kind):
    now = timezone.now()
    if kind == "foreign":
        e = make_event(other)
    elif kind == "ended":
        e = make_event(club, starts_at=now - timedelta(hours=3), ends_at=now - timedelta(hours=1))
    else:
        e = make_event(club, status="draft")
    as_user(api, login, "op@example.com")
    r = api.post(URL, payload(event=str(e.id)), format="json")
    assert r.status_code == 400 and "event" in r.data


@pytest.mark.parametrize("over,field", [
    ({"target": "test-club"}, "target_club"),
    ({"target": "nope"}, "target_club"),
    ({"title": ""}, "title"),
])
def test_request_validation(api, login, club, other, over, field):
    as_user(api, login, "op@example.com")
    r = api.post(URL, payload(**over), format="json")
    assert r.status_code == 400 and field in r.data


def test_no_duplicate_pending_in_either_direction(api, login, club, other):
    cid = send(api, login)
    assert api.post(URL, payload(), format="json").status_code == 409
    as_user(api, login, "other@example.com")
    assert api.post(URL, payload(target="test-club"), format="json").status_code == 409
    assert api.post(f"{URL}{cid}/reject/").status_code == 200
    assert api.post(URL, payload(target="test-club"), format="json").status_code == 201


def test_only_operators(api, login, student, club, other):
    assert api.post(URL, payload(), format="json").status_code == 401
    assert api.get(URL).status_code == 401
    as_user(api, login, "s1@example.com")
    assert api.post(URL, payload(), format="json").status_code == 403
    assert api.get(URL).status_code == 403


def test_list_boxes_and_status(api, login, club, other, third):
    send(api, login)                                      # test -> other
    send(api, login, ident="third@example.com", target="test-club")  # third -> test
    as_user(api, login, "op@example.com")
    assert api.get(URL).data["count"] == 2
    sent = api.get(URL, {"box": "sent"}).data["results"]
    assert len(sent) == 1 and sent[0]["target_club"]["slug"] == "other-club"
    received = api.get(URL, {"box": "received"}).data["results"]
    assert len(received) == 1 and received[0]["requesting_club"]["slug"] == "third-club"
    assert api.get(URL, {"status": "accepted"}).data["count"] == 0
    assert api.get(URL, {"box": "x"}).status_code == 400
    assert api.get(URL, {"status": "x"}).status_code == 400
    as_user(api, login, "other@example.com")
    assert api.get(URL, {"box": "sent"}).data["count"] == 0
    assert api.get(URL, {"box": "received"}).data["count"] == 1


def test_detail_visibility(api, login, club, other, third):
    url = f"{URL}{send(api, login)}/"
    assert api.get(url).status_code == 200
    as_user(api, login, "other@example.com")
    assert api.get(url).status_code == 200
    as_user(api, login, "third@example.com")
    assert api.get(url).status_code == 404
    api.credentials()
    assert api.get(url).status_code == 401


def test_accept(api, login, club, other, third):
    cid = send(api, login)
    as_user(api, login, "other@example.com")
    r = api.post(f"{URL}{cid}/accept/")
    assert r.status_code == 200 and r.data["status"] == "accepted" and r.data["responded_at"] is not None
    assert inbox("op@example.com") == ["Collaboration request accepted"]
    assert api.post(f"{URL}{cid}/accept/").status_code == 409
    cid2 = send(api, login)  # allowed again: nothing pending
    assert api.post(f"{URL}{cid2}/accept/").status_code == 403       # requester cannot accept
    as_user(api, login, "third@example.com")
    assert api.post(f"{URL}{cid2}/accept/").status_code == 404       # not involved


def test_reject(api, login, club, other):
    cid = send(api, login)
    as_user(api, login, "other@example.com")
    r = api.post(f"{URL}{cid}/reject/")
    assert r.status_code == 200 and r.data["status"] == "rejected"
    assert inbox("op@example.com") == ["Collaboration request rejected"]
    assert api.post(f"{URL}{cid}/reject/").status_code == 409


def test_cancel(api, login, club, other):
    cid = send(api, login)
    as_user(api, login, "other@example.com")
    assert api.post(f"{URL}{cid}/cancel/").status_code == 403        # target cannot cancel
    as_user(api, login, "op@example.com")
    r = api.post(f"{URL}{cid}/cancel/")
    assert r.status_code == 200 and r.data["status"] == "cancelled"
    assert "Collaboration request cancelled" in inbox("other@example.com")
    assert api.post(f"{URL}{cid}/cancel/").status_code == 409


def test_partners_listing(api, login, club, other, third):
    first = send(api, login)                                          # test -> other
    as_user(api, login, "other@example.com")
    api.post(f"{URL}{first}/accept/")
    send(api, login, ident="third@example.com", target="test-club")   # pending: not a partner
    second = send(api, login)                                         # test -> other again
    as_user(api, login, "other@example.com")
    api.post(f"{URL}{second}/accept/")
    api.credentials()
    r = api.get("/api/clubs/test-club/partners/")
    assert [p["slug"] for p in r.data["results"]] == ["other-club"]   # one entry despite two accepted
    assert [p["slug"] for p in api.get("/api/clubs/other-club/partners/").data["results"]] == ["test-club"]
    assert api.get("/api/clubs/nope/partners/").status_code == 404