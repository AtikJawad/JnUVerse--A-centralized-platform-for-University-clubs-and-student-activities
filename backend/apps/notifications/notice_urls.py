from django.urls import path

from .views import NoticeDetailView, NoticeListCreateView

urlpatterns = [
    path("", NoticeListCreateView.as_view(), name="notice-list"),
    path("<uuid:pk>/", NoticeDetailView.as_view(), name="notice-detail"),
]