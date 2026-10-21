from django.contrib.auth.password_validation import validate_password
from django.core.exceptions import ValidationError as DjangoValidationError
from django.db import IntegrityError, transaction
from rest_framework import serializers

from apps.clubs.models import Club

from .constants import DEPARTMENTS
from .models import StudentProfile, User, ValidStudentRecord


def _check_passwords(attrs):
    if attrs["password"] != attrs["password_confirm"]:
        raise serializers.ValidationError({"password_confirm": ["Passwords do not match."]})
    try:
        validate_password(attrs["password"])
    except DjangoValidationError as e:
        raise serializers.ValidationError({"password": list(e.messages)})


class UserSerializer(serializers.ModelSerializer):
    student_id = serializers.SerializerMethodField()
    name = serializers.SerializerMethodField()
    department = serializers.SerializerMethodField()
    batch = serializers.SerializerMethodField()

    class Meta:
        model = User
        fields = ["id", "email", "student_id", "name", "department", "batch", "role"]

    def get_student_id(self, obj) -> str | None:
        p = getattr(obj, "student_profile", None)
        return p.jnu_student_id if p else None

    def get_name(self, obj) -> str:
        p = getattr(obj, "student_profile", None)
        if p:
            return p.full_name
        c = getattr(obj, "club", None)
        return c.name if c else ""

    def get_department(self, obj) -> str | None:
        p = getattr(obj, "student_profile", None)
        return p.department if p else None

    def get_batch(self, obj) -> int | None:
        p = getattr(obj, "student_profile", None)
        return p.batch if p else None


class ClubSerializer(serializers.ModelSerializer):
    is_verified = serializers.SerializerMethodField()

    class Meta:
        model = Club
        fields = ["id", "name", "slug", "description", "logo", "contact_email", "is_verified"]

    def get_is_verified(self, obj) -> bool:
        return True  # verified on account creation


class StudentRegistrationSerializer(serializers.Serializer):
    student_id = serializers.CharField(max_length=30)
    email = serializers.EmailField()
    department = serializers.ChoiceField(choices=DEPARTMENTS)
    batch = serializers.IntegerField(min_value=1)
    password = serializers.CharField(write_only=True)
    password_confirm = serializers.CharField(write_only=True)

    def validate(self, attrs):
        sid = attrs["student_id"].strip().upper()
        email = attrs["email"].strip().lower()
        record = ValidStudentRecord.objects.filter(
            student_id=sid, email=email, is_active=True
        ).first()
        if record is None:
            raise serializers.ValidationError(
                "Student ID and email do not match a valid JnU student record."
            )
        if StudentProfile.objects.filter(jnu_student_id=sid).exists() or \
                User.objects.filter(email=email).exists():
            raise serializers.ValidationError("An account already exists for this student.")
        _check_passwords(attrs)
        attrs["record"] = record
        return attrs

    def create(self, validated_data):
        record = validated_data["record"]
        try:
            with transaction.atomic():
                user = User.objects.create_user(
                    email=record.email,
                    password=validated_data["password"],
                    role=User.Role.STUDENT,
                )
                StudentProfile.objects.create(
                    user=user,
                    jnu_student_id=record.student_id,
                    full_name=record.full_name,
                    department=validated_data["department"],
                    batch=validated_data["batch"],
                )
                return user
        except IntegrityError:
            raise serializers.ValidationError("An account already exists for this student.")


class ClubRegistrationSerializer(serializers.Serializer):
    club_name = serializers.CharField(max_length=150)
    description = serializers.CharField(required=False, allow_blank=True, default="")
    contact_email = serializers.EmailField(required=False, allow_blank=True, default="")
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
        _check_passwords(attrs)
        return attrs

    def create(self, validated_data):
        try:
            with transaction.atomic():
                user = User.objects.create_user(
                    email=validated_data["email"],
                    password=validated_data["password"],
                    role=User.Role.CLUB_OPERATOR,
                )
                return Club.objects.create(
                    operator=user,
                    name=validated_data["club_name"],
                    description=validated_data["description"],
                    contact_email=validated_data["contact_email"],
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
            or User.objects.filter(student_profile__jnu_student_id=ident.upper()).first()
        )
        if user is None or not user.is_active or not user.check_password(attrs["password"]):
            raise serializers.ValidationError("Invalid credentials.")
        attrs["user"] = user
        return attrs