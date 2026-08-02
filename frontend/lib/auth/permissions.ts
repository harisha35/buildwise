import type { UserRole } from "@/lib/api/types";

// Mirrors backend/app/core/permissions.py CAPABILITIES exactly. This is a UX
// convenience only (hide buttons a role can't use) — the API is the real gate.
const OWNER_CONTRACTOR: UserRole[] = ["owner", "contractor"];
const ALL_ROLES: UserRole[] = ["owner", "contractor", "supervisor", "accountant"];
const FINANCE_AND_SUPERVISOR: UserRole[] = ["owner", "contractor", "accountant", "supervisor"];

export const CAPABILITIES = {
  "projects:write": OWNER_CONTRACTOR,
  "projects:read": ALL_ROLES,
  "project_types:write": OWNER_CONTRACTOR,
  "users:manage": OWNER_CONTRACTOR,
  "workers:write": ALL_ROLES,
  "worker_types:write": OWNER_CONTRACTOR,
  "attendance:write": ["owner", "contractor", "supervisor"] as UserRole[],
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
} as const;

export type Capability = keyof typeof CAPABILITIES;

export function can(role: UserRole | undefined, capability: Capability): boolean {
  if (!role) return false;
  return (CAPABILITIES[capability] as UserRole[]).includes(role);
}
