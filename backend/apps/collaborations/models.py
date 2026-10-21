import uuid

from django.db import models
from django.db.models import F, Q


class CollaborationRequest(models.Model):
    class Status(models.TextChoices):
        PENDING = "pending", "Pending"
        ACCEPTED = "accepted", "Accepted"
        REJECTED = "rejected", "Rejected"
        CANCELLED = "cancelled", "Cancelled"

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    requesting_club = models.ForeignKey("clubs.Club", on_delete=models.PROTECT, related_name="collaboration_requests_sent")
    target_club = models.ForeignKey("clubs.Club", on_delete=models.PROTECT, related_name="collaboration_requests_received")
    event = models.ForeignKey("events.Event", null=True, blank=True, on_delete=models.PROTECT, related_name="collaboration_requests")
    title = models.CharField(max_length=200)
    description = models.TextField(blank=True)
    status = models.CharField(max_length=10, choices=Status.choices, default=Status.PENDING)
    created_at = models.DateTimeField(auto_now_add=True)
    responded_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        constraints = [
            models.CheckConstraint(condition=~Q(requesting_club=F("target_club")), name="collab_no_self_request"),
            models.UniqueConstraint(
                fields=["requesting_club", "target_club"],
                condition=Q(status="pending"),
                name="collab_one_pending_per_pair",
            ),
        ]