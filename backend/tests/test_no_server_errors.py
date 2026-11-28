"""Sweep every API route with hostile input as each kind of caller: nothing may answer 500."""
import re

import pytest
from django.urls import URLPattern, URLResolver, get_resolver

from apps.events.models import EventRegistration
from tests.helpers import make_club, make_event, make_student

pytestmark = pytest.mark.django_db
ZERO = "00000000-0000-0000-0000-000000000000"
SKIP = ("admin", "api/docs", "api/schema", "static", "media")
BODIES = [
    {},
    {"title": None, "rating": "abc", "registration_ids": "nope", "date_from": "bad", "capacity": -5,
     "starts_at": "yesterday", "audience": "everyone", "reason": 1, "interests": "x", "interest_ids": [[]],
     "email": ["a"], "password": {}, "target_club": 5, "event": "zzz", "logo": "x" * 50},
    "just a string",
]
QUERY = {"page": "abc", "page_size": "-1", "date_from": "bad", "upcoming": "zz", "search": "\x00" * 5,
         "club": "x" * 300, "mine": "maybe", "registered": "perhaps"}


def collect_routes():
    found = []

    def walk(patterns, prefix=""):
        for p in patterns:
            text = prefix + str(p.pattern)
            if isinstance(p, URLResolver):
                walk(p.url_patterns, text)
            elif isinstance(p, URLPattern) and "^" not in text and "(?P" not in text:
                found.append(text)

    walk(get_resolver().url_patterns)
    return sorted(r for r in set(found) if not r.startswith(SKIP))


def fill(route, real):
    def pick(m):
        kind = m.group(1)
        if kind == "uuid":
            return real["uuid"]
        return real["slug"]
    return "/" + re.sub(r"<(\w+):\w+>", pick, route)


@pytest.fixture
def world(api, club):
    student = make_student()
    event = make_event(club)
    EventRegistration.objects.create(event=event, student=student)
    make_club(name="Second Club", email="second@example.com")
    return {"real": {"uuid": str(event.id), "slug": club.slug},
            "bad": {"uuid": ZERO, "slug": "no-such-club"}}


def sign_in(api, login, who):
    api.credentials()
    if who != "anonymous":
        api.credentials(HTTP_AUTHORIZATION=f"Bearer {login(who).data['access']}")


@pytest.mark.parametrize("route", collect_routes())
@pytest.mark.parametrize("who", ["anonymous", "s1@example.com", "op@example.com"])
def test_route_never_returns_500(api, login, world, route, who):
    api.raise_request_exception = False  # report a 500 instead of re-raising the exception
    sign_in(api, login, who)
    failures = []
    for ids in (world["real"], world["bad"]):
        url = fill(route, ids)
        calls = [("get", {"path": url, "data": QUERY})]
        for method in ("post", "put", "patch", "delete"):
            for body in BODIES:
                calls.append((method, {"path": url, "data": body, "format": "json"}))
        for method, kw in calls:
            r = getattr(api, method)(**kw)
            if r.status_code >= 500:
                failures.append(f"{method.upper()} {url} {kw.get('data')!r:.80} -> {r.status_code}")
    assert not failures, "\n".join(failures)
