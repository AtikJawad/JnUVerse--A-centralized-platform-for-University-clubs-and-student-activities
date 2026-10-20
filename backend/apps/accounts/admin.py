# Admin registrations for the accounts app will be added as models are implemented.
from django.contrib import admin
from .models import StudentRecord, User

admin.site.register(User)
admin.site.register(StudentRecord)

