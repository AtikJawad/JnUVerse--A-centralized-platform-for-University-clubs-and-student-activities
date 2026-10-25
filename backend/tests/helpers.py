from datetime import timedelta

from django.utils import timezone

from apps.events.models import Event

from apps.accounts.models import StudentProfile, User
from apps.clubs.models import Club



PASSWORD = "Str0ng-Pass-123"
DEPT = "Computer Science and Engineering (CSE)"


def student_payload(**over):
    d = {"student_id": "B220305043", "email": "atikjawad@gmail.com", "department": DEPT,
         "batch": 22, "password": PASSWORD, "password_confirm": PASSWORD}
    d.update(over)
    return d


def club_payload(**over):
    d = {"club_name": "JnU Research Society", "description": "Research club",
         "email": "club1@example.com", "password": PASSWORD, "password_confirm": PASSWORD}
    d.update(over)
    return d


def make_student(jnu_id="B220305050", email="s1@example.com"):
    user = User.objects.create_user(email=email, password=PASSWORD, role=User.Role.STUDENT)
    return StudentProfile.objects.create(
        user=user, jnu_student_id=jnu_id, full_name="Test Student", department=DEPT, batch=22
    )


def make_club(name="Test Club", email="op@example.com"):
    op = User.objects.create_user(email=email, password=PASSWORD, role=User.Role.CLUB_OPERATOR)
    return Club.objects.create(operator=op, name=name)

def make_event(club, **kw):
    now = timezone.now()
    d = dict(club=club, created_by=club.operator, title="Event", venue="Hall", status="published",
             starts_at=now + timedelta(days=1), ends_at=now + timedelta(days=1, hours=2))
    d.update(kw)
    return Event.objects.create(**d)