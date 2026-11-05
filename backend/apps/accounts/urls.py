from django.urls import path

from .views import ClubRegisterView, StudentRegisterView, LoginView, MeView, DepartmentListView, InterestListView, MyInterestsView
from rest_framework_simplejwt.views import TokenRefreshView

app_name = "accounts"

urlpatterns = [
    path("register/student/", StudentRegisterView.as_view(), name="register-student"),
    path("register/club/", ClubRegisterView.as_view(), name="register-club"),
    path("login/", LoginView.as_view(), name="login"),
    path("refresh/", TokenRefreshView.as_view(), name="token-refresh"),
    path("me/", MeView.as_view(), name="me"),
    path("departments/", DepartmentListView.as_view(), name="departments"),
    path("interests/", InterestListView.as_view(), name="interest-list"),
    path("me/interests/", MyInterestsView.as_view(), name="my-interests"),
]