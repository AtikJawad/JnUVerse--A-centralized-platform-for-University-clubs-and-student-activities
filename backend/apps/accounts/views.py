from rest_framework import status
from rest_framework.permissions import AllowAny
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework.permissions import IsAuthenticated
from rest_framework_simplejwt.tokens import RefreshToken

from drf_spectacular.utils import extend_schema, inline_serializer
from rest_framework import serializers

from .serializers import ClubRegistrationSerializer, ClubSerializer, StudentRegistrationSerializer, UserSerializer, LoginSerializer
from .constants import DEPARTMENTS

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