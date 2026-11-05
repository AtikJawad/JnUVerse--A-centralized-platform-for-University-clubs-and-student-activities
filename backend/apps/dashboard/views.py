from datetime import timedelta

from django.db.models import Avg, Count, Q
from django.utils import timezone
from drf_spectacular.utils import extend_schema
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.accounts.permissions import IsClubOperator, IsStudent
from apps.clubs.models import ClubFollow, ClubMembership
from apps.clubs.views import club_queryset
from apps.collaborations.models import CollaborationRequest
from apps.events.models import Event, EventRegistration
from apps.events.views import event_queryset
from apps.feedback.models import EventRating
from apps.feedback.views import RATING_WINDOW
from apps.notifications.models import Notification

from .serializers import ClubDashboardSerializer, StudentDashboardSerializer

LIST_SIZE = 5
PUBLISHED = Event.Status.PUBLISHED
M = ClubMembership.Status


def unread(user):
    return Notification.objects.filter(recipient=user, read_at__isnull=True).count()


class StudentDashboardView(APIView):
    permission_classes = [IsStudent]

    @staticmethod
    def suggestions(user, profile, interest_ids):
        if not interest_ids:
            return []
        involved = ClubMembership.objects.filter(
            student=profile, status__in=[M.APPROVED, M.PENDING]).values("club_id")
        followed = ClubFollow.objects.filter(student=profile).values("club_id")
        return list(
            club_queryset(user)
            .annotate(shared_interests=Count("interests", filter=Q(interests__in=interest_ids), distinct=True))
            .filter(shared_interests__gt=0)
            .exclude(id__in=followed).exclude(id__in=involved)
            .order_by("-shared_interests", "-follower_count", "name")[:LIST_SIZE]
        )

    @extend_schema(responses=StudentDashboardSerializer)
    def get(self, request):
        user, now = request.user, timezone.now()
        profile = user.student_profile
        upcoming = event_queryset(user).filter(
            is_registered=True, status=PUBLISHED, ends_at__gt=now).order_by("starts_at", "id")
        to_rate = event_queryset(user).filter(
            is_registered=True, status=PUBLISHED, ends_at__lte=now, ends_at__gt=now - RATING_WINDOW,
            my_rating__isnull=True).order_by("ends_at", "id")
        memberships = ClubMembership.objects.filter(student=profile)
        interest_ids = list(profile.interests.values_list("id", flat=True))
        data = {
            "has_interests": bool(interest_ids),
            "counts": {
                "clubs_followed": ClubFollow.objects.filter(student=profile).count(),
                "clubs_joined": memberships.filter(status=M.APPROVED).count(),
                "pending_membership_requests": memberships.filter(status=M.PENDING).count(),
                "unread_notifications": unread(user),
                "events_registered_upcoming": upcoming.count(),
                "events_to_rate": to_rate.count(),
            },
            "next_events": upcoming[:LIST_SIZE],
            "rating_prompts": to_rate[:LIST_SIZE],
            "suggested_clubs": self.suggestions(user, profile, interest_ids),
        }
        return Response(StudentDashboardSerializer(data).data)


class ClubDashboardView(APIView):
    permission_classes = [IsClubOperator]

    @extend_schema(responses=ClubDashboardSerializer)
    def get(self, request):
        user, now = request.user, timezone.now()
        club = user.club
        events = event_queryset(user).filter(club=club, status=PUBLISHED)
        upcoming = events.filter(ends_at__gt=now)
        rated = EventRating.objects.filter(event__club=club).aggregate(avg=Avg("rating"), n=Count("pk"))
        data = {
            "club": club,
            "counts": {
                "followers": ClubFollow.objects.filter(club=club).count(),
                "members": ClubMembership.objects.filter(club=club, status=M.APPROVED).count(),
                "pending_membership_requests": ClubMembership.objects.filter(club=club, status=M.PENDING).count(),
                "upcoming_events": upcoming.count(),
                "draft_events": Event.objects.filter(club=club, status=Event.Status.DRAFT).count(),
                "pending_collaboration_requests": CollaborationRequest.objects.filter(
                    target_club=club, status=CollaborationRequest.Status.PENDING).count(),
                "unread_notifications": unread(user),
            },
            "ratings": {
                "average": None if rated["avg"] is None else round(rated["avg"], 1),
                "count": rated["n"],
            },
            "next_events": upcoming.order_by("starts_at", "id")[:LIST_SIZE],
            "recent_events": events.filter(ends_at__lte=now).order_by("-ends_at", "id")[:LIST_SIZE],
            "registrations_last_7_days": EventRegistration.objects.filter(
                event__club=club, status=EventRegistration.Status.REGISTERED,
                registered_at__gte=now - timedelta(days=7)).count(),
        }
        return Response(ClubDashboardSerializer(data).data)