from types import SimpleNamespace

import pytest
from django.contrib.auth.models import AnonymousUser

from apps.accounts.permissions import IsClubOperator, IsStudent

pytestmark = pytest.mark.django_db


@pytest.mark.parametrize("ident", ["B220305050", "b220305050", "S1@Example.com"])
def test_student_login_by_id_or_email(login, student, ident):
    r = login(ident)
    assert r.status_code == 200 and {"access", "refresh"} <= set(r.data)
    assert r.data["user"]["role"] == "student"


def test_login_failures(api, login, student):
    for r in (login("B220305050", "wrong-password"), login("nobody@example.com")):
        assert r.status_code == 400 and r.data["non_field_errors"] == ["Invalid credentials."]
    student.user.is_active = False
    student.user.save()
    assert login("B220305050").status_code == 400


def test_me_requires_token(api):
    assert api.get("/api/auth/me/").status_code == 401


def test_me_for_student_and_club(api, login, student, club):
    api.credentials(HTTP_AUTHORIZATION=f"Bearer {login('B220305050').data['access']}")
    me = api.get("/api/auth/me/")
    assert me.status_code == 200 and me.data["department"] and "club" not in me.data
    api.credentials(HTTP_AUTHORIZATION=f"Bearer {login('op@example.com').data['access']}")
    me = api.get("/api/auth/me/")
    assert me.data["role"] == "club_operator" and me.data["club"]["name"] == "Test Club"


def test_refresh(api, login, student):
    refresh = login("B220305050").data["refresh"]
    ok = api.post("/api/auth/refresh/", {"refresh": refresh}, format="json")
    assert ok.status_code == 200 and "access" in ok.data
    assert api.post("/api/auth/refresh/", {"refresh": "garbage"}, format="json").status_code == 401


def test_departments_public(api):
    r = api.get("/api/auth/departments/")
    assert r.status_code == 200 and len(r.data["departments"]) == 38 and "Law" in r.data["departments"]


def test_role_permissions(student, club):
    s, c, anon = SimpleNamespace(user=student.user), SimpleNamespace(user=club.operator), SimpleNamespace(user=AnonymousUser())
    assert IsStudent().has_permission(s, None) and not IsStudent().has_permission(c, None)
    assert IsClubOperator().has_permission(c, None) and not IsClubOperator().has_permission(s, None)
    assert not IsStudent().has_permission(anon, None) and not IsClubOperator().has_permission(anon, None)