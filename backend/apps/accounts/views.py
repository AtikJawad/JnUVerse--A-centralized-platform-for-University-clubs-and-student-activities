from rest_framework import status
from rest_framework.permissions import AllowAny
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework.permissions import IsAuthenticated
from rest_framework_simplejwt.tokens import RefreshToken

from drf_spectacular.utils import extend_schema, inline_serializer
from rest_framework import serializers

from .serializers import ClubRegistrationSerializer, ClubSerializer, StudentRegistrationSerializer, UserSerializer, LoginSerializer, InterestIdsSerializer, InterestListSerializer
from .constants import DEPARTMENTS
from .models import Interest
from .permissions import IsStudent

class StudentRegisterView(APIView):
    authentication_classes = []
    permission_classes = [AllowAny]

    @extend_schema(request=StudentRegistrationSerializer, responses={201: UserSerializer})

    def post(self, request):
        serializer = StudentRegistrationSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        user = serializer.save()
        return Response(UserSerializer(user).data, status=status.HTTP_201_CREATED)

class ClubRegisterView(APIView):
    authentication_classes = []
    permission_classes = [AllowAny]

    @extend_schema(
        request=ClubRegistrationSerializer,
        responses={201: inline_serializer("ClubRegistrationResponse", {
            "user": UserSerializer(), "club": ClubSerializer()})},
    )

    def post(self, request):
        serializer = ClubRegistrationSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        club = serializer.save()
        return Response(
            {"user": UserSerializer(club.operator).data, "club": ClubSerializer(club).data},
            status=status.HTTP_201_CREATED,
        )

class LoginView(APIView):
    authentication_classes = []
    permission_classes = [AllowAny]

    @extend_schema(
        request=LoginSerializer,
        responses=inline_serializer("LoginResponse", {
            "access": serializers.CharField(), "refresh": serializers.CharField(),
            "user": UserSerializer()}),
    )

    def post(self, request):
        serializer = LoginSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        user = serializer.validated_data["user"]
        refresh = RefreshToken.for_user(user)
        refresh["role"] = user.role
        return Response({
            "access": str(refresh.access_token),
            "refresh": str(refresh),
            "user": UserSerializer(user).data,
        })


class MeView(APIView):
    permission_classes = [IsAuthenticated]

    @extend_schema(responses=inline_serializer("MeResponse", {
        "id": serializers.UUIDField(), "email": serializers.EmailField(),
        "student_id": serializers.CharField(allow_null=True), "name": serializers.CharField(),
        "department": serializers.CharField(allow_null=True),
        "batch": serializers.IntegerField(allow_null=True),
        "role": serializers.CharField(), "club": ClubSerializer(required=False)}))
    
    def get(self, request):
        data = UserSerializer(request.user).data
        if hasattr(request.user, "club"):
            data["club"] = ClubSerializer(request.user.club).data
        return Response(data)


class DepartmentListView(APIView):
    authentication_classes = []
    permission_classes = [AllowAny]

    @extend_schema(responses=inline_serializer("DepartmentList", {
        "departments": serializers.ListField(child=serializers.CharField())}))
    def get(self, request):
        return Response({"departments": DEPARTMENTS})

class InterestListView(APIView):
    """Public: the fixed list of interests to choose from."""

    permission_classes = [AllowAny]

    @extend_schema(responses=InterestListSerializer)
    def get(self, request):
        return Response(InterestListSerializer({"interests": Interest.objects.order_by("name")}).data)


class MyInterestsView(APIView):
    """A student's own interests: read, or replace the whole selection."""

    permission_classes = [IsStudent]

    @staticmethod
    def _out(profile):
        return InterestListSerializer({"interests": profile.interests.order_by("name")}).data

    @extend_schema(responses=InterestListSerializer)
    def get(self, request):
        return Response(self._out(request.user.student_profile))

    @extend_schema(request=InterestIdsSerializer, responses=InterestListSerializer)
    def put(self, request):
        serializer = InterestIdsSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        profile = request.user.student_profile
        profile.interests.set(serializer.validated_data["interests"])
        return Response(self._out(profile))