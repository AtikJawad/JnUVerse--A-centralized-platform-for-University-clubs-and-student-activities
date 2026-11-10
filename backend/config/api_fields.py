from drf_spectacular.types import OpenApiTypes
from drf_spectacular.utils import extend_schema_field
from rest_framework import serializers


@extend_schema_field(OpenApiTypes.BINARY)
class UploadImageField(serializers.ImageField):
    """Documented as a binary file upload in Swagger (shows a file picker)."""