from django.urls import path

from .views import ClubPartnersView

urlpatterns = [
    path("<slug:slug>/partners/", ClubPartnersView.as_view(), name="club-partners"),
]