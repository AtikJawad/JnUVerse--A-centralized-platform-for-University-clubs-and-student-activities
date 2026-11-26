from django.urls import path

from .views import (
    ClubComparisonView, DepartmentParticipationView, MyClubReportView, PostEventRatingView,
    StudentActivityView,
)

app_name = "analytics"

urlpatterns = [
    path("events/<uuid:pk>/department-participation/", DepartmentParticipationView.as_view(),
         name="department-participation"),
    path("events/<uuid:pk>/ratings/", PostEventRatingView.as_view(), name="post-event-ratings"),
    path("club-comparison/", ClubComparisonView.as_view(), name="club-comparison"),
    path("student-activity/", StudentActivityView.as_view(), name="student-activity"),
    path("my-club/", MyClubReportView.as_view(), name="my-club"),
]
