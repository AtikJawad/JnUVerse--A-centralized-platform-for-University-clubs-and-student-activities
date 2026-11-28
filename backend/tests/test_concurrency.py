"""Real concurrent requests against PostgreSQL (needs transaction=True so threads see committed rows)."""
import threading

import pytest
from django.db import connections
from rest_framework.test import APIClient

from apps.events.models import EventRegistration
from tests.helpers import PASSWORD, make_event, make_student

pytestmark = pytest.mark.django_db(transaction=True)


def token(email):
    r = APIClient().post("/api/auth/login/", {"identifier": email, "password": PASSWORD}, format="json")
    return r.data["access"]


def run_parallel(calls):
    """Run each callable in its own thread (own DB connection); return their results in order."""
    results, barrier = [None] * len(calls), threading.Barrier(len(calls))

    def work(i, fn):
        try:
            barrier.wait()
            results[i] = fn()
        except Exception as e:  # surfaced by the assertions below
            results[i] = e
        finally:
            connections.close_all()

    threads = [threading.Thread(target=work, args=(i, fn)) for i, fn in enumerate(calls)]
    for t in threads:
        t.start()
    for t in threads:
        t.join()
    return results


def register_call(event_id, tok):
    def call():
        c = APIClient()
        c.credentials(HTTP_AUTHORIZATION=f"Bearer {tok}")
        return c.post(f"/api/events/{event_id}/register/").status_code
    return call


def test_last_seat_goes_to_exactly_one_student(club):
    event = make_event(club, capacity=1)
    toks = []
    for i in range(6):
        make_student(f"B22030540{i}", f"race{i}@example.com")
        toks.append(token(f"race{i}@example.com"))
    codes = run_parallel([register_call(event.id, t) for t in toks])
    assert sorted(codes) == [201, 409, 409, 409, 409, 409], codes
    assert EventRegistration.objects.filter(event=event, status="registered").count() == 1


def test_capacity_is_never_exceeded(club):
    event = make_event(club, capacity=3)
    toks = []
    for i in range(8):
        make_student(f"B22030541{i}", f"cap{i}@example.com")
        toks.append(token(f"cap{i}@example.com"))
    codes = run_parallel([register_call(event.id, t) for t in toks])
    assert codes.count(201) == 3 and codes.count(409) == 5, codes
    assert EventRegistration.objects.filter(event=event, status="registered").count() == 3


def test_same_student_double_click_creates_one_registration(club):
    event = make_event(club, capacity=5)
    make_student("B220305420", "twice@example.com")
    tok = token("twice@example.com")
    codes = run_parallel([register_call(event.id, tok) for _ in range(5)])
    assert all(c in (200, 201) for c in codes), codes
    assert EventRegistration.objects.filter(event=event).count() == 1
