from django.utils import timezone
from rest_framework import serializers

from apps.clubs.models import Club

from .models import Event, EventRegistration


class ClubMiniSerializer(serializers.ModelSerializer):
    class Meta:
        model = Club
        fields = ["id", "name", "slug"]


class EventSerializer(serializers.ModelSerializer):
    club = ClubMiniSerializer(read_only=True)
    registered_count = serializers.IntegerField(read_only=True)
    remaining_capacity = serializers.SerializerMethodField()
    is_completed = serializers.BooleanField(read_only=True)
    is_registered = serializers.BooleanField(read_only=True, allow_null=True)

    class Meta:
        model = Event
        fields = ["id", "club", "title", "description", "venue", "starts_at", "ends_at", "capacity",
                  "registered_count", "remaining_capacity", "status", "is_completed", "is_registered",
                  "created_at"]

    def get_remaining_capacity(self, obj) -> int | None:
        if obj.capacity is None:
            return None
        return max(obj.capacity - obj.registered_count, 0)


class EventWriteSerializer(serializers.ModelSerializer):
    capacity = serializers.IntegerField(min_value=1, required=False, allow_null=True)

    class Meta:
        model = Event
        fields = ["title", "description", "venue", "starts_at", "ends_at", "capacity"]

    def validate(self, attrs):
        inst = self.instance
        errors = {}
        new_start = attrs.get("starts_at")
        if new_start is not None and (inst is None or new_start != inst.starts_at):
            if new_start <= timezone.now():
                errors["starts_at"] = ["Start time must be in the future."]
        starts = new_start or (inst.starts_at if inst else None)
        ends = attrs.get("ends_at") or (inst.ends_at if inst else None)
        if starts and ends and ends <= starts:
            errors["ends_at"] = ["End time must be after the start time."]
        cap = attrs.get("capacity")
        if inst is not None and cap is not None:
            registered = getattr(inst, "registered_count", 0)
            if cap < registered:
                errors["capacity"] = [
                    f"Capacity cannot be lower than the current number of registrations ({registered})."]
        if errors:
            raise serializers.ValidationError(errors)
        return attrs

class RegistrationSerializer(serializers.ModelSerializer):
    student_id = serializers.CharField(source="student.jnu_student_id", read_only=True)
    name = serializers.CharField(source="student.full_name", read_only=True)
    department = serializers.CharField(source="student.department", read_only=True)
    batch = serializers.IntegerField(source="student.batch", read_only=True)

    class Meta:
        model = EventRegistration
        fields = ["id", "student_id", "name", "department", "batch", "status", "registered_at"]