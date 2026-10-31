from django.db import transaction
from django.db.models import Q
from drf_spectacular.types import OpenApiTypes
from drf_spectacular.utils import OpenApiParameter, extend_schema, extend_schema_view
from rest_framework import generics, mixins
from rest_framework.exceptions import NotAuthenticated, PermissionDenied
from rest_framework.pagination import PageNumberPagination
from rest_framework.permissions import SAFE_METHODS, AllowAny
from rest_framework.response import Response

from apps.accounts.models import User
from apps.accounts.permissions import IsClubOperator
from apps.clubs.models import Club, ClubFollow, ClubMembership

from . import services as notify
from .models import Notice
from .serializers import NoticeCreateSerializer, NoticeSerializer, NoticeUpdateSerializer


def notice_queryset(user):
    """Notices the viewer is allowed to see."""
    qs = Notice.objects.select_related("club")
    public = Q(audience=Notice.Audience.PUBLIC)
    if not user.is_authenticated:
        return qs.filter(public)
    if user.role == User.Role.CLUB_OPERATOR:
        return qs.filter(public | Q(club__operator=user))
    profile = getattr(user, "student_profile", None)
    if profile is None:
        return qs.filter(public)
    followed = ClubFollow.objects.filter(student=profile).values("club_id")
    joined = ClubMembership.objects.filter(
        student=profile, status=ClubMembership.Status.APPROVED
    ).values("club_id")
    return qs.filter(
        public
        | Q(audience=Notice.Audience.FOLLOWERS, club_id__in=followed)
        | Q(audience=Notice.Audience.FOLLOWERS, club_id__in=joined)
        | Q(audience=Notice.Audience.MEMBERS, club_id__in=joined)
        | Q(audience=Notice.Audience.DEPARTMENT, target_department=profile.department)
    )


class NoticePagination(PageNumberPagination):
    page_size = 20
    page_size_query_param = "page_size"
    max_page_size = 50


@extend_schema_view(
    get=extend_schema(parameters=[
        OpenApiParameter("club", OpenApiTypes.STR, description="Club slug."),
        OpenApiParameter("mine", OpenApiTypes.BOOL, description="Club operators only: own club's notices."),
    ]),
    post=extend_schema(request=NoticeCreateSerializer, responses={201: NoticeSerializer}),
)
class NoticeListCreateView(generics.ListCreateAPIView):
    pagination_class = NoticePagination

    def get_permissions(self):
        return [IsClubOperator()] if self.request.method == "POST" else [AllowAny()]

    def get_serializer_class(self):
        return NoticeCreateSerializer if self.request.method == "POST" else NoticeSerializer

    def get_queryset(self):
        if getattr(self, "swagger_fake_view", False):
            return Notice.objects.none()
        user = self.request.user
        qs = notice_queryset(user)
        slug = self.request.query_params.get("club")
        if slug:
            qs = qs.filter(club__slug=slug)
        if self.request.query_params.get("mine", "").lower() == "true":
            if not user.is_authenticated:
                raise NotAuthenticated()
            if user.role != User.Role.CLUB_OPERATOR:
                raise PermissionDenied("Only club operators can use mine=true.")
            qs = qs.filter(club__operator=user)
        return qs.order_by("-created_at", "-id")

    def create(self, request, *args, **kwargs):
        serializer = NoticeCreateSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        club = Club.objects.get(operator=request.user)
        with transaction.atomic():
            notice = serializer.save(club=club, created_by=request.user)
            notify.notify_notice(notice)
        return Response(NoticeSerializer(notice).data, status=201)


@extend_schema_view(
    patch=extend_schema(request=NoticeUpdateSerializer, responses=NoticeSerializer),
    delete=extend_schema(responses={204: None}),
)
class NoticeDetailView(mixins.RetrieveModelMixin, mixins.DestroyModelMixin, generics.GenericAPIView):
    serializer_class = NoticeSerializer

    def get_permissions(self):
        return [AllowAny()] if self.request.method in SAFE_METHODS else [IsClubOperator()]

    def get_queryset(self):
        if getattr(self, "swagger_fake_view", False):
            return Notice.objects.none()
        return notice_queryset(self.request.user)

    def get_object(self):
        obj = super().get_object()
        if self.request.method not in SAFE_METHODS and obj.club.operator_id != self.request.user.id:
            raise PermissionDenied("You can only modify your own club's notices.")
        return obj

    def get(self, request, *args, **kwargs):
        return self.retrieve(request, *args, **kwargs)

    def patch(self, request, *args, **kwargs):
        notice = self.get_object()
        serializer = NoticeUpdateSerializer(notice, data=request.data, partial=True)
        serializer.is_valid(raise_exception=True)
        serializer.save()
        return Response(NoticeSerializer(notice).data)

    def delete(self, request, *args, **kwargs):
        return self.destroy(request, *args, **kwargs)