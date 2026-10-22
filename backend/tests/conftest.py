import pytest
from rest_framework.test import APIClient

from apps.accounts.models import ValidStudentRecord
from tests.helpers import PASSWORD, make_club, make_student


@pytest.fixture
def api():
    return APIClient()


@pytest.fixture
def records(db):
    ValidStudentRecord.objects.create(student_id="B220305043", full_name="Atik Jawad", email="atikjawad@gmail.com")
    ValidStudentRecord.objects.create(student_id="B220305044", full_name="Tahmida Aziza", email="tahmida@gmail.com")


@pytest.fixture
def student(db):
    return make_student()


@pytest.fixture
def club(db):
    return make_club()


@pytest.fixture
def login(api):
    def _login(identifier, password=PASSWORD):
        return api.post("/api/auth/login/", {"identifier": identifier, "password": password}, format="json")
    return _login