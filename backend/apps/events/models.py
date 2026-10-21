import uuid

from django.conf import settings
from django.db import models
from django.db.models import F, Q
from django.utils import timezone


class Event(models.Model):
    class Status(models.TextChoices):
        DRAFT = "draft", "Draft"
        PUBLISHED = "published", "Published"
        CANCELLED = "cancelled", "Cancelled"

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    club = models.ForeignKey("clubs.Club", on_delete=models.PROTECT, related_name="events")
    created_by = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.PROTECT, related_name="created_events")
    title = models.CharField(max_length=200)
    description = models.TextField(blank=True)
    venue = models.CharField(max_length=200)
    starts_at = models.DateTimeField()
    ends_at = models.DateTimeField()
    capacity = models.PositiveIntegerField(null=True, blank=True)
    status = models.CharField(max_length=10, choices=Status.choices, default=Status.DRAFT)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        constraints = [
            models.CheckConstraint(condition=Q(ends_at__gt=F("starts_at")), name="event_ends_after_start"),
            models.CheckConstraint(
                condition=Q(capacity__isnull=True) | Q(capacity__gt=0), name="event_capacity_positive"
            ),
        ]
        indexes = [models.Index(fields=["club", "starts_at"]), models.Index(fields=["status", "starts_at"])]

    @property
    def is_completed(self):
        """Derived, not stored."""
        return self.status == self.Status.PUBLISHED and self.ends_at < timezone.now()

    def __str__(self):
        return self.title


class EventRegistration(models.Model):
    class Status(models.TextChoices):
        REGISTERED = "registered", "Registered"
        CANCELLED = "cancelled", "Cancelled"

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    event = models.ForeignKey(Event, on_delete=models.PROTECT, related_name="registrations")
    student = models.ForeignKey("accounts.StudentProfile", on_delete=models.PROTECT, related_name="event_registrations")
    registered_at = models.DateTimeField(default=timezone.now)
    status = models.CharField(max_length=12, choices=Status.choices, default=Status.REGISTERED)

    class Meta:
        constraints = [models.UniqueConstraint(fields=["event", "student"], name="event_registration_unique")]
        indexes = [models.Index(fields=["event", "status"])]