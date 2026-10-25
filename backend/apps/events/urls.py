from django.urls import path

from .views import (
    EventCancelView, EventDetailView, EventListCreateView, EventPublishView,
    EventRegisterView, EventRegistrationListView,
)
app_name = "events"

urlpatterns = [
    path("", EventListCreateView.as_view(), name="event-list"),
    path("<uuid:pk>/", EventDetailView.as_view(), name="event-detail"),
    path("<uuid:pk>/publish/", EventPublishView.as_view(), name="event-publish"),
    path("<uuid:pk>/cancel/", EventCancelView.as_view(), name="event-cancel"),
    path("<uuid:pk>/register/", EventRegisterView.as_view(), name="event-register"),
    path("<uuid:pk>/registrations/", EventRegistrationListView.as_view(), name="event-registrations"),
]