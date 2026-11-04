from django.urls import path

from .views import EventRatingSummaryView, EventRatingView

urlpatterns = [
    path("<uuid:pk>/rating/", EventRatingView.as_view(), name="event-rating"),
    path("<uuid:pk>/rating-summary/", EventRatingSummaryView.as_view(), name="event-rating-summary"),
]