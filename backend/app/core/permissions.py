"""Declarative capability -> allowed-roles table, per PRD §3.2.

Keeping this in one place means the permission matrix stays auditable instead of
scattered across `if role ==` checks in every route.
"""

from app.models.enums import UserRole

OWNER_CONTRACTOR = (UserRole.owner, UserRole.contractor)
ALL_ROLES = (UserRole.owner, UserRole.contractor, UserRole.supervisor, UserRole.accountant)
FINANCE_ROLES = (UserRole.owner, UserRole.contractor, UserRole.accountant)
FINANCE_AND_SUPERVISOR = (
    UserRole.owner,
    UserRole.contractor,
    UserRole.accountant,
    UserRole.supervisor,
)

CAPABILITIES: dict[str, tuple[UserRole, ...]] = {
    "projects:write": OWNER_CONTRACTOR,
    "projects:read": ALL_ROLES,
    "project_types:write": OWNER_CONTRACTOR,
    "users:manage": OWNER_CONTRACTOR,
    "workers:write": ALL_ROLES,
    "worker_types:write": OWNER_CONTRACTOR,
    "wage_rates:write": (UserRole.owner, UserRole.contractor, UserRole.accountant),
    "attendance:write": (UserRole.owner, UserRole.contractor, UserRole.supervisor),
    "attendance:read": ALL_ROLES,
    "payments:read": FINANCE_AND_SUPERVISOR,
    "payments:write": FINANCE_AND_SUPERVISOR,
    "advances:read": FINANCE_AND_SUPERVISOR,
    "advances:write": FINANCE_AND_SUPERVISOR,
    "ledger:read": FINANCE_AND_SUPERVISOR,
    "dashboard:read": ALL_ROLES,
    "units:write": OWNER_CONTRACTOR,
    "materials:read": FINANCE_AND_SUPERVISOR,
    "materials:write": FINANCE_AND_SUPERVISOR,
    "suppliers:read": FINANCE_AND_SUPERVISOR,
    "suppliers:write": FINANCE_AND_SUPERVISOR,
    "stock:read": FINANCE_AND_SUPERVISOR,
    "stock:write": FINANCE_AND_SUPERVISOR,
    "material_expenses:read": FINANCE_AND_SUPERVISOR,
    "material_expenses:write": FINANCE_AND_SUPERVISOR,
    "quotations:read": FINANCE_ROLES,
    "quotations:write": FINANCE_ROLES,
    "milestones:read": FINANCE_ROLES,
    "milestones:write": FINANCE_ROLES,
    "invoices:read": FINANCE_ROLES,
    "invoices:write": FINANCE_ROLES,
    "invoice_payments:write": FINANCE_ROLES,
    "reports:read": ALL_ROLES,
}


def roles_for(capability: str) -> tuple[UserRole, ...]:
    try:
        return CAPABILITIES[capability]
    except KeyError as exc:
        raise KeyError(f"Unknown capability: {capability}") from exc
