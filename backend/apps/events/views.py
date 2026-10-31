from django.db import transaction
from django.db.models import BooleanField, Count, Exists, OuterRef, Q, Value
from django.shortcuts import get_object_or_404
from django.utils import timezone
from drf_spectacular.utils import OpenApiParameter, extend_schema, extend_schema_view
from rest_framework import filters, generics, status
from rest_framework.exceptions import NotAuthenticated, PermissionDenied
from rest_framework.pagination import PageNumberPagination
from rest_framework.permissions import AllowAny
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.accounts.models import User
from apps.accounts.permissions import IsClubOperator, IsStudent
from apps.notifications import services as notify

from .models import Event, EventRegistration
from .permissions import IsEventOwnerOrReadOnly
from .serializers import EventSerializer, EventWriteSerializer, RegistrationSerializer

PUBLIC_STATUSES = (Event.Status.PUBLISHED, Event.Status.CANCELLED)


def event_queryset(user=None):
    """Visible events: published/cancelled for everyone, plus drafts of the user's own club."""
    visible = Q(status__in=PUBLIC_STATUSES)
    profile = None
    if user is not None and user.is_authenticated:
        visible |= Q(club__operator_id=user.id)
        profile = getattr(user, "student_profile", None)
    if profile is not None:
        registered = Exists(EventRegistration.objects.filter(
            event=OuterRef("pk"), student=profile, status=EventRegistration.Status.REGISTERED))
    else:
        registered = Value(None, output_field=BooleanField())
    return (Event.objects.select_related("club")
            .annotate(registered_count=Count("registrations", filter=Q(
                registrations__status=EventRegistration.Status.REGISTERED)))
            .filter(visible)
            .annotate(is_registered=registered)
            .order_by("-starts_at", "id"))


def flag(params, name):
    return params.get(name, "").lower() in ("1", "true")


def require_role(user, role):
    if not user.is_authenticated:
        raise NotAuthenticated()
    if user.role != role:
        raise PermissionDenied("This filter is not available for your role.")


class EventPagination(PageNumberPagination):
    page_size = 20
    page_size_query_param = "page_size"
    max_page_size = 50


@extend_schema_view(
    get=extend_schema(parameters=[
        OpenApiParameter("club", str, description="Club slug"),
        OpenApiParameter("upcoming", bool, description="true: not yet ended (soonest first); false: past (latest first)"),
        OpenApiParameter("mine", bool, description="Club operators only: own club's events incl. drafts"),
        OpenApiParameter("registered", bool, description="Students only: events the student is registered for"),
    ]),
    post=extend_schema(request=EventWriteSerializer, responses={201: EventSerializer}),
)
class EventListCreateView(generics.ListCreateAPIView):
    serializer_class = EventSerializer
    pagination_class = EventPagination
    filter_backends = [filters.SearchFilter]
    search_fields = ["title"]

    def get_permissions(self):
        return [IsClubOperator()] if self.request.method == "POST" else [AllowAny()]

    def get_queryset(self):
        if getattr(self, "swagger_fake_view", False):
            return event_queryset()
        user, params = self.request.user, self.request.query_params
        qs = event_queryset(user)
        if flag(params, "mine"):
            require_role(user, User.Role.CLUB_OPERATOR)
            qs = qs.filter(club__operator_id=user.id)
        if flag(params, "registered"):
            require_role(user, User.Role.STUDENT)
            qs = qs.filter(is_registered=True)
        if params.get("club"):
            qs = qs.filter(club__slug=params["club"])
        upcoming, now = params.get("upcoming", "").lower(), timezone.now()
        if upcoming in ("1", "true"):
            qs = qs.filter(ends_at__gt=now).order_by("starts_at", "id")
        elif upcoming in ("0", "false"):
            qs = qs.filter(ends_at__lte=now).order_by("-starts_at", "id")
        return qs

    def create(self, request, *args, **kwargs):
        club = getattr(request.user, "club", None)
        if club is None:
            return Response({"detail": "This account has no club."}, status=status.HTTP_400_BAD_REQUEST)
        serializer = EventWriteSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        event = serializer.save(club=club, created_by=request.user)
        data = EventSerializer(event_queryset(request.user).get(pk=event.pk)).data
        return Response(data, status=status.HTTP_201_CREATED)


@extend_schema_view(patch=extend_schema(request=EventWriteSerializer, responses=EventSerializer))
class EventDetailView(generics.RetrieveUpdateAPIView):
    serializer_class = EventSerializer
    http_method_names = ["get", "patch", "head", "options"]
    permission_classes = [IsEventOwnerOrReadOnly]

    def get_queryset(self):
        return event_queryset(self.request.user)

    def update(self, request, *args, **kwargs):
        event = self.get_object()
        if event.status == Event.Status.CANCELLED or event.is_completed:
            return Response({"detail": "Cancelled or ended events cannot be edited."},
                            status=status.HTTP_409_CONFLICT)
        before = (event.starts_at, event.ends_at, event.venue)
        serializer = EventWriteSerializer(event, data=request.data, partial=True)
        serializer.is_valid(raise_exception=True)
        with transaction.atomic():
            serializer.save()
            if event.status == Event.Status.PUBLISHED and before != (event.starts_at, event.ends_at, event.venue):
                notify.notify_event_updated(event)
        return Response(EventSerializer(self.get_queryset().get(pk=event.pk)).data)


class EventActionView(APIView):
    """Publish / cancel. Visibility first (404 for others' drafts), then ownership (403)."""

    permission_classes = [IsClubOperator]
    new_status = None

    def check(self, event):
        raise NotImplementedError

    def notify(self, event):
        pass

    @extend_schema(request=None, responses=EventSerializer)
    def post(self, request, pk):
        visible = get_object_or_404(event_queryset(request.user), pk=pk)
        if visible.club.operator_id != request.user.id:
            raise PermissionDenied("Only this club's operator can do this.")
        with transaction.atomic():
            event = Event.objects.select_for_update().get(pk=pk)
            error = self.check(event)
            if error is not None:
                return error
            event.status = self.new_status
            event.save(update_fields=["status", "updated_at"])
            self.notify(event)
        return Response(EventSerializer(event_queryset(request.user).get(pk=pk)).data)


class EventPublishView(EventActionView):
    new_status = Event.Status.PUBLISHED

    def notify(self, event):
        notify.notify_event_published(event)

    def check(self, event):
        if event.status != Event.Status.DRAFT:
            return Response({"detail": "Only draft events can be published."}, status=status.HTTP_409_CONFLICT)
        if event.starts_at <= timezone.now():
            return Response({"starts_at": ["Cannot publish an event that has already started."]},
                            status=status.HTTP_400_BAD_REQUEST)


class EventCancelView(EventActionView):
    new_status = Event.Status.CANCELLED

    def notify(self, event):
        notify.notify_event_cancelled(event)

    def check(self, event):
        if event.status != Event.Status.PUBLISHED:
            return Response({"detail": "Only published events can be cancelled."}, status=status.HTTP_409_CONFLICT)
        if event.ends_at <= timezone.now():
            return Response({"detail": "This event has already ended."}, status=status.HTTP_409_CONFLICT)

class EventRegisterView(APIView):
    """A student's own registration: register (POST) / cancel (DELETE)."""

    permission_classes = [IsStudent]

    @extend_schema(request=None, responses={200: EventSerializer, 201: EventSerializer})
    def post(self, request, pk):
        get_object_or_404(event_queryset(request.user), pk=pk)  # drafts of others are invisible
        profile = getattr(request.user, "student_profile", None)
        if profile is None:
            return Response({"detail": "Student profile not found."}, status=status.HTTP_400_BAD_REQUEST)
        code = status.HTTP_200_OK
        with transaction.atomic():
            event = Event.objects.select_for_update().get(pk=pk)
            now = timezone.now()
            existing = EventRegistration.objects.filter(event=event, student=profile).first()
            if existing is None or existing.status != EventRegistration.Status.REGISTERED:
                if event.status != Event.Status.PUBLISHED:
                    return Response({"detail": "Registration is only open for published events."},
                                    status=status.HTTP_409_CONFLICT)
                if event.starts_at <= now:
                    return Response({"detail": "Registration is closed because the event has started."},
                                    status=status.HTTP_409_CONFLICT)
                if event.capacity is not None:
                    taken = EventRegistration.objects.filter(
                        event=event, status=EventRegistration.Status.REGISTERED).count()
                    if taken >= event.capacity:
                        return Response({"detail": "This event is full."}, status=status.HTTP_409_CONFLICT)
                if existing is None:
                    EventRegistration.objects.create(event=event, student=profile, registered_at=now)
                else:  # re-register after cancelling: reuse the same row
                    existing.status = EventRegistration.Status.REGISTERED
                    existing.registered_at = now
                    existing.save()
                code = status.HTTP_201_CREATED
        return Response(EventSerializer(event_queryset(request.user).get(pk=pk)).data, status=code)

    @extend_schema(request=None, responses={204: None})
    def delete(self, request, pk):
        get_object_or_404(event_queryset(request.user), pk=pk)
        profile = getattr(request.user, "student_profile", None)
        if profile is not None:
            with transaction.atomic():
                event = Event.objects.select_for_update().get(pk=pk)
                reg = EventRegistration.objects.filter(
                    event=event, student=profile, status=EventRegistration.Status.REGISTERED).first()
                if reg is not None:
                    if event.starts_at <= timezone.now():
                        return Response({"detail": "Registration cannot be cancelled after the event has started."},
                                        status=status.HTTP_409_CONFLICT)
                    reg.status = EventRegistration.Status.CANCELLED
                    reg.save(update_fields=["status"])
        return Response(status=status.HTTP_204_NO_CONTENT)


class EventRegistrationListView(generics.ListAPIView):
    """Operator of the owning club: students currently registered (no emails)."""

    serializer_class = RegistrationSerializer
    pagination_class = EventPagination
    permission_classes = [IsClubOperator]

    def get_queryset(self):
        if getattr(self, "swagger_fake_view", False):
            return EventRegistration.objects.none()
        event = get_object_or_404(event_queryset(self.request.user), pk=self.kwargs["pk"])
        if event.club.operator_id != self.request.user.id:
            raise PermissionDenied("Only this club's operator can do this.")
        return (EventRegistration.objects
                .filter(event=event, status=EventRegistration.Status.REGISTERED)
                .select_related("student").order_by("registered_at", "id"))