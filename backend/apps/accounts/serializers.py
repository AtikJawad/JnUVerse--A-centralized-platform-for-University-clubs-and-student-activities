from django.contrib.auth.password_validation import validate_password
from django.core.exceptions import ValidationError as DjangoValidationError
from django.db import IntegrityError
from rest_framework import serializers

from .models import StudentRecord, User
from django.db import transaction
from apps.clubs.models import Club


class UserSerializer(serializers.ModelSerializer):
    name = serializers.CharField(source="first_name", read_only=True)

    class Meta:
        model = User
        fields = ["id", "email", "student_id", "name", "role"]


class StudentRegistrationSerializer(serializers.Serializer):
    student_id = serializers.CharField(max_length=30)
    email = serializers.EmailField()
    password = serializers.CharField(write_only=True)
    password_confirm = serializers.CharField(write_only=True)

    def validate(self, attrs):
        sid = attrs["student_id"].strip().upper()
        email = attrs["email"].strip().lower()
        record = StudentRecord.objects.filter(student_id=sid, email=email).first()
        if record is None:
            raise serializers.ValidationError(
                "Student ID and email do not match a valid JnU student record."
            )
        if User.objects.filter(student_id=sid).exists() or User.objects.filter(email=email).exists():
            raise serializers.ValidationError("An account already exists for this student.")
        if attrs["password"] != attrs["password_confirm"]:
            raise serializers.ValidationError({"password_confirm": ["Passwords do not match."]})
        try:
            validate_password(attrs["password"])
        except DjangoValidationError as e:
            raise serializers.ValidationError({"password": list(e.messages)})
        attrs["record"] = record
        return attrs

    def create(self, validated_data):
        record = validated_data["record"]
        try:
            return User.objects.create_user(
                email=record.email,
                password=validated_data["password"],
                student_id=record.student_id,
                first_name=record.name,
                role=User.Role.STUDENT,
            )
        except IntegrityError:
            raise serializers.ValidationError("An account already exists for this student.")

class ClubSerializer(serializers.ModelSerializer):
    class Meta:
        model = Club
        fields = ["id", "name", "description", "is_verified"]


class ClubRegistrationSerializer(serializers.Serializer):
    club_name = serializers.CharField(max_length=150)
    description = serializers.CharField(required=False, allow_blank=True, default="")
    email = serializers.EmailField()
    password = serializers.CharField(write_only=True)
    password_confirm = serializers.CharField(write_only=True)

    def validate(self, attrs):
        attrs["email"] = attrs["email"].strip().lower()
        attrs["club_name"] = attrs["club_name"].strip()
        if User.objects.filter(email=attrs["email"]).exists():
            raise serializers.ValidationError({"email": ["An account with this email already exists."]})
        if Club.objects.filter(name__iexact=attrs["club_name"]).exists():
            raise serializers.ValidationError({"club_name": ["A club with this name already exists."]})
        if attrs["password"] != attrs["password_confirm"]:
            raise serializers.ValidationError({"password_confirm": ["Passwords do not match."]})
        try:
            validate_password(attrs["password"])
        except DjangoValidationError as e:
            raise serializers.ValidationError({"password": list(e.messages)})
        return attrs

    def create(self, validated_data):
        try:
            with transaction.atomic():
                user = User.objects.create_user(
                    email=validated_data["email"],
                    password=validated_data["password"],
                    first_name=validated_data["club_name"],
                    role=User.Role.CLUB_OPERATOR,
                )
                return Club.objects.create(
                    name=validated_data["club_name"],
                    description=validated_data["description"],
                    operator=user,
                )
        except IntegrityError:
            raise serializers.ValidationError("Could not create the club account. Please try again.")
         
class LoginSerializer(serializers.Serializer):
    identifier = serializers.CharField()  # email or student ID
    password = serializers.CharField(write_only=True)

    def validate(self, attrs):
        ident = attrs["identifier"].strip()
        user = (
            User.objects.filter(email=ident.lower()).first()
            or User.objects.filter(student_id=ident.upper()).first()
        )
        if user is None or not user.is_active or not user.check_password(attrs["password"]):
            raise serializers.ValidationError("Invalid credentials.")
        attrs["user"] = user
        return attrs               