from django.shortcuts import get_object_or_404
from django.utils import timezone
from drf_spectacular.types import OpenApiTypes
from drf_spectacular.utils import OpenApiParameter, extend_schema, extend_schema_view, inline_serializer
from rest_framework import generics, serializers
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from .models import Notification
from .serializers import NotificationSerializer
from .views import NoticePagination


@extend_schema_view(get=extend_schema(parameters=[
    OpenApiParameter("unread", OpenApiTypes.BOOL, description="true = only unread notifications."),
]))
class NotificationListView(generics.ListAPIView):
    serializer_class = NotificationSerializer
    permission_classes = [IsAuthenticated]
    pagination_class = NoticePagination

    def get_queryset(self):
        if getattr(self, "swagger_fake_view", False):
            return Notification.objects.none()
        qs = Notification.objects.filter(recipient=self.request.user)
        if self.request.query_params.get("unread", "").lower() == "true":
            qs = qs.filter(read_at__isnull=True)
        return qs.order_by("-created_at", "-id")


class UnreadCountView(APIView):
    permission_classes = [IsAuthenticated]

    @extend_schema(responses=inline_serializer("UnreadCount", {"unread_count": serializers.IntegerField()}))
    def get(self, request):
        n = Notification.objects.filter(recipient=request.user, read_at__isnull=True).count()
        return Response({"unread_count": n})


class NotificationReadView(APIView):
    permission_classes = [IsAuthenticated]

    @extend_schema(request=None, responses=NotificationSerializer)
    def post(self, request, pk):
        n = get_object_or_404(Notification, pk=pk, recipient=request.user)
        if n.read_at is None:
            n.read_at = timezone.now()
            n.save(update_fields=["read_at"])
        return Response(NotificationSerializer(n).data)


class ReadAllView(APIView):
    permission_classes = [IsAuthenticated]

    @extend_schema(request=None, responses=inline_serializer("ReadAllResult", {"updated": serializers.IntegerField()}))
    def post(self, request):
        updated = Notification.objects.filter(recipient=request.user, read_at__isnull=True).update(read_at=timezone.now())
        return Response({"updated": updated})