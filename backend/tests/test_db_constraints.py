from contextlib import contextmanager
from datetime import timedelta

import pytest
from django.db import IntegrityError, transaction
from django.utils import timezone

from apps.clubs.models import Club, ClubFollow, ClubMembership
from apps.collaborations.models import CollaborationRequest
from apps.events.models import Event, EventRegistration
from apps.feedback.models import EventRating
from apps.notifications.models import Notice
from apps.reports.models import ContentReport
from tests.helpers import make_club

pytestmark = pytest.mark.django_db


@contextmanager
def must_fail():
    with pytest.raises(IntegrityError):
        with transaction.atomic():
            yield


@pytest.fixture
def event(club):
    return make_event(club)


def make_event(club, **kw):
    now = timezone.now()
    d = dict(club=club, created_by=club.operator, title="t", venue="v",
             starts_at=now, ends_at=now + timedelta(hours=1))
    d.update(kw)
    return Event.objects.create(**d)


def test_event_dates_and_capacity(club):
    with must_fail():
        make_event(club, ends_at=timezone.now() - timedelta(hours=1))
    with must_fail():
        make_event(club, capacity=0)
    assert make_event(club, capacity=5).is_completed is False


def test_registration_rating_follow_membership_unique(student, club, event):
    EventRegistration.objects.create(event=event, student=student)
    with must_fail():
        EventRegistration.objects.create(event=event, student=student)
    for bad in (0, 6):
        with must_fail():
            EventRating.objects.create(event=event, student=student, rating=bad)
    EventRating.objects.create(event=event, student=student, rating=5)
    with must_fail():
        EventRating.objects.create(event=event, student=student, rating=4)
    ClubFollow.objects.create(student=student, club=club)
    with must_fail():
        ClubFollow.objects.create(student=student, club=club)
    ClubMembership.objects.create(student=student, club=club)
    with must_fail():
        ClubMembership.objects.create(student=student, club=club)


def test_collaboration_rules(club):
    other = make_club("Other Club", "other@example.com")
    with must_fail():
        CollaborationRequest.objects.create(requesting_club=club, target_club=club, title="self")
    first = CollaborationRequest.objects.create(requesting_club=club, target_club=other, title="a")
    with must_fail():
        CollaborationRequest.objects.create(requesting_club=club, target_club=other, title="b")
    first.status = CollaborationRequest.Status.REJECTED
    first.save()
    CollaborationRequest.objects.create(requesting_club=club, target_club=other, title="again")  # allowed


def test_report_rules(club, event):
    op = club.operator
    with must_fail():
        ContentReport.objects.create(reporter=op, reason="spam")
    with must_fail():
        ContentReport.objects.create(reporter=op, reason="spam", club=club, event=event)
    ContentReport.objects.create(reporter=op, reason="spam", club=club)
    with must_fail():
        ContentReport.objects.create(reporter=op, reason="spam", club=club)


def test_notice_department_rules(club):
    base = dict(club=club, created_by=club.operator, title="n", body="b")
    with must_fail():
        Notice.objects.create(audience="department", **base)
    with must_fail():
        Notice.objects.create(audience="public", target_department="Law", **base)
    Notice.objects.create(audience="department", target_department="Law", **base)


def test_club_rules(club):
    with must_fail():  # case-insensitive unique name
        make_club("test club", "dup@example.com")
    with must_fail():  # one club per operator
        Club.objects.create(operator=club.operator, name="Second Club")