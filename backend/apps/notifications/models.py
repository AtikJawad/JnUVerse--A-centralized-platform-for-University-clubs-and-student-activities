import uuid

from django.conf import settings
from django.db import models
from django.db.models import Q

from apps.accounts.constants import DEPARTMENT_CHOICES


class Notice(models.Model):
    class Audience(models.TextChoices):
        PUBLIC = "public", "Public"
        FOLLOWERS = "followers", "Followers"
        MEMBERS = "members", "Members"
        DEPARTMENT = "department", "Department"

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    club = models.ForeignKey("clubs.Club", on_delete=models.PROTECT, related_name="notices")
    created_by = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.PROTECT, related_name="+")
    title = models.CharField(max_length=200)
    body = models.TextField()
    audience = models.CharField(max_length=12, choices=Audience.choices)
    target_department = models.CharField(max_length=100, choices=DEPARTMENT_CHOICES, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        constraints = [
            models.CheckConstraint(
                condition=(Q(audience="department") & ~Q(target_department=""))
                | (~Q(audience="department") & Q(target_department="")),
                name="notice_department_target_consistent",
            )
        ]
        indexes = [models.Index(fields=["club", "-created_at"])]


class Notification(models.Model):
    class Type(models.TextChoices):  # initial list, team to review
        NOTICE = "notice", "Notice"
        EVENT_PUBLISHED = "event_published", "Event published"
        EVENT_CANCELLED = "event_cancelled", "Event cancelled"
        MEMBERSHIP_UPDATE = "membership_update", "Membership update"
        COLLABORATION_UPDATE = "collaboration_update", "Collaboration update"

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    recipient = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="notifications")
    notice = models.ForeignKey(Notice, null=True, blank=True, on_delete=models.CASCADE, related_name="notifications")
    event = models.ForeignKey("events.Event", null=True, blank=True, on_delete=models.CASCADE, related_name="notifications")
    title = models.CharField(max_length=200)
    message = models.TextField()
    type = models.CharField(max_length=30, choices=Type.choices)
    read_at = models.DateTimeField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        constraints = [
            models.UniqueConstraint(
                fields=["recipient", "notice"], condition=Q(notice__isnull=False), name="notification_notice_once"
            ),
            models.UniqueConstraint(
                fields=["recipient", "event", "type"], condition=Q(event__isnull=False), name="notification_event_type_once"
            ),
        ]
        indexes = [models.Index(fields=["recipient", "-created_at"])]