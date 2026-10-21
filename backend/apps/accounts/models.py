import uuid

from django.contrib.auth.base_user import AbstractBaseUser, BaseUserManager
from django.contrib.auth.models import PermissionsMixin
from django.core.validators import MinValueValidator
from django.db import models
from django.utils import timezone

from .constants import DEPARTMENT_CHOICES


class UserManager(BaseUserManager):
    use_in_migrations = True

    def create_user(self, email, password=None, **extra):
        if not email:
            raise ValueError("Email is required")
        user = self.model(email=self.normalize_email(email).lower(), **extra)
        user.set_password(password)
        user.save(using=self._db)
        return user

    def create_superuser(self, email, password=None, **extra):
        extra.setdefault("is_staff", True)
        extra.setdefault("is_superuser", True)
        return self.create_user(email, password, **extra)


class User(AbstractBaseUser, PermissionsMixin):
    """Roles: Student, Club Operator. is_staff = developer access to /admin/ only."""

    class Role(models.TextChoices):
        STUDENT = "student", "Student"
        CLUB_OPERATOR = "club_operator", "Club Operator"

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    email = models.EmailField(unique=True)
    role = models.CharField(max_length=20, choices=Role.choices, default=Role.STUDENT)
    is_active = models.BooleanField(default=True)
    is_staff = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    USERNAME_FIELD = "email"
    REQUIRED_FIELDS = []
    objects = UserManager()

    def __str__(self):
        return self.email


class ValidStudentRecord(models.Model):
    """Imported reference data. Never exposed through the API."""

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    student_id = models.CharField(max_length=30, unique=True)
    full_name = models.CharField(max_length=150)
    email = models.EmailField(db_index=True)
    is_active = models.BooleanField(default=True)

    def save(self, *args, **kwargs):
        self.student_id = self.student_id.strip().upper()
        self.email = self.email.strip().lower()
        super().save(*args, **kwargs)

    def __str__(self):
        return f"{self.student_id} - {self.full_name}"


class Interest(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    name = models.CharField(max_length=100, unique=True)

    def __str__(self):
        return self.name


class StudentProfile(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    user = models.OneToOneField(User, on_delete=models.CASCADE, related_name="student_profile")
    jnu_student_id = models.CharField(max_length=30, unique=True)
    full_name = models.CharField(max_length=150)
    department = models.CharField(max_length=100, choices=DEPARTMENT_CHOICES)
    batch = models.PositiveSmallIntegerField(validators=[MinValueValidator(1)])
    interests = models.ManyToManyField(Interest, blank=True, related_name="students")
    verified_at = models.DateTimeField(default=timezone.now)

    def __str__(self):
        return f"{self.jnu_student_id} - {self.full_name}"