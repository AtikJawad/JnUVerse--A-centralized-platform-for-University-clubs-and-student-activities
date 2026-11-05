from django.db import IntegrityError, transaction
from drf_spectacular.utils import extend_schema, extend_schema_view
from rest_framework import generics, status
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

from apps.clubs.views import ClubPagination

from .models import ContentReport
from .serializers import ReportCreateSerializer, ReportSerializer

DUPLICATE = {"detail": "You have already reported this."}


@extend_schema_view(
    post=extend_schema(request=ReportCreateSerializer, responses={201: ReportSerializer}),
)
class ReportListCreateView(generics.ListCreateAPIView):
    """Any logged-in user: report a club or event (POST) and see their own reports (GET)."""

    permission_classes = [IsAuthenticated]
    pagination_class = ClubPagination
    serializer_class = ReportSerializer

    def get_queryset(self):
        if getattr(self, "swagger_fake_view", False):
            return ContentReport.objects.none()
        return (ContentReport.objects.filter(reporter=self.request.user)
                .select_related("club", "event").order_by("-created_at", "-id"))

    def create(self, request, *args, **kwargs):
        serializer = ReportCreateSerializer(data=request.data, context={"user": request.user})
        serializer.is_valid(raise_exception=True)
        data = serializer.validated_data
        if ContentReport.objects.filter(reporter=request.user, club=data["club"], event=data["event"]).exists():
            return Response(DUPLICATE, status=status.HTTP_409_CONFLICT)
        try:
            with transaction.atomic():
                report = ContentReport.objects.create(
                    reporter=request.user, club=data["club"], event=data["event"],
                    reason=data["reason"], details=data.get("details", "").strip())
        except IntegrityError:
            return Response(DUPLICATE, status=status.HTTP_409_CONFLICT)
        return Response(ReportSerializer(report).data, status=status.HTTP_201_CREATED)