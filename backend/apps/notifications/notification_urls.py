from django.urls import path

from .notification_views import NotificationListView, NotificationReadView, ReadAllView, UnreadCountView

urlpatterns = [
    path("", NotificationListView.as_view(), name="notification-list"),
    path("unread-count/", UnreadCountView.as_view(), name="notification-unread-count"),
    path("read-all/", ReadAllView.as_view(), name="notification-read-all"),
    path("<uuid:pk>/read/", NotificationReadView.as_view(), name="notification-read"),
]