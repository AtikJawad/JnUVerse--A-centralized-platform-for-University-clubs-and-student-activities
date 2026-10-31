from apps.accounts.models import StudentProfile
from apps.clubs.models import ClubFollow, ClubMembership
from apps.events.models import EventRegistration

from .models import Notice, Notification

T = Notification.Type


def _send(user_ids, **fields):
    # The unique constraints make repeated sends harmless (ignored).
    Notification.objects.bulk_create(
        [Notification(recipient_id=uid, **fields) for uid in user_ids], ignore_conflicts=True
    )


def _member_ids(club):
    return set(
        ClubMembership.objects.filter(club=club, status=ClubMembership.Status.APPROVED)
        .values_list("student__user_id", flat=True)
    )


def _follower_and_member_ids(club):
    followers = set(ClubFollow.objects.filter(club=club).values_list("student__user_id", flat=True))
    return followers | _member_ids(club)


def _registered_ids(event):
    return set(
        EventRegistration.objects.filter(event=event, status=EventRegistration.Status.REGISTERED)
        .values_list("student__user_id", flat=True)
    )


def notify_notice(notice):
    if notice.audience == Notice.Audience.MEMBERS:
        ids = _member_ids(notice.club)
    elif notice.audience == Notice.Audience.DEPARTMENT:
        ids = set(StudentProfile.objects.filter(department=notice.target_department).values_list("user_id", flat=True))
    else:  # public / followers
        ids = _follower_and_member_ids(notice.club)
    _send(ids, notice=notice, type=T.NOTICE,
          title=f"{notice.club.name}: {notice.title}"[:200], message=notice.body[:200])


def notify_event_published(event):
    _send(_follower_and_member_ids(event.club), event=event, type=T.EVENT_PUBLISHED,
          title=f"New event: {event.title}"[:200],
          message=f"{event.club.name} published an event at {event.venue}.")


def notify_event_cancelled(event):
    _send(_registered_ids(event), event=event, type=T.EVENT_CANCELLED,
          title=f"Event cancelled: {event.title}"[:200], message=f"{event.club.name} cancelled this event.")


def notify_event_updated(event):
    _send(_registered_ids(event), event=event, type=T.EVENT_UPDATED,
          title=f"Event updated: {event.title}"[:200],
          message="The time or venue has changed. Please check the details.")


MEMBERSHIP_TEXT = {
    "approved": ("Membership approved", "Your request to join {club} was approved."),
    "rejected": ("Membership rejected", "Your request to join {club} was not approved."),
    "removed": ("Removed from club", "You were removed from {club}."),
}


def notify_membership_decision(membership, decision):
    title, text = MEMBERSHIP_TEXT[decision]
    Notification.objects.create(
        recipient_id=membership.student.user_id, type=T.MEMBERSHIP_UPDATE,
        title=title, message=text.format(club=membership.club.name),
    )


def notify_membership_request(membership):
    s = membership.student
    Notification.objects.create(
        recipient_id=membership.club.operator_id, type=T.MEMBERSHIP_UPDATE,
        title="New membership request",
        message=f"{s.full_name} ({s.jnu_student_id}) requested to join {membership.club.name}.",
    )