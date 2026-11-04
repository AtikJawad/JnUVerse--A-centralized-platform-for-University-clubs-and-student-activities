from django.utils import timezone
from rest_framework import serializers

from apps.clubs.models import Club
from apps.events.models import Event
from apps.events.serializers import ClubMiniSerializer

from .models import CollaborationRequest


class CollabEventSerializer(serializers.ModelSerializer):
    class Meta:
        model = Event
        fields = ["id", "title", "starts_at"]


class CollaborationSerializer(serializers.ModelSerializer):
    requesting_club = ClubMiniSerializer(read_only=True)
    target_club = ClubMiniSerializer(read_only=True)
    event = CollabEventSerializer(read_only=True, allow_null=True)

    class Meta:
        model = CollaborationRequest
        fields = ["id", "requesting_club", "target_club", "event", "title", "description",
                  "status", "created_at", "responded_at"]
        read_only_fields = fields


class CollaborationCreateSerializer(serializers.Serializer):
    target_club = serializers.SlugRelatedField(
        slug_field="slug", queryset=Club.objects.all(), error_messages={"does_not_exist": "Club not found."})
    title = serializers.CharField(max_length=200)
    description = serializers.CharField(required=False, allow_blank=True)
    event = serializers.PrimaryKeyRelatedField(
        queryset=Event.objects.all(), required=False, allow_null=True,
        error_messages={"does_not_exist": "Event not found."})

    def validate_target_club(self, value):
        if value.id == self.context["club"].id:
            raise serializers.ValidationError("You cannot send a request to your own club.")
        return value

    def validate_event(self, value):
        if value is None:
            return value
        if value.club_id != self.context["club"].id:
            raise serializers.ValidationError("You can only link your own events.")
        if value.status != Event.Status.PUBLISHED or value.ends_at <= timezone.now():
            raise serializers.ValidationError("Only published events that have not ended can be linked.")
        return value


class PartnerSerializer(serializers.Serializer):
    id = serializers.UUIDField()
    name = serializers.CharField()
    slug = serializers.CharField()
    logo = serializers.CharField(allow_blank=True)
    partner_since = serializers.DateTimeField(allow_null=True)