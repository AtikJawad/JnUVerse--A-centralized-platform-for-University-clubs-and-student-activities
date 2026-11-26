from django.db.models import Count, Q
from django.shortcuts import get_object_or_404
from django.utils import timezone
from drf_spectacular.utils import OpenApiParameter, extend_schema
from rest_framework import status
from rest_framework.exceptions import PermissionDenied
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.accounts.permissions import IsClubOperator, IsStudent
from apps.clubs.models import Club, ClubFollow, ClubMembership
from apps.events.models import Event, EventRegistration
from apps.events.views import event_queryset
from apps.feedback.models import EventRating

from .serializers import (
    ClubComparisonSerializer, ClubOwnReportSerializer, DepartmentParticipationSerializer,
    PeriodSerializer, PostEventRatingSerializer, StudentActivitySerializer,
)
from .services import LAUNCHED, apply_period, avg, event_stats, is_ended, pct

PERIOD_PARAMS = [
    OpenApiParameter("date_from", str, description="YYYY-MM-DD. Only events starting on or after this date."),
    OpenApiParameter("date_to", str, description="YYYY-MM-DD. Only events starting on or before this date."),
]


def read_period(request):
    s = PeriodSerializer(data=request.query_params)
    s.is_valid(raise_exception=True)
    return s.validated_data.get("date_from"), s.validated_data.get("date_to")


def owned_event(request, pk):
    """Visible event (others' drafts are 404) that belongs to the requesting operator (else 403)."""
    visible = get_object_or_404(event_queryset(request.user), pk=pk)
    if visible.club.operator_id != request.user.id:
        raise PermissionDenied("Only this club's operator can view this report.")
    return event_stats(Event.objects.select_related("club")).get(pk=pk)


def event_ref(e):
    return {"id": e.id, "title": e.title, "starts_at": e.starts_at, "ends_at": e.ends_at, "club": e.club.name}


class DepartmentParticipationView(APIView):
    """Report 1: after an event, how many students from each department registered and attended."""

    permission_classes = [IsClubOperator]

    @extend_schema(responses={200: DepartmentParticipationSerializer})
    def get(self, request, pk):
        event = owned_event(request, pk)
        if not is_ended(event):
            return Response({"detail": "This report is available for published events that have ended."},
                            status=status.HTTP_409_CONFLICT)
        rows = (EventRegistration.objects
                .filter(event=event, status=EventRegistration.Status.REGISTERED)
                .values("student__department")
                .annotate(registered=Count("pk"), attended=Count("pk", filter=Q(attended=True))))
        departments = [{
            "department": r["student__department"], "registered": r["registered"], "attended": r["attended"],
            "attendance_rate": pct(r["attended"], r["registered"]),
            "share_of_attended": pct(r["attended"], event.att_n),
        } for r in rows]
        departments.sort(key=lambda d: (-d["attended"], -d["registered"], d["department"]))
        return Response({
            "event": event_ref(event),
            "totals": {"registered": event.reg_n, "attended": event.att_n,
                       "attendance_rate": pct(event.att_n, event.reg_n)},
            "departments": departments,
        })


class PostEventRatingView(APIView):
    """Report 2: how many times each rating (1 to 5) was given for one event."""

    permission_classes = [IsClubOperator]

    @extend_schema(responses={200: PostEventRatingSerializer})
    def get(self, request, pk):
        event = owned_event(request, pk)
        if event.status != Event.Status.PUBLISHED:
            return Response({"detail": "Ratings exist only for published events."}, status=status.HTTP_409_CONFLICT)
        counts = {i: 0 for i in range(1, 6)}
        for row in EventRating.objects.filter(event=event).values("rating").annotate(c=Count("pk")):
            counts[row["rating"]] = row["c"]
        total = sum(counts.values())
        return Response({
            "event": event_ref(event),
            "total_ratings": total,
            "average": avg(event.rate_sum, total),
            "attended": event.att_n,
            "response_rate": pct(total, event.att_n),
            "distribution": [{"rating": r, "count": c, "percent": pct(c, total)} for r, c in counts.items()],
        })


class ClubComparisonView(APIView):
    """Report 3: all clubs side by side (events launched, registration rate, attendance, ratings)."""

    permission_classes = [IsClubOperator]

    @extend_schema(parameters=PERIOD_PARAMS, responses={200: ClubComparisonSerializer})
    def get(self, request):
        date_from, date_to = read_period(request)
        now = timezone.now()
        acc = {c.id: {"club": {"id": str(c.id), "name": c.name, "slug": c.slug},
                      "is_mine": c.operator_id == request.user.id, "events_launched": 0, "cancelled_events": 0,
                      "completed_events": 0, "registrations": 0, "attended": 0, "average_rating": None,
                      "rating_count": 0, "_cap": 0, "_cap_reg": 0, "_ended_reg": 0, "_rate_sum": 0}
               for c in Club.objects.all()}
        events = apply_period(event_stats(Event.objects.filter(status__in=LAUNCHED)), date_from, date_to)
        for e in events:
            a = acc[e.club_id]
            a["events_launched"] += 1
            if e.status == Event.Status.CANCELLED:
                a["cancelled_events"] += 1
                continue  # cancelled events do not count towards registrations, attendance or ratings
            a["registrations"] += e.reg_n
            if e.capacity:
                a["_cap"] += e.capacity
                a["_cap_reg"] += e.reg_n
            if is_ended(e, now):
                a["completed_events"] += 1
                a["attended"] += e.att_n
                a["_ended_reg"] += e.reg_n
            a["rating_count"] += e.rate_n
            a["_rate_sum"] += e.rate_sum
        rows = []
        for a in acc.values():
            a["registration_rate"] = pct(a.pop("_cap_reg"), a.pop("_cap"))
            a["attendance_rate"] = pct(a["attended"], a.pop("_ended_reg"))
            a["average_rating"] = avg(a.pop("_rate_sum"), a["rating_count"])
            rows.append(a)
        rows.sort(key=lambda r: (-r["events_launched"], r["club"]["name"].lower()))
        return Response({"period": {"date_from": date_from, "date_to": date_to}, "clubs": rows})


class StudentActivityView(APIView):
    """Report 4: a student's own activity (memberships, attended events, ratings given)."""

    permission_classes = [IsStudent]

    @extend_schema(responses={200: StudentActivitySerializer})
    def get(self, request):
        profile = request.user.student_profile
        now = timezone.now()
        regs = EventRegistration.objects.filter(student=profile, status=EventRegistration.Status.REGISTERED)
        attended = regs.filter(attended=True).count()
        ended = regs.filter(event__status=Event.Status.PUBLISHED, event__ends_at__lt=now).count()
        joined = ClubMembership.objects.filter(student=profile, status=ClubMembership.Status.APPROVED).count()
        ratings = EventRating.objects.filter(student=profile).count()
        return Response({
            "clubs_joined": joined,
            "clubs_followed": ClubFollow.objects.filter(student=profile).count(),
            "events_registered": regs.count(),
            "events_attended": attended,
            "attendance_rate": pct(attended, ended),
            "ratings_given": ratings,
            "activity_score": joined + attended + ratings,
        })


class MyClubReportView(APIView):
    """Report 5: the operator's own club over time (events, registrations, attendance, ratings)."""

    permission_classes = [IsClubOperator]

    @extend_schema(parameters=PERIOD_PARAMS, responses={200: ClubOwnReportSerializer})
    def get(self, request):
        club = request.user.club
        date_from, date_to = read_period(request)
        now = timezone.now()
        events = list(apply_period(
            event_stats(Event.objects.filter(club=club, status__in=LAUNCHED)), date_from, date_to
        ).order_by("starts_at", "id"))
        rows, months = [], {}
        tot = {"regs": 0, "cap": 0, "cap_reg": 0, "ended_reg": 0, "att": 0, "rate_n": 0, "rate_sum": 0,
               "completed": 0, "cancelled": 0}
        for e in events:
            live = e.status == Event.Status.PUBLISHED
            done = is_ended(e, now)
            m = months.setdefault(timezone.localtime(e.starts_at).strftime("%Y-%m"),
                                  {"events_launched": 0, "registrations": 0, "attended": 0, "rn": 0, "rs": 0})
            m["events_launched"] += 1
            if live:
                m["registrations"] += e.reg_n
                m["attended"] += e.att_n
                m["rn"] += e.rate_n
                m["rs"] += e.rate_sum
                tot["regs"] += e.reg_n
                tot["rate_n"] += e.rate_n
                tot["rate_sum"] += e.rate_sum
                if e.capacity:
                    tot["cap"] += e.capacity
                    tot["cap_reg"] += e.reg_n
                if done:
                    tot["completed"] += 1
                    tot["att"] += e.att_n
                    tot["ended_reg"] += e.reg_n
            else:
                tot["cancelled"] += 1
            rows.append({
                "id": e.id, "title": e.title, "starts_at": e.starts_at, "status": e.status, "is_completed": done,
                "capacity": e.capacity, "registered": e.reg_n, "fill_rate": pct(e.reg_n, e.capacity),
                "attended": e.att_n, "attendance_rate": pct(e.att_n, e.reg_n) if done else None,
                "average_rating": avg(e.rate_sum, e.rate_n), "rating_count": e.rate_n,
            })
        rated = [r for r in rows if r["rating_count"]]
        best = max(rated, key=lambda r: (r["average_rating"], r["rating_count"]), default=None)
        return Response({
            "club": {"id": str(club.id), "name": club.name, "slug": club.slug},
            "period": {"date_from": date_from, "date_to": date_to},
            "summary": {
                "events_launched": len(events), "cancelled_events": tot["cancelled"],
                "completed_events": tot["completed"], "registrations": tot["regs"],
                "registration_rate": pct(tot["cap_reg"], tot["cap"]), "attended": tot["att"],
                "attendance_rate": pct(tot["att"], tot["ended_reg"]),
                "average_rating": avg(tot["rate_sum"], tot["rate_n"]), "rating_count": tot["rate_n"],
                "followers": ClubFollow.objects.filter(club=club).count(),
                "members": ClubMembership.objects.filter(club=club, status=ClubMembership.Status.APPROVED).count(),
            },
            "monthly": [{"month": k, "events_launched": v["events_launched"], "registrations": v["registrations"],
                         "attended": v["attended"], "average_rating": avg(v["rs"], v["rn"])}
                        for k, v in sorted(months.items())],
            "events": rows,
            "best_rated_event": None if best is None else {
                "id": best["id"], "title": best["title"], "average_rating": best["average_rating"],
                "rating_count": best["rating_count"]},
        })
