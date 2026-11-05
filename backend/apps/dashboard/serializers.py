from rest_framework import serializers

from apps.clubs.serializers import ClubPublicSerializer
from apps.events.serializers import ClubMiniSerializer, EventSerializer


class StudentCountsSerializer(serializers.Serializer):
    clubs_followed = serializers.IntegerField()
    clubs_joined = serializers.IntegerField()
    pending_membership_requests = serializers.IntegerField()
    unread_notifications = serializers.IntegerField()
    events_registered_upcoming = serializers.IntegerField()
    events_to_rate = serializers.IntegerField()


class StudentDashboardSerializer(serializers.Serializer):
    has_interests = serializers.BooleanField()
    counts = StudentCountsSerializer()
    next_events = EventSerializer(many=True)
    rating_prompts = EventSerializer(many=True)
    suggested_clubs = ClubPublicSerializer(many=True)


class ClubCountsSerializer(serializers.Serializer):
    followers = serializers.IntegerField()
    members = serializers.IntegerField()
    pending_membership_requests = serializers.IntegerField()
    upcoming_events = serializers.IntegerField()
    draft_events = serializers.IntegerField()
    pending_collaboration_requests = serializers.IntegerField()
    unread_notifications = serializers.IntegerField()


class ClubRatingsSerializer(serializers.Serializer):
    average = serializers.FloatField(allow_null=True)
    count = serializers.IntegerField()


class ClubDashboardSerializer(serializers.Serializer):
    club = ClubMiniSerializer()
    counts = ClubCountsSerializer()
    ratings = ClubRatingsSerializer()
    next_events = EventSerializer(many=True)
    recent_events = EventSerializer(many=True)
    registrations_last_7_days = serializers.IntegerField()