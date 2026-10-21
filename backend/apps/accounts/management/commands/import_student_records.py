import csv

from django.core.management.base import BaseCommand, CommandError

from apps.accounts.models import ValidStudentRecord


def pick(row, *names):
    lowered = {k.strip().lower().replace("_", " "): (v or "").strip() for k, v in row.items() if k}
    for n in names:
        if lowered.get(n):
            return lowered[n]
    return ""


class Command(BaseCommand):
    help = "Import valid JnU student records from a CSV (columns: Student Id, Name, Email)."

    def add_arguments(self, parser):
        parser.add_argument("csv_path")

    def handle(self, csv_path, **opts):
        try:
            f = open(csv_path, newline="", encoding="utf-8-sig")
        except OSError as e:
            raise CommandError(str(e))
        created = updated = skipped = 0
        with f:
            for i, row in enumerate(csv.DictReader(f), start=2):
                sid = pick(row, "student id", "studentid").upper()
                name = pick(row, "name")
                email = pick(row, "email").lower()
                if not (sid and name and email):
                    self.stderr.write(f"Row {i}: missing field, skipped")
                    skipped += 1
                    continue
                try:
                    _, was_created = ValidStudentRecord.objects.update_or_create(
                        student_id=sid, defaults={"full_name": name, "email": email}
                    )
                except Exception as e:  # e.g. email already used by another ID
                    self.stderr.write(f"Row {i} ({sid}): {e}")
                    skipped += 1
                    continue
                created += was_created
                updated += not was_created
        self.stdout.write(self.style.SUCCESS(f"created={created} updated={updated} skipped={skipped}"))