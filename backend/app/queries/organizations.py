from __future__ import annotations

from uuid import UUID

from sqlmodel import col

from app.db.queryset import QuerySet, qs
from app.models.organization_board_access import OrganizationBoardAccess
from app.models.organization_invites import OrganizationInvite
from app.models.organization_members import OrganizationMember
from app.models.organizations import Organization


def organization_by_name(name: str) -> QuerySet[Organization]:
    return qs(Organization).filter(col(Organization.name) == name)


def member_by_user_and_org(*, user_id: UUID, organization_id: UUID) -> QuerySet[OrganizationMember]:
    return qs(OrganizationMember).filter(
        col(OrganizationMember.organization_id) == organization_id,
        col(OrganizationMember.user_id) == user_id,
    )


def first_membership_for_user(user_id: UUID) -> QuerySet[OrganizationMember]:
    return (
        qs(OrganizationMember)
        .filter(col(OrganizationMember.user_id) == user_id)
        .order_by(col(OrganizationMember.created_at).asc())
    )


def pending_invite_by_email(email: str) -> QuerySet[OrganizationInvite]:
    return (
        qs(OrganizationInvite)
        .filter(col(OrganizationInvite.accepted_at).is_(None))
        .filter(col(OrganizationInvite.invited_email) == email)
        .order_by(col(OrganizationInvite.created_at).asc())
    )


def board_access_for_member_and_board(
    *,
    organization_member_id: UUID,
    board_id: UUID,
) -> QuerySet[OrganizationBoardAccess]:
    return qs(OrganizationBoardAccess).filter(
        col(OrganizationBoardAccess.organization_member_id) == organization_member_id,
        col(OrganizationBoardAccess.board_id) == board_id,
    )
