from django.contrib import admin

from .models import ContentReport


@admin.register(ContentReport)
class ContentReportAdmin(admin.ModelAdmin):
    list_display = ("created_at", "reason", "status", "club", "event", "reporter")
    list_filter = ("status", "reason")
    list_editable = ("status",)