import uuid

from rest_framework import serializers

from apps.clubs.models import Club
from apps.events.models import Event
from apps.events.serializers import ClubMiniSerializer

from .models import ContentReport


class ReportEventSerializer(serializers.ModelSerializer):
    class Meta:
        model = Event
        fields = ["id", "title"]


class ReportSerializer(serializers.ModelSerializer):
    target_type = serializers.SerializerMethodField()
    club = ClubMiniSerializer(read_only=True, allow_null=True)
    event = ReportEventSerializer(read_only=True, allow_null=True)

    class Meta:
        model = ContentReport
        fields = ["id", "target_type", "club", "event", "reason", "details", "status", "created_at"]
        read_only_fields = fields

    def get_target_type(self, obj) -> str:
        return "club" if obj.club_id else "event"


class ReportCreateSerializer(serializers.Serializer):
    target_type = serializers.ChoiceField(choices=["club", "event"])
    target = serializers.CharField(help_text="Club slug, or event id.")
    reason = serializers.ChoiceField(choices=ContentReport.Reason.choices)
    details = serializers.CharField(required=False, allow_blank=True, max_length=1000)

    def validate(self, attrs):
        user = self.context["user"]
        if attrs["reason"] == ContentReport.Reason.OTHER and not attrs.get("details", "").strip():
            raise serializers.ValidationError({"details": ["Required when the reason is 'other'."]})
        if attrs["target_type"] == "club":
            club = Club.objects.filter(slug=attrs["target"]).first()
            if club is None:
                raise serializers.ValidationError({"target": ["Club not found."]})
            event, owner_id = None, club.operator_id
        else:
            try:
                event_id = uuid.UUID(attrs["target"])
            except ValueError:
                raise serializers.ValidationError({"target": ["Event not found."]})
            event = Event.objects.select_related("club").filter(
                pk=event_id, status__in=(Event.Status.PUBLISHED, Event.Status.CANCELLED)).first()
            if event is None:
                raise serializers.ValidationError({"target": ["Event not found."]})
            club, owner_id = None, event.club.operator_id
        if owner_id == user.id:
            raise serializers.ValidationError({"target": ["You cannot report your own club or its events."]})
        attrs["club"], attrs["event"] = club, event
        return attrs