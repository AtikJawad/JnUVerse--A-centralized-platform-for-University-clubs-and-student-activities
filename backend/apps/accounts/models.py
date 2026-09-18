from django.conf import settings
from django.db import models


class User(models.Model):
    """
    Foundation-level placeholder for the JnUVerse user/profile model.

    Week 1 scope: define the three locked system-level roles only.
    Full registration, JWT authentication, and RBAC enforcement are
    implemented in Week 5 (Authentication + Student/Club Core) per the
    14-week roadmap. This model intentionally does NOT implement auth
    logic yet.
    """

    class Role(models.TextChoices):
        STUDENT = "student", "Student"
        CLUB_OFFICER = "club_officer", "Club Officer / Club Operator"
        UNIVERSITY_ADMIN = "university_admin", "University Admin"

    role = models.CharField(
        max_length=20,
        choices=Role.choices,
        default=Role.STUDENT,
        help_text=(
            "System-level role. Note: each club has exactly one authorized "
            "Club Officer/Club Operator account for system-level club "
            "operations; executive-committee titles (President, Secretary, "
            "etc.) are informational only and are not separate system roles."
        ),
    )

    class Meta:
        app_label = "accounts"

    def __str__(self):
        return f"User (role={self.role})"
