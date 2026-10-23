from django.urls import path

from .views import (
    ClubDetailView, ClubFollowView, ClubListView, ClubMemberListView, ClubMembershipRequestListView,
    ClubMembershipView, MembershipApproveView, MembershipRejectView, MembershipRemoveView,
)

app_name = "clubs"

urlpatterns = [
    path("", ClubListView.as_view(), name="club-list"),
    path("<slug:slug>/", ClubDetailView.as_view(), name="club-detail"),
    path("<slug:slug>/follow/", ClubFollowView.as_view(), name="club-follow"),
    path("<slug:slug>/membership/", ClubMembershipView.as_view(), name="club-membership"),
    path("<slug:slug>/members/", ClubMemberListView.as_view(), name="club-members"),
    path("<slug:slug>/membership-requests/", ClubMembershipRequestListView.as_view(), name="club-membership-requests"),
    path("<slug:slug>/memberships/<uuid:pk>/", MembershipRemoveView.as_view(), name="membership-remove"),
    path("<slug:slug>/memberships/<uuid:pk>/approve/", MembershipApproveView.as_view(), name="membership-approve"),
    path("<slug:slug>/memberships/<uuid:pk>/reject/", MembershipRejectView.as_view(), name="membership-reject"),
]