import uuid

from django.db import models
from django.db.models import Q


class EventRating(models.Model):
    """Rating only (1-5). No written comments."""

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    event = models.ForeignKey("events.Event", on_delete=models.PROTECT, related_name="ratings")
    student = models.ForeignKey("accounts.StudentProfile", on_delete=models.PROTECT, related_name="event_ratings")
    rating = models.PositiveSmallIntegerField()
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        constraints = [
            models.UniqueConstraint(fields=["event", "student"], name="event_rating_unique"),
            models.CheckConstraint(condition=Q(rating__gte=1) & Q(rating__lte=5), name="event_rating_1_to_5"),
        ]