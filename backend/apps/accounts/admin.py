from django.contrib import admin

from .models import Interest, StudentProfile, User, ValidStudentRecord

admin.site.register(User)
admin.site.register(ValidStudentRecord)
admin.site.register(StudentProfile)
admin.site.register(Interest)