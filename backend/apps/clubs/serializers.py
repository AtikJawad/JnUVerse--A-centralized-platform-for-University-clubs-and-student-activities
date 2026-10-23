from rest_framework import serializers

from .models import Club, ClubMembership


class ClubPublicSerializer(serializers.ModelSerializer):
    is_verified = serializers.SerializerMethodField()
    follower_count = serializers.IntegerField(read_only=True)
    member_count = serializers.IntegerField(read_only=True)
    is_following = serializers.BooleanField(read_only=True, allow_null=True)
    my_membership = serializers.CharField(read_only=True, allow_null=True)

    class Meta:
        model = Club
        fields = ["id", "name", "slug", "description", "logo", "contact_email",
                  "is_verified", "follower_count", "member_count", "is_following", "my_membership", "created_at"]

    def get_is_verified(self, obj) -> bool:
        return True  # verified on account creation


class ClubUpdateSerializer(serializers.ModelSerializer):
    class Meta:
        model = Club
        fields = ["description", "logo", "contact_email"]

class MembershipSerializer(serializers.ModelSerializer):
    student_id = serializers.CharField(source="student.jnu_student_id", read_only=True)
    name = serializers.CharField(source="student.full_name", read_only=True)
    department = serializers.CharField(source="student.department", read_only=True)
    batch = serializers.IntegerField(source="student.batch", read_only=True)

    class Meta:
        model = ClubMembership
        fields = ["id", "student_id", "name", "department", "batch",
                  "status", "requested_at", "reviewed_at"]