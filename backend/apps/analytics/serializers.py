from rest_framework import serializers


class PeriodSerializer(serializers.Serializer):
    """Query parameters shared by the period-based reports."""

    date_from = serializers.DateField(required=False)
    date_to = serializers.DateField(required=False)

    def validate(self, attrs):
        if attrs.get("date_from") and attrs.get("date_to") and attrs["date_from"] > attrs["date_to"]:
            raise serializers.ValidationError({"date_to": ["date_to must not be before date_from."]})
        return attrs


class EventRefSerializer(serializers.Serializer):
    id = serializers.UUIDField()
    title = serializers.CharField()
    starts_at = serializers.DateTimeField()
    ends_at = serializers.DateTimeField()
    club = serializers.CharField()


class DepartmentRowSerializer(serializers.Serializer):
    department = serializers.CharField()
    registered = serializers.IntegerField()
    attended = serializers.IntegerField()
    attendance_rate = serializers.FloatField(allow_null=True)
    share_of_attended = serializers.FloatField(allow_null=True)


class DepartmentParticipationSerializer(serializers.Serializer):
    event = EventRefSerializer()
    totals = serializers.DictField(child=serializers.FloatField(allow_null=True))
    departments = DepartmentRowSerializer(many=True)


class RatingBucketSerializer(serializers.Serializer):
    rating = serializers.IntegerField()
    count = serializers.IntegerField()
    percent = serializers.FloatField(allow_null=True)


class PostEventRatingSerializer(serializers.Serializer):
    event = EventRefSerializer()
    total_ratings = serializers.IntegerField()
    average = serializers.FloatField(allow_null=True)
    attended = serializers.IntegerField()
    response_rate = serializers.FloatField(allow_null=True)
    distribution = RatingBucketSerializer(many=True)


class ClubComparisonRowSerializer(serializers.Serializer):
    club = serializers.DictField(child=serializers.CharField())
    is_mine = serializers.BooleanField()
    events_launched = serializers.IntegerField()
    cancelled_events = serializers.IntegerField()
    completed_events = serializers.IntegerField()
    registrations = serializers.IntegerField()
    registration_rate = serializers.FloatField(allow_null=True)
    attended = serializers.IntegerField()
    attendance_rate = serializers.FloatField(allow_null=True)
    average_rating = serializers.FloatField(allow_null=True)
    rating_count = serializers.IntegerField()


class ClubComparisonSerializer(serializers.Serializer):
    period = serializers.DictField(child=serializers.DateField(allow_null=True))
    clubs = ClubComparisonRowSerializer(many=True)


class StudentActivitySerializer(serializers.Serializer):
    clubs_joined = serializers.IntegerField()
    clubs_followed = serializers.IntegerField()
    events_registered = serializers.IntegerField()
    events_attended = serializers.IntegerField()
    attendance_rate = serializers.FloatField(allow_null=True)
    ratings_given = serializers.IntegerField()
    activity_score = serializers.IntegerField()


class OwnEventRowSerializer(serializers.Serializer):
    id = serializers.UUIDField()
    title = serializers.CharField()
    starts_at = serializers.DateTimeField()
    status = serializers.CharField()
    is_completed = serializers.BooleanField()
    capacity = serializers.IntegerField(allow_null=True)
    registered = serializers.IntegerField()
    fill_rate = serializers.FloatField(allow_null=True)
    attended = serializers.IntegerField()
    attendance_rate = serializers.FloatField(allow_null=True)
    average_rating = serializers.FloatField(allow_null=True)
    rating_count = serializers.IntegerField()


class MonthRowSerializer(serializers.Serializer):
    month = serializers.CharField()
    events_launched = serializers.IntegerField()
    registrations = serializers.IntegerField()
    attended = serializers.IntegerField()
    average_rating = serializers.FloatField(allow_null=True)


class ClubOwnReportSerializer(serializers.Serializer):
    club = serializers.DictField(child=serializers.CharField())
    period = serializers.DictField(child=serializers.DateField(allow_null=True))
    summary = serializers.DictField(child=serializers.FloatField(allow_null=True))
    monthly = MonthRowSerializer(many=True)
    events = OwnEventRowSerializer(many=True)
    best_rated_event = serializers.DictField(allow_null=True)
