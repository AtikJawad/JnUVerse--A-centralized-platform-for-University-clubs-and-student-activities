import uuid

from django.conf import settings
from django.db import models
from django.db.models import Q


class ContentReport(models.Model):
    """Stored only. Developers handle reports via Django admin; no resolution API."""

    class Reason(models.TextChoices):  # initial list, team to review
        INAPPROPRIATE = "inappropriate", "Inappropriate content"
        SPAM = "spam", "Spam"
        MISLEADING = "misleading", "Misleading information"
        HARASSMENT = "harassment", "Harassment"
        OTHER = "other", "Other"

    class Status(models.TextChoices):
        OPEN = "open", "Open"
        UNDER_REVIEW = "under_review", "Under review"
        RESOLVED = "resolved", "Resolved"
        DISMISSED = "dismissed", "Dismissed"

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    reporter = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.PROTECT, related_name="reports_filed")
    club = models.ForeignKey("clubs.Club", null=True, blank=True, on_delete=models.PROTECT, related_name="reports")
    event = models.ForeignKey("events.Event", null=True, blank=True, on_delete=models.PROTECT, related_name="reports")
    reason = models.CharField(max_length=20, choices=Reason.choices)
    details = models.TextField(blank=True)
    status = models.CharField(max_length=15, choices=Status.choices, default=Status.OPEN)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        constraints = [
            models.CheckConstraint(
                condition=(Q(club__isnull=False) & Q(event__isnull=True))
                | (Q(club__isnull=True) & Q(event__isnull=False)),
                name="report_exactly_one_target",
            ),
            models.UniqueConstraint(fields=["reporter", "club"], condition=Q(club__isnull=False), name="report_once_per_club"),
            models.UniqueConstraint(fields=["reporter", "event"], condition=Q(event__isnull=False), name="report_once_per_event"),
        ]
        indexes = [models.Index(fields=["status", "-created_at"])]