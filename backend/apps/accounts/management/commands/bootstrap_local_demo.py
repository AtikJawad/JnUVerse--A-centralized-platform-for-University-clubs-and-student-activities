from django.conf import settings
from django.core.management import call_command
from django.core.management.base import BaseCommand, CommandError

from apps.accounts.models import User
from apps.clubs.models import Club

DEMO_PASSWORD = "Str0ng-Pass-123"


class Command(BaseCommand):
    help = ("LOCAL database only: import the sample student records, create the default demo club "
            "(club1@example.com) and seed the [DEMO] data. Safe to repeat.")

    def handle(self, *args, **opts):
        host = settings.DATABASES["default"]["HOST"]
        if host not in ("localhost", "127.0.0.1"):
            raise CommandError(f"DB host is '{host}', not local. Use DJANGO_SETTINGS_MODULE=config.settings_local.")
        call_command("import_student_records", str(settings.BASE_DIR / "data" / "student_records_sample.csv"))
        op, created = User.objects.get_or_create(
            email="club1@example.com", defaults={"role": User.Role.CLUB_OPERATOR})
        if created:
            op.set_password(DEMO_PASSWORD)
            op.save()
        Club.objects.get_or_create(
            operator=op, defaults={"name": "JnU Research Society", "description": "Research club",
                                   "contact_email": "club1@example.com"})
        call_command("seed_demo_events")
        self.stdout.write(self.style.SUCCESS(
            f"Local demo ready. Operator: club1@example.com, students: demo1..demo5@demo.jnuverse.test, "
            f"password: {DEMO_PASSWORD}"))
