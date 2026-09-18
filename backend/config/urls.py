"""
Root URL configuration for the JnUVerse backend.

Week 1 scope: admin site + a lightweight health-check endpoint only, so
the team can verify the server boots and connects correctly. Per-app API
routes (accounts, clubs, events, ...) are included here as each app's
views are implemented in its scheduled week.
"""

from django.contrib import admin
from django.http import JsonResponse
from django.urls import path


def health_check(request):
    return JsonResponse({"status": "ok", "project": "JnUVerse backend"})


urlpatterns = [
    path("admin/", admin.site.urls),
    path("api/health/", health_check, name="health-check"),
    # Example of how per-app routes will be wired up as each app grows:
    # path("api/accounts/", include("apps.accounts.urls")),
    # path("api/clubs/", include("apps.clubs.urls")),
    # path("api/events/", include("apps.events.urls")),
    # path("api/notifications/", include("apps.notifications.urls")),
    # path("api/feedback/", include("apps.feedback.urls")),
    # path("api/collaborations/", include("apps.collaborations.urls")),
    # path("api/reports/", include("apps.reports.urls")),
]
