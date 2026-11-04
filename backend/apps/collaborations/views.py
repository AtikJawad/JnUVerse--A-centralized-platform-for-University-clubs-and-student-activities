from django.db import IntegrityError, transaction
from django.db.models import Q
from django.shortcuts import get_object_or_404
from django.utils import timezone
from drf_spectacular.types import OpenApiTypes
from drf_spectacular.utils import OpenApiParameter, extend_schema, extend_schema_view
from rest_framework import generics, status
from rest_framework.exceptions import PermissionDenied, ValidationError
from rest_framework.permissions import AllowAny
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.accounts.permissions import IsClubOperator
from apps.clubs.models import Club
from apps.clubs.views import ClubPagination
from apps.notifications import services as notify

from .models import CollaborationRequest
from .serializers import CollaborationCreateSerializer, CollaborationSerializer, PartnerSerializer

Status = CollaborationRequest.Status
DUPLICATE = "A pending collaboration request already exists between these clubs."


def involving(club):
    return Q(requesting_club=club) | Q(target_club=club)


@extend_schema_view(
    get=extend_schema(parameters=[
        OpenApiParameter("box", OpenApiTypes.STR, enum=["sent", "received"],
                         description="Only sent or only received requests (default: both)."),
        OpenApiParameter("status", OpenApiTypes.STR, enum=list(Status.values)),
    ]),
    post=extend_schema(request=CollaborationCreateSerializer, responses={201: CollaborationSerializer}),
)
class CollaborationListCreateView(generics.ListCreateAPIView):
    permission_classes = [IsClubOperator]
    pagination_class = ClubPagination
    serializer_class = CollaborationSerializer

    def get_queryset(self):
        if getattr(self, "swagger_fake_view", False):
            return CollaborationRequest.objects.none()
        club = self.request.user.club
        qs = CollaborationRequest.objects.filter(involving(club)).select_related(
            "requesting_club", "target_club", "event")
        box = self.request.query_params.get("box")
        if box == "sent":
            qs = qs.filter(requesting_club=club)
        elif box == "received":
            qs = qs.filter(target_club=club)
        elif box:
            raise ValidationError({"box": ["Must be 'sent' or 'received'."]})
        st = self.request.query_params.get("status")
        if st:
            if st not in Status.values:
                raise ValidationError({"status": [f"Must be one of: {', '.join(Status.values)}."]})
            qs = qs.filter(status=st)
        return qs.order_by("-created_at", "-id")

    def create(self, request, *args, **kwargs):
        club = request.user.club
        serializer = CollaborationCreateSerializer(data=request.data, context={"club": club})
        serializer.is_valid(raise_exception=True)
        data = serializer.validated_data
        target = data["target_club"]
        pair = Q(requesting_club=club, target_club=target) | Q(requesting_club=target, target_club=club)
        if CollaborationRequest.objects.filter(pair, status=Status.PENDING).exists():
            return Response({"detail": DUPLICATE}, status=status.HTTP_409_CONFLICT)
        try:
            with transaction.atomic():
                obj = CollaborationRequest.objects.create(
                    requesting_club=club, target_club=target, event=data.get("event"),
                    title=data["title"], description=data.get("description", ""))
                notify.notify_collaboration_request(obj)
        except IntegrityError:
            return Response({"detail": DUPLICATE}, status=status.HTTP_409_CONFLICT)
        return Response(CollaborationSerializer(obj).data, status=status.HTTP_201_CREATED)


class CollaborationDetailView(generics.RetrieveAPIView):
    permission_classes = [IsClubOperator]
    serializer_class = CollaborationSerializer

    def get_queryset(self):
        if getattr(self, "swagger_fake_view", False):
            return CollaborationRequest.objects.none()
        return CollaborationRequest.objects.filter(involving(self.request.user.club)).select_related(
            "requesting_club", "target_club", "event")


class CollaborationActionView(APIView):
    """Accept / reject (target club) or cancel (requesting club), pending requests only."""

    permission_classes = [IsClubOperator]
    actor = "target_club_id"
    new_status = None
    verb = ""

    def notify(self, obj):
        raise NotImplementedError

    @extend_schema(request=None, responses=CollaborationSerializer)
    def post(self, request, pk):
        club = request.user.club
        with transaction.atomic():
            obj = get_object_or_404(
                CollaborationRequest.objects.select_for_update().filter(involving(club)), pk=pk)
            if getattr(obj, self.actor) != club.id:
                raise PermissionDenied("Your club cannot do this for this request.")
            if obj.status != Status.PENDING:
                return Response({"detail": f"Only pending requests can be {self.verb}."},
                                status=status.HTTP_409_CONFLICT)
            obj.status = self.new_status
            obj.responded_at = timezone.now()
            obj.save(update_fields=["status", "responded_at"])
            self.notify(obj)
        return Response(CollaborationSerializer(obj).data)


class CollaborationAcceptView(CollaborationActionView):
    new_status, verb = Status.ACCEPTED, "accepted"

    def notify(self, obj):
        notify.notify_collaboration_response(obj, "accepted")


class CollaborationRejectView(CollaborationActionView):
    new_status, verb = Status.REJECTED, "rejected"

    def notify(self, obj):
        notify.notify_collaboration_response(obj, "rejected")


class CollaborationCancelView(CollaborationActionView):
    actor = "requesting_club_id"
    new_status, verb = Status.CANCELLED, "cancelled"

    def notify(self, obj):
        notify.notify_collaboration_cancelled(obj)


class ClubPartnersView(generics.ListAPIView):
    """Public: clubs with at least one accepted collaboration with this club."""

    permission_classes = [AllowAny]
    serializer_class = PartnerSerializer
    pagination_class = ClubPagination

    def get_queryset(self):
        if getattr(self, "swagger_fake_view", False):
            return []
        club = get_object_or_404(Club, slug=self.kwargs["slug"])
        accepted = CollaborationRequest.objects.filter(involving(club), status=Status.ACCEPTED).select_related(
            "requesting_club", "target_club")
        partners = {}
        for r in accepted:
            other = r.target_club if r.requesting_club_id == club.id else r.requesting_club
            entry = partners.setdefault(other.id, {
                "id": other.id, "name": other.name, "slug": other.slug, "logo": other.logo,
                "partner_since": r.responded_at})
            if r.responded_at and (entry["partner_since"] is None or r.responded_at < entry["partner_since"]):
                entry["partner_since"] = r.responded_at
        return sorted(partners.values(), key=lambda p: p["name"].lower())