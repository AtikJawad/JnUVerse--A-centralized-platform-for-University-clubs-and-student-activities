from rest_framework.permissions import SAFE_METHODS, BasePermission

from apps.accounts.models import User


class IsEventOwnerOrReadOnly(BasePermission):
    """Anyone can read; only the owning club's operator can change an event."""

    def has_permission(self, request, view):
        if request.method in SAFE_METHODS:
            return True
        u = request.user
        return bool(u and u.is_authenticated and u.role == User.Role.CLUB_OPERATOR)

    def has_object_permission(self, request, view, obj):
        return request.method in SAFE_METHODS or obj.club.operator_id == request.user.id