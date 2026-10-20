from django.contrib.auth.models import AbstractUser, BaseUserManager
from django.db import models


class UserManager(BaseUserManager):
    use_in_migrations = True

    def create_user(self, email, password=None, **extra):
        if not email:
            raise ValueError("Email is required")
        user = self.model(email=self.normalize_email(email), **extra)
        user.set_password(password)
        user.save(using=self._db)
        return user

    def create_superuser(self, email, password=None, **extra):
        extra.setdefault("is_staff", True)
        extra.setdefault("is_superuser", True)
        return self.create_user(email, password, **extra)


class User(AbstractUser):
    """JnUVerse user. Roles: Student, Club Operator (no admin role)."""

    class Role(models.TextChoices):
        STUDENT = "student", "Student"
        CLUB_OPERATOR = "club_operator", "Club Operator"

    username = None
    email = models.EmailField(unique=True)
    student_id = models.CharField(max_length=30, unique=True, null=True, blank=True)
    role = models.CharField(max_length=20, choices=Role.choices, default=Role.STUDENT)

    USERNAME_FIELD = "email"
    REQUIRED_FIELDS = []
    objects = UserManager()

    def __str__(self):
        return self.email

class StudentRecord(models.Model):
    """Valid JnU student records imported by the team. Used to verify registration."""

    student_id = models.CharField(max_length=30, unique=True)
    name = models.CharField(max_length=150)
    email = models.EmailField(unique=True)

    def save(self, *args, **kwargs):
        self.student_id = self.student_id.strip().upper()
        self.email = self.email.strip().lower()
        super().save(*args, **kwargs)

    def __str__(self):
        return f"{self.student_id} - {self.name}"