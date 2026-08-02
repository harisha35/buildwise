"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import { Logo } from "@/components/layout/logo";
import {
  IconAttendance,
  IconDashboard,
  IconMaterials,
  IconPayments,
  IconProjects,
  IconSettings,
  IconUsers,
  IconWorkers,
} from "@/components/ui/icons";
import { useAuth } from "@/lib/auth/context";
import type { Capability } from "@/lib/auth/permissions";
import { cn } from "@/lib/utils";

interface NavItem {
  href: string;
  label: string;
  icon: (props: React.SVGProps<SVGSVGElement>) => React.ReactElement;
  capability: Capability;
}

const NAV_ITEMS: NavItem[] = [
  { href: "/dashboard", label: "Dashboard", icon: IconDashboard, capability: "dashboard:read" },
  { href: "/projects", label: "Projects", icon: IconProjects, capability: "projects:read" },
  { href: "/workers", label: "Workers", icon: IconWorkers, capability: "workers:write" },
  { href: "/attendance", label: "Attendance", icon: IconAttendance, capability: "attendance:read" },
  { href: "/payments", label: "Payments & Ledger", icon: IconPayments, capability: "payments:read" },
  { href: "/materials", label: "Materials & Stock", icon: IconMaterials, capability: "materials:read" },
];

const SETTINGS_ITEMS: NavItem[] = [
  { href: "/settings/users", label: "Users", icon: IconUsers, capability: "users:manage" },
  { href: "/settings/config", label: "Configuration", icon: IconSettings, capability: "project_types:write" },
];

function NavLink({ item, active }: { item: NavItem; active: boolean }) {
  const Icon = item.icon;
  return (
    <Link
      href={item.href}
      className={cn(
        "flex items-center gap-3 rounded-field px-3 py-2.5 text-sm font-semibold transition-colors",
        active ? "bg-primary text-white" : "text-dark-text-soft hover:bg-dark-panel hover:text-dark-text"
      )}
    >
      <Icon className="h-[18px] w-[18px] flex-none" />
      {item.label}
    </Link>
  );
}

export function Sidebar({ onNavigate }: { onNavigate?: () => void }) {
  const pathname = usePathname();
  const { can } = useAuth();

  const nav = NAV_ITEMS.filter((item) => can(item.capability));
  const settingsNav = SETTINGS_ITEMS.filter((item) => can(item.capability));

  return (
    <div className="flex h-full w-64 flex-col bg-dark px-4 py-5 text-dark-text" onClick={onNavigate}>
      <Link href="/dashboard" className="mb-6 flex items-center gap-2 px-2 text-white">
        <Logo />
      </Link>
      <nav className="flex flex-1 flex-col gap-1">
        {nav.map((item) => (
          <NavLink key={item.href} item={item} active={pathname.startsWith(item.href)} />
        ))}
        {settingsNav.length > 0 && (
          <>
            <p className="mb-1 mt-5 px-3 text-[0.68rem] font-bold uppercase tracking-wider text-dark-text-soft/70">Settings</p>
            {settingsNav.map((item) => (
              <NavLink key={item.href} item={item} active={pathname.startsWith(item.href)} />
            ))}
          </>
        )}
      </nav>
      <div className="rounded-field border border-dark-line bg-dark-panel px-3 py-3 text-xs text-dark-text-soft">
        Buildwise v1 &middot; Phase 2
      </div>
    </div>
  );
}
