from rest_framework import serializers

from apps.accounts.constants import DEPARTMENT_CHOICES
from apps.events.serializers import ClubMiniSerializer

from .models import Notice, Notification


class NoticeSerializer(serializers.ModelSerializer):
    club = ClubMiniSerializer(read_only=True)
    department = serializers.SerializerMethodField()

    class Meta:
        model = Notice
        fields = ["id", "club", "title", "body", "audience", "department", "created_at", "updated_at"]
        read_only_fields = fields

    def get_department(self, obj) -> str | None:
        return obj.target_department or None


class NoticeCreateSerializer(serializers.Serializer):
    title = serializers.CharField(max_length=200)
    body = serializers.CharField()
    audience = serializers.ChoiceField(choices=Notice.Audience.choices)
    department = serializers.ChoiceField(choices=DEPARTMENT_CHOICES, required=False, allow_null=True, allow_blank=True)

    def validate(self, attrs):
        dept = attrs.get("department") or ""
        is_dept = attrs["audience"] == Notice.Audience.DEPARTMENT
        if is_dept and not dept:
            raise serializers.ValidationError({"department": ["Required when audience is 'department'."]})
        if not is_dept and dept:
            raise serializers.ValidationError({"department": ["Only allowed when audience is 'department'."]})
        attrs["department"] = dept
        return attrs

    def create(self, validated_data):
        dept = validated_data.pop("department")
        return Notice.objects.create(target_department=dept, **validated_data)


class NoticeUpdateSerializer(serializers.ModelSerializer):
    class Meta:
        model = Notice
        fields = ["title", "body"]

class NotificationSerializer(serializers.ModelSerializer):
    notice = serializers.UUIDField(source="notice_id", read_only=True)
    event = serializers.UUIDField(source="event_id", read_only=True)
    is_read = serializers.SerializerMethodField()

    class Meta:
        model = Notification
        fields = ["id", "type", "title", "message", "notice", "event", "is_read", "read_at", "created_at"]
        read_only_fields = fields

    def get_is_read(self, obj) -> bool:
        return obj.read_at is not None