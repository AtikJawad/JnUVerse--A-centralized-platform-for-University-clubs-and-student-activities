import uuid

from django.conf import settings
from django.db import models
from django.db.models.functions import Lower
from django.utils.text import slugify
from django.utils import timezone

class Club(models.Model):
    """Verified on creation: no admin approval workflow."""

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    operator = models.OneToOneField(
        settings.AUTH_USER_MODEL, on_delete=models.PROTECT, related_name="club"
    )
    name = models.CharField(max_length=150)
    slug = models.SlugField(max_length=170, unique=True, blank=True)
    description = models.TextField(blank=True)
    logo = models.URLField(blank=True)
    contact_email = models.EmailField(blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        constraints = [models.UniqueConstraint(Lower("name"), name="club_name_ci_unique")]

    def save(self, *args, **kwargs):
        if not self.slug:
            base = slugify(self.name) or "club"
            slug, n = base, 2
            while Club.objects.filter(slug=slug).exclude(pk=self.pk).exists():
                slug, n = f"{base}-{n}", n + 1
            self.slug = slug
        super().save(*args, **kwargs)

    def __str__(self):
        return self.name

class ClubFollow(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    student = models.ForeignKey("accounts.StudentProfile", on_delete=models.CASCADE, related_name="club_follows")
    club = models.ForeignKey(Club, on_delete=models.CASCADE, related_name="follows")
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        constraints = [models.UniqueConstraint(fields=["student", "club"], name="club_follow_unique")]


class ClubMembership(models.Model):
    """Leave/remove keep the row; rejoining resets the same row to PENDING."""

    class Status(models.TextChoices):
        PENDING = "pending", "Pending"
        APPROVED = "approved", "Approved"
        REJECTED = "rejected", "Rejected"
        LEFT = "left", "Left"
        REMOVED = "removed", "Removed"

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    student = models.ForeignKey("accounts.StudentProfile", on_delete=models.PROTECT, related_name="memberships")
    club = models.ForeignKey(Club, on_delete=models.PROTECT, related_name="memberships")
    status = models.CharField(max_length=10, choices=Status.choices, default=Status.PENDING)
    requested_at = models.DateTimeField(default=timezone.now)
    reviewed_at = models.DateTimeField(null=True, blank=True)
    reviewed_by = models.ForeignKey(
        settings.AUTH_USER_MODEL, null=True, blank=True, on_delete=models.PROTECT, related_name="+"
    )

    class Meta:
        constraints = [models.UniqueConstraint(fields=["student", "club"], name="club_membership_unique")]
        indexes = [models.Index(fields=["club", "status"])]