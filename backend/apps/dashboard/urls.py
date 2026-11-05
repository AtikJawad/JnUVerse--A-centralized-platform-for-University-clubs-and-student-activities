from django.urls import path

from .views import ClubDashboardView, StudentDashboardView

urlpatterns = [
    path("student/", StudentDashboardView.as_view(), name="dashboard-student"),
    path("club/", ClubDashboardView.as_view(), name="dashboard-club"),
]