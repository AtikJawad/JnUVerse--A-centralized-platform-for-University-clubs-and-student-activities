"""Shared building blocks for the analytical reports (read-only, no new models)."""
from django.db.models import Count, IntegerField, OuterRef, Subquery, Sum
from django.db.models.functions import Coalesce
from django.utils import timezone

from apps.events.models import Event, EventRegistration
from apps.feedback.models import EventRating

LAUNCHED = (Event.Status.PUBLISHED, Event.Status.CANCELLED)  # "launched" = not a draft


def pct(part, whole):
    """Percentage rounded to 1 decimal, or None when there is nothing to divide by."""
    return None if not whole else round(100.0 * part / whole, 1)


def avg(total, n):
    return None if not n else round(total / n, 1)


def _count(qs):
    return Coalesce(Subquery(qs.order_by().values("event").annotate(n=Count("pk")).values("n"),
                             output_field=IntegerField()), 0)


def event_stats(qs):
    """Annotate events with reg_n (registered), att_n (attended), rate_n and rate_sum (ratings)."""
    regs = EventRegistration.objects.filter(event=OuterRef("pk"), status=EventRegistration.Status.REGISTERED)
    rates = EventRating.objects.filter(event=OuterRef("pk"))
    return qs.annotate(
        reg_n=_count(regs),
        att_n=_count(regs.filter(attended=True)),
        rate_n=_count(rates),
        rate_sum=Coalesce(Subquery(rates.order_by().values("event").annotate(s=Sum("rating")).values("s"),
                                   output_field=IntegerField()), 0),
    )


def is_ended(event, now=None):
    return event.status == Event.Status.PUBLISHED and event.ends_at < (now or timezone.now())


def apply_period(qs, date_from, date_to):
    """Filter events by the local date of their start."""
    if date_from:
        qs = qs.filter(starts_at__date__gte=date_from)
    if date_to:
        qs = qs.filter(starts_at__date__lte=date_to)
    return qs
