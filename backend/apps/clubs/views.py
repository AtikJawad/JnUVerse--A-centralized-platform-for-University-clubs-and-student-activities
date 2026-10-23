from django.db.models import BooleanField, CharField, Count, Exists, OuterRef, Q, Subquery, Value
from django.shortcuts import get_object_or_404
from django.utils import timezone
from django.db import transaction
from drf_spectacular.utils import extend_schema, inline_serializer
from rest_framework import filters, generics, serializers, status
from rest_framework.pagination import PageNumberPagination
from rest_framework.permissions import AllowAny
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework.exceptions import PermissionDenied

from apps.accounts.permissions import IsClubOperator, IsStudent

from .models import Club, ClubFollow, ClubMembership
from .permissions import IsOwnerOrReadOnly
from .serializers import ClubPublicSerializer, ClubUpdateSerializer, MembershipSerializer


def club_queryset(user=None):
    qs = Club.objects.annotate(
        follower_count=Count("follows", distinct=True),
        member_count=Count("memberships", filter=Q(memberships__status="approved"), distinct=True),
    )
    profile = getattr(user, "student_profile", None) if user and user.is_authenticated else None
    if profile is not None:
        following = Exists(ClubFollow.objects.filter(club=OuterRef("pk"), student=profile))
        my_membership = Subquery(
            ClubMembership.objects.filter(club=OuterRef("pk"), student=profile).values("status")[:1]
        )
    else:
        following = Value(None, output_field=BooleanField())
        my_membership = Value(None, output_field=CharField())
    return qs.annotate(is_following=following, my_membership=my_membership).order_by("name")


class ClubPagination(PageNumberPagination):
    page_size = 20
    page_size_query_param = "page_size"
    max_page_size = 50


class ClubListView(generics.ListAPIView):
    serializer_class = ClubPublicSerializer
    pagination_class = ClubPagination
    permission_classes = [AllowAny]
    filter_backends = [filters.SearchFilter]
    search_fields = ["name"]

    def get_queryset(self):
        return club_queryset(self.request.user)


class ClubDetailView(generics.RetrieveUpdateAPIView):
    lookup_field = "slug"
    http_method_names = ["get", "patch", "head", "options"]
    permission_classes = [IsOwnerOrReadOnly]

    def get_queryset(self):
        return club_queryset(self.request.user)

    def get_serializer_class(self):
        return ClubUpdateSerializer if self.request.method == "PATCH" else ClubPublicSerializer

    def update(self, request, *args, **kwargs):
        club = self.get_object()
        serializer = ClubUpdateSerializer(club, data=request.data, partial=True)
        serializer.is_valid(raise_exception=True)
        serializer.save()
        return Response(ClubPublicSerializer(self.get_queryset().get(pk=club.pk)).data)

class ClubFollowView(APIView):
    permission_classes = [IsStudent]

    def _profile_and_club(self, request, slug):
        club = get_object_or_404(Club, slug=slug)
        return getattr(request.user, "student_profile", None), club

    @extend_schema(request=None, responses=inline_serializer("FollowState", {
        "following": serializers.BooleanField(), "follower_count": serializers.IntegerField()}))
    def post(self, request, slug):
        profile, club = self._profile_and_club(request, slug)
        if profile is None:
            return Response({"detail": "Student profile not found."}, status=status.HTTP_400_BAD_REQUEST)
        _, created = ClubFollow.objects.get_or_create(student=profile, club=club)
        return Response(
            {"following": True, "follower_count": club.follows.count()},
            status=status.HTTP_201_CREATED if created else status.HTTP_200_OK,
        )

    @extend_schema(request=None, responses={204: None})
    def delete(self, request, slug):
        profile, club = self._profile_and_club(request, slug)
        if profile is not None:
            ClubFollow.objects.filter(student=profile, club=club).delete()
        return Response(status=status.HTTP_204_NO_CONTENT)


class ClubMembershipView(APIView):
    """Student's own membership with a club: request / status / leave."""

    permission_classes = [IsStudent]

    def _ctx(self, request, slug):
        club = get_object_or_404(Club, slug=slug)
        return getattr(request.user, "student_profile", None), club

    @staticmethod
    def _state(m):
        return {"status": m.status if m else None, "requested_at": m.requested_at if m else None}

    @extend_schema(responses=inline_serializer("MembershipState", {
        "status": serializers.CharField(allow_null=True),
        "requested_at": serializers.DateTimeField(allow_null=True)}))
    def get(self, request, slug):
        profile, club = self._ctx(request, slug)
        m = ClubMembership.objects.filter(student=profile, club=club).first() if profile else None
        return Response(self._state(m))

    @extend_schema(request=None, responses={
        200: inline_serializer("MembershipStateExisting", {
            "status": serializers.CharField(), "requested_at": serializers.DateTimeField()}),
        201: inline_serializer("MembershipStateRequested", {
            "status": serializers.CharField(), "requested_at": serializers.DateTimeField()}),
    })
    def post(self, request, slug):
        profile, club = self._ctx(request, slug)
        if profile is None:
            return Response({"detail": "Student profile not found."}, status=status.HTTP_400_BAD_REQUEST)
        m, created = ClubMembership.objects.get_or_create(student=profile, club=club)
        code = status.HTTP_201_CREATED
        if not created:
            if m.status in (ClubMembership.Status.PENDING, ClubMembership.Status.APPROVED):
                code = status.HTTP_200_OK  # already requested or a member: no change
            else:  # rejected / left / removed: rejoin resets the same row
                m.status = ClubMembership.Status.PENDING
                m.requested_at = timezone.now()
                m.reviewed_at = None
                m.reviewed_by = None
                m.save()
        return Response(self._state(m), status=code)

    @extend_schema(request=None, responses={204: None})
    def delete(self, request, slug):
        profile, club = self._ctx(request, slug)
        m = ClubMembership.objects.filter(student=profile, club=club).first() if profile else None
        if m and m.status in (ClubMembership.Status.PENDING, ClubMembership.Status.APPROVED):
            m.status = ClubMembership.Status.LEFT
            m.save(update_fields=["status"])
        return Response(status=status.HTTP_204_NO_CONTENT)

def owned_club(request, slug):
    club = get_object_or_404(Club, slug=slug)
    if club.operator_id != request.user.id:
        raise PermissionDenied("Only this club's operator can do this.")
    return club


class OperatorMembershipListView(generics.ListAPIView):
    serializer_class = MembershipSerializer
    pagination_class = ClubPagination
    permission_classes = [IsClubOperator]
    list_status = None
    list_ordering = ()

    def get_queryset(self):
        if getattr(self, "swagger_fake_view", False):
            return ClubMembership.objects.none()
        club = owned_club(self.request, self.kwargs["slug"])
        return (ClubMembership.objects.filter(club=club, status=self.list_status)
                .select_related("student").order_by(*self.list_ordering))


class ClubMemberListView(OperatorMembershipListView):
    list_status = ClubMembership.Status.APPROVED
    list_ordering = ("student__full_name",)


class ClubMembershipRequestListView(OperatorMembershipListView):
    list_status = ClubMembership.Status.PENDING
    list_ordering = ("requested_at",)


class MembershipReviewView(APIView):
    permission_classes = [IsClubOperator]
    new_status = None
    verb = ""

    @extend_schema(request=None, responses=MembershipSerializer)
    def post(self, request, slug, pk):
        club = owned_club(request, slug)
        with transaction.atomic():
            m = get_object_or_404(ClubMembership.objects.select_for_update(), pk=pk, club=club)
            if m.status != ClubMembership.Status.PENDING:
                return Response({"detail": f"Only pending requests can be {self.verb}."},
                                status=status.HTTP_409_CONFLICT)
            m.status = self.new_status
            m.reviewed_at = timezone.now()
            m.reviewed_by = request.user
            m.save()
        return Response(MembershipSerializer(m).data)


class MembershipApproveView(MembershipReviewView):
    new_status = ClubMembership.Status.APPROVED
    verb = "approved"


class MembershipRejectView(MembershipReviewView):
    new_status = ClubMembership.Status.REJECTED
    verb = "rejected"


class MembershipRemoveView(APIView):
    permission_classes = [IsClubOperator]

    @extend_schema(request=None, responses={204: None})
    def delete(self, request, slug, pk):
        club = owned_club(request, slug)
        with transaction.atomic():
            m = get_object_or_404(ClubMembership.objects.select_for_update(), pk=pk, club=club)
            if m.status != ClubMembership.Status.APPROVED:
                return Response({"detail": "Only approved members can be removed."},
                                status=status.HTTP_409_CONFLICT)
            m.status = ClubMembership.Status.REMOVED
            m.reviewed_at = timezone.now()
            m.reviewed_by = request.user
            m.save()
        return Response(status=status.HTTP_204_NO_CONTENT)