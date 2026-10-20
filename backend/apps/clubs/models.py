from django.conf import settings
from django.db import models


class Club(models.Model):
    name = models.CharField(max_length=150, unique=True)
    description = models.TextField(blank=True)
    operator = models.OneToOneField(
        settings.AUTH_USER_MODEL, on_delete=models.PROTECT, related_name="club"
    )  # one authorized account per club
    is_verified = models.BooleanField(default=True)  # verified on account creation
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return self.name