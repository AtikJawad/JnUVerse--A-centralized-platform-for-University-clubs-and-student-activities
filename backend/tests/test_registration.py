import pytest

from apps.accounts.models import StudentProfile, User, ValidStudentRecord
from apps.clubs.models import Club
from tests.helpers import club_payload, student_payload

S, C = "/api/auth/register/student/", "/api/auth/register/club/"
pytestmark = pytest.mark.django_db


def test_student_registers(api, records):
    r = api.post(S, student_payload(), format="json")
    assert r.status_code == 201
    assert (r.data["student_id"], r.data["name"], r.data["role"], r.data["batch"]) == (
        "B220305043", "Atik Jawad", "student", 22)
    assert "password" not in r.data and "access" not in r.data
    assert StudentProfile.objects.filter(jnu_student_id="B220305043").exists()


def test_student_match_is_case_insensitive(api, records):
    r = api.post(S, student_payload(student_id="b220305043", email="AtikJawad@Gmail.com"), format="json")
    assert r.status_code == 201
    assert User.objects.filter(email="atikjawad@gmail.com").exists()


@pytest.mark.parametrize("over", [
    {"email": "tahmida@gmail.com"},        # ID and email belong to different records
    {"student_id": "B999999999"},          # unknown ID
])
def test_student_not_matching_record_rejected(api, records, over):
    r = api.post(S, student_payload(**over), format="json")
    assert r.status_code == 400
    assert "non_field_errors" in r.data
    assert User.objects.count() == 0


def test_inactive_record_rejected(api, records):
    ValidStudentRecord.objects.filter(student_id="B220305043").update(is_active=False)
    assert api.post(S, student_payload(), format="json").status_code == 400


def test_duplicate_claim_rejected(api, records):
    assert api.post(S, student_payload(), format="json").status_code == 201
    r = api.post(S, student_payload(), format="json")
    assert r.status_code == 400 and "already exists" in str(r.data["non_field_errors"][0])
    assert User.objects.count() == 1


@pytest.mark.parametrize("over,field", [
    ({"department": "Astrology"}, "department"),
    ({"batch": 0}, "batch"),
    ({"password_confirm": "Different-123"}, "password_confirm"),
    ({"password": "12345678", "password_confirm": "12345678"}, "password"),
])
def test_student_field_validation(api, records, over, field):
    r = api.post(S, student_payload(**over), format="json")
    assert r.status_code == 400 and field in r.data


def test_club_registers_verified(api):
    r = api.post(C, club_payload(), format="json")
    assert r.status_code == 201
    assert r.data["user"]["role"] == "club_operator" and r.data["user"]["student_id"] is None
    assert r.data["club"]["is_verified"] is True and r.data["club"]["slug"] == "jnu-research-society"


def test_club_duplicates_rejected(api):
    assert api.post(C, club_payload(), format="json").status_code == 201
    same_name = api.post(C, club_payload(club_name="jnu research society", email="x@example.com"), format="json")
    assert same_name.status_code == 400 and "club_name" in same_name.data
    same_email = api.post(C, club_payload(club_name="Other Club"), format="json")
    assert same_email.status_code == 400 and "email" in same_email.data
    assert Club.objects.count() == 1


def test_club_slug_collision_gets_suffix(api):
    api.post(C, club_payload(club_name="Robotics Club", email="a@example.com"), format="json")
    r = api.post(C, club_payload(club_name="Robotics Club!", email="b@example.com"), format="json")
    assert r.status_code == 201 and r.data["club"]["slug"] == "robotics-club-2"