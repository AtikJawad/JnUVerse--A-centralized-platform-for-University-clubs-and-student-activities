from datetime import timedelta

from django.conf import settings
from django.core.management.base import BaseCommand, CommandError
from django.db import transaction
from django.utils import timezone

from apps.accounts.constants import DEPARTMENT_CHOICES
from apps.accounts.models import StudentProfile, User, ValidStudentRecord
from apps.clubs.models import Club, ClubFollow, ClubMembership
from apps.events.models import Event, EventRegistration
from apps.notifications import services as notify
from apps.notifications.models import Notice, Notification

PREFIX = "[DEMO] "
DEMO_EMAIL_DOMAIN = "demo.jnuverse.test"
DEMO_IDS = [f"DEMO{n:04d}" for n in range(1, 6)]
LOCAL_HOSTS = {"localhost", "127.0.0.1", "::1"}
# name, description, [(student index, membership status)], [follower student indexes], [event start offsets in days]
DEMO_CLUBS = [
    ("Robotics Club", "Build and program robots.", [(0, "approved"), (1, "approved"), (2, "pending")], [0, 3], [4, 9]),
    ("Debate Society", "Weekly debates and workshops.", [(0, "approved"), (1, "rejected"), (2, "left")], [1], [6]),
    ("Photography Club", "Photo walks and exhibitions.", [(0, "pending"), (1, "removed")], [], [8]),
    ("Cultural Forum", "Music, drama and festivals.", [], [0, 1, 2], [12]),
    ("Sports Club", "Inter-department tournaments.", [], [], []),
]


class Command(BaseCommand):
    help = "Create (or remove with --reset) clearly marked demo events, students and RSVPs. Repeatable."

    def add_arguments(self, parser):
        parser.add_argument("--club-slug", default="jnu-research-society")
        parser.add_argument("--operator-email", default="club1@example.com")
        parser.add_argument("--password", default="Demo-Pass-12345", help="Password for demo students.")
        parser.add_argument("--reset", action="store_true", help="Delete only [DEMO] data, then exit.")
        parser.add_argument("--allow-remote", action="store_true", help="Required when DB host is not local.")

    def handle(self, *args, **o):
        host = settings.DATABASES["default"]["HOST"]
        if host not in LOCAL_HOSTS and not o["allow_remote"]:
            raise CommandError(f"DB host is '{host}' (not local). Re-run with --allow-remote to confirm.")
        with transaction.atomic():
            if o["reset"]:
                return self.reset()
            self.seed(o)

    def reset(self):
        events = Event.objects.filter(title__startswith=PREFIX)
        EventRegistration.objects.filter(event__in=events).delete()
        n_events = events.count()
        events.delete()
        demo_clubs = Club.objects.filter(name__startswith=PREFIX)
        Notice.objects.filter(club__in=demo_clubs).delete()  # their notifications cascade
        ClubMembership.objects.filter(club__in=demo_clubs).delete()
        ClubFollow.objects.filter(club__in=demo_clubs).delete()
        n_clubs = demo_clubs.count()
        demo_clubs.delete()
        users = User.objects.filter(email__endswith="@" + DEMO_EMAIL_DOMAIN)
        n_users = users.count()
        users.delete()  # StudentProfile cascades
        ValidStudentRecord.objects.filter(student_id__in=DEMO_IDS).delete()
        self.stdout.write(self.style.SUCCESS(
            f"Removed {n_events} demo events, {n_clubs} demo clubs, {n_users} demo users."
        ))

    def seed(self, o):
        try:
            club = Club.objects.get(slug=o["club_slug"])
            operator = User.objects.get(email=o["operator_email"].lower(), role=User.Role.CLUB_OPERATOR)
        except (Club.DoesNotExist, User.DoesNotExist) as e:
            raise CommandError(f"Club/operator not found: {e}")

        dept = DEPARTMENT_CHOICES[0][0]
        profiles = []
        for i, sid in enumerate(DEMO_IDS, start=1):
            email = f"demo{i}@{DEMO_EMAIL_DOMAIN}"
            ValidStudentRecord.objects.get_or_create(
                student_id=sid, defaults={"full_name": f"Demo Student {i}", "email": email}
            )
            user, created = User.objects.get_or_create(email=email, defaults={"role": User.Role.STUDENT})
            if created:
                user.set_password(o["password"])
                user.save()
            profile, _ = StudentProfile.objects.get_or_create(
                user=user,
                defaults={"jnu_student_id": sid, "full_name": f"Demo Student {i}", "department": dept, "batch": 22},
            )
            profiles.append(profile)

        now = timezone.now().replace(minute=0, second=0, microsecond=0)
        h = timedelta(hours=1)
        d = timedelta(days=1)
        P, D, C = Event.Status.PUBLISHED, Event.Status.DRAFT, Event.Status.CANCELLED
        # title, status, start, duration, capacity, number of registrations
        specs = [
            ("Research Workshop", P, now + 3 * d, 2 * h, 30, 3),
            ("Paper Reading Session", P, now + 7 * d, 2 * h, None, 1),
            ("Seminar (Unlimited)", P, now + 14 * d, 3 * h, None, 0),
            ("Full Event Example", P, now + 5 * d, 2 * h, 2, 2),
            ("Ongoing Meetup", P, now - 1 * h, 4 * h, 20, 2),
            ("Past Event Example", P, now - 7 * d, 2 * h, 30, 4),
            ("Draft Event Example", D, now + 20 * d, 2 * h, 15, 0),
            ("Cancelled Event Example", C, now + 10 * d, 2 * h, 15, 1),
        ]
        made = 0
        for title, status, start, dur, cap, regs in specs:
            event, created = Event.objects.get_or_create(
                club=club,
                title=PREFIX + title,
                defaults={
                    "created_by": operator,
                    "description": "Demo data for frontend development.",
                    "venue": "Room 301",
                    "starts_at": start,
                    "ends_at": start + dur,
                    "capacity": cap,
                    "status": status,
                },
            )
            made += created
            for p in profiles[:regs]:
                EventRegistration.objects.get_or_create(event=event, student=p)
        # one cancelled registration, to exercise re-register / counts
        EventRegistration.objects.get_or_create(
            event=Event.objects.get(club=club, title=PREFIX + "Paper Reading Session"),
            student=profiles[4],
            defaults={"status": EventRegistration.Status.CANCELLED},
        )
        made_clubs = self.seed_clubs(o, profiles, now)
        self.seed_notifications(profiles)
        self.stdout.write(self.style.SUCCESS(
            f"Done. New events: {made}. New demo clubs: {made_clubs}. "
            f"Logins: demo1..demo5 and democlub1..democlub5@{DEMO_EMAIL_DOMAIN} (password: {o['password']})."
        ))


    def seed_clubs(self, o, profiles, now):
        made = 0
        for i, (name, desc, memberships, followers, event_days) in enumerate(DEMO_CLUBS, start=1):
            email = f"democlub{i}@{DEMO_EMAIL_DOMAIN}"
            op, created = User.objects.get_or_create(email=email, defaults={"role": User.Role.CLUB_OPERATOR})
            if created:
                op.set_password(o["password"])
                op.save()
            club, c = Club.objects.get_or_create(
                operator=op, defaults={"name": PREFIX + name, "description": desc, "contact_email": email}
            )
            made += c
            for idx, status in memberships:
                reviewed = status != "pending"
                ClubMembership.objects.get_or_create(
                    student=profiles[idx], club=club,
                    defaults={
                        "status": status,
                        "reviewed_at": now if reviewed else None,
                        "reviewed_by": op if reviewed else None,
                    },
                )
            for idx in followers:
                ClubFollow.objects.get_or_create(student=profiles[idx], club=club)
            for n, days in enumerate(event_days, start=1):
                start = now + timedelta(days=days)
                Event.objects.get_or_create(
                    club=club, title=f"{PREFIX}{name} Meetup {n}",
                    defaults={
                        "created_by": op, "description": "Demo data for frontend development.",
                        "venue": "Room 101", "starts_at": start, "ends_at": start + timedelta(hours=2),
                        "capacity": 25, "status": Event.Status.PUBLISHED,
                    },
                )
        return made

    def seed_notifications(self, profiles):
        club = Club.objects.get(operator__email=f"democlub1@{DEMO_EMAIL_DOMAIN}")
        debate = Club.objects.get(operator__email=f"democlub2@{DEMO_EMAIL_DOMAIN}")
        dept = DEPARTMENT_CHOICES[0][0]
        specs = [
            ("Welcome to Robotics", "public", ""),
            ("Followers update: new project", "followers", ""),
            ("Members only: lab schedule", "members", ""),
            ("Department workshop", "department", dept),
        ]
        for title, audience, target in specs:
            notice, _ = Notice.objects.get_or_create(
                club=club, title=PREFIX + title,
                defaults={
                    "created_by": club.operator,
                    "body": "Demo notice for frontend development. " * 3,
                    "audience": audience,
                    "target_department": target,
                },
            )
            notify.notify_notice(notice)  # same rules as the real API; duplicates are ignored

        for event in Event.objects.filter(club=club, status=Event.Status.PUBLISHED, title__startswith=PREFIX):
            notify.notify_event_published(event)
        for title, send in (
            ("Cancelled Event Example", notify.notify_event_cancelled),
            ("Research Workshop", notify.notify_event_updated),
        ):
            event = Event.objects.filter(title=PREFIX + title).first()
            if event:
                send(event)

        def once(user_id, title, message):
            Notification.objects.get_or_create(
                recipient_id=user_id, type=Notification.Type.MEMBERSHIP_UPDATE, title=title, message=message
            )

        once(profiles[0].user_id, "Membership approved", f"Your request to join {club.name} was approved.")
        once(profiles[1].user_id, "Membership rejected", f"Your request to join {debate.name} was not approved.")
        p = profiles[2]
        once(club.operator_id, "New membership request",
             f"{p.full_name} ({p.jnu_student_id}) requested to join {club.name}.")

        # leave one already read, so the frontend can show both states
        Notification.objects.filter(
            recipient_id=profiles[0].user_id, notice__title=PREFIX + "Welcome to Robotics", read_at__isnull=True
        ).update(read_at=timezone.now())