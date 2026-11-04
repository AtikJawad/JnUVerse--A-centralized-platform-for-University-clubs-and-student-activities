from datetime import timedelta

from django.db.models import Count
from django.shortcuts import get_object_or_404
from django.utils import timezone
from drf_spectacular.utils import extend_schema, inline_serializer
from rest_framework import serializers, status
from rest_framework.exceptions import PermissionDenied
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.accounts.permissions import IsClubOperator, IsStudent
from apps.events.models import Event, EventRegistration
from apps.events.serializers import EventSerializer
from apps.events.views import event_queryset

from .models import EventRating
from .serializers import RatingInputSerializer

RATING_WINDOW = timedelta(days=7)  # students can rate until 7 days after the event ends


class EventRatingView(APIView):
    """A student's own rating of an event (1-5, no comments)."""

    permission_classes = [IsStudent]

    @extend_schema(responses=inline_serializer("MyRating", {"rating": serializers.IntegerField(allow_null=True)}))
    def get(self, request, pk):
        event = get_object_or_404(event_queryset(request.user), pk=pk)
        profile = getattr(request.user, "student_profile", None)
        r = EventRating.objects.filter(event=event, student=profile).first() if profile else None
        return Response({"rating": r.rating if r else None})

    @extend_schema(request=RatingInputSerializer, responses={200: EventSerializer, 201: EventSerializer})
    def put(self, request, pk):
        event = get_object_or_404(event_queryset(request.user), pk=pk)
        profile = getattr(request.user, "student_profile", None)
        registered = profile is not None and EventRegistration.objects.filter(
            event=event, student=profile, status=EventRegistration.Status.REGISTERED).exists()
        if not registered:
            raise PermissionDenied("Only students registered for this event can rate it.")
        now = timezone.now()
        if event.status != Event.Status.PUBLISHED:
            return Response({"detail": "Only published events can be rated."}, status=status.HTTP_409_CONFLICT)
        if event.ends_at > now:
            return Response({"detail": "You can rate this event after it ends."}, status=status.HTTP_409_CONFLICT)
        if now > event.ends_at + RATING_WINDOW:
            return Response({"detail": "The rating period (7 days after the event ends) is over."},
                            status=status.HTTP_409_CONFLICT)
        serializer = RatingInputSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        _, created = EventRating.objects.update_or_create(
            event=event, student=profile, defaults={"rating": serializer.validated_data["rating"]})
        code = status.HTTP_201_CREATED if created else status.HTTP_200_OK
        return Response(EventSerializer(event_queryset(request.user).get(pk=pk)).data, status=code)


class EventRatingSummaryView(APIView):
    """Operator of the owning club: average, count and 1-5 breakdown (never individual ratings)."""

    permission_classes = [IsClubOperator]

    @extend_schema(responses=inline_serializer("RatingSummary", {
        "average": serializers.FloatField(allow_null=True),
        "count": serializers.IntegerField(),
        "breakdown": serializers.DictField(child=serializers.IntegerField()),
    }))
    def get(self, request, pk):
        event = get_object_or_404(event_queryset(request.user), pk=pk)
        if event.club.operator_id != request.user.id:
            raise PermissionDenied("Only this club's operator can do this.")
        counts = {str(i): 0 for i in range(1, 6)}
        for row in EventRating.objects.filter(event=event).values("rating").annotate(c=Count("pk")):
            counts[str(row["rating"])] = row["c"]
        total = sum(counts.values())
        average = round(sum(int(k) * v for k, v in counts.items()) / total, 1) if total else None
        return Response({"average": average, "count": total, "breakdown": counts})