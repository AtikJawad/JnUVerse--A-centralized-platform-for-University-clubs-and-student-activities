from django.urls import path

from .views import (
    CollaborationAcceptView, CollaborationCancelView, CollaborationDetailView,
    CollaborationListCreateView, CollaborationRejectView,
)

urlpatterns = [
    path("", CollaborationListCreateView.as_view(), name="collaboration-list"),
    path("<uuid:pk>/", CollaborationDetailView.as_view(), name="collaboration-detail"),
    path("<uuid:pk>/accept/", CollaborationAcceptView.as_view(), name="collaboration-accept"),
    path("<uuid:pk>/reject/", CollaborationRejectView.as_view(), name="collaboration-reject"),
    path("<uuid:pk>/cancel/", CollaborationCancelView.as_view(), name="collaboration-cancel"),
]