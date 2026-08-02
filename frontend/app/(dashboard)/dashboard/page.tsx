"use client";

import Link from "next/link";

import { Card, CardBody } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { IconAttendance, IconChevronRight, IconMaterials, IconPayments, IconProjects } from "@/components/ui/icons";
import { PageSpinner } from "@/components/ui/spinner";
import { StatCard } from "@/components/ui/stat-card";
import { useAuth } from "@/lib/auth/context";
import { useDashboardSummary } from "@/lib/hooks/use-dashboard";
import { formatCurrency } from "@/lib/utils";

export default function DashboardPage() {
  const { user, can } = useAuth();
  const { data, isLoading, isError } = useDashboardSummary();

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h2 className="text-2xl font-extrabold text-ink">Welcome back, {user?.name?.split(" ")[0]}</h2>
        <p className="mt-1 text-sm text-ink-soft">Here&rsquo;s what&rsquo;s happening across your sites today.</p>
      </div>

      {isLoading && <PageSpinner />}
      {isError && (
        <Card>
          <CardBody>
            <EmptyState title="Couldn't load the dashboard" description="Check your connection and try refreshing the page." />
          </CardBody>
        </Card>
      )}

      {data && (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <StatCard
            label="Active Projects"
            value={String(data.active_projects_count)}
            tone="primary"
            icon={<IconProjects className="h-5 w-5" />}
          />
          <StatCard
            label="Present Today"
            value={String(data.todays_attendance.present)}
            hint={`${data.todays_attendance.half_day} half-day`}
            tone="good"
            icon={<IconAttendance className="h-5 w-5" />}
          />
          <StatCard
            label="Absent Today"
            value={String(data.todays_attendance.absent)}
            tone="orange"
            icon={<IconAttendance className="h-5 w-5" />}
          />
          <StatCard
            label="Payments Due This Week"
            value={formatCurrency(data.payments_due_this_week_total)}
            hint={`${data.payments_due_this_week_count} worker${data.payments_due_this_week_count === 1 ? "" : "s"}`}
            tone="purple"
            icon={<IconPayments className="h-5 w-5" />}
          />
          <StatCard
            label="Material Spend"
            value={formatCurrency(data.material_spend_total)}
            hint="Stock-in cost + direct expenses"
            tone="orange"
            icon={<IconMaterials className="h-5 w-5" />}
          />
        </div>
      )}

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        {can("attendance:write") && (
          <QuickLink href="/attendance" title="Mark today's attendance" description="Daily grid, tap to cycle status." icon={<IconAttendance className="h-5 w-5" />} />
        )}
        {can("payments:read") && (
          <QuickLink href="/payments" title="Review payments due" description="Generate and mark weekly wages paid." icon={<IconPayments className="h-5 w-5" />} />
        )}
        {can("materials:read") && (
          <QuickLink href="/materials" title="Track materials & stock" description="Record stock in/out/wastage and expenses." icon={<IconMaterials className="h-5 w-5" />} />
        )}
        {can("projects:read") && (
          <QuickLink href="/projects" title="View projects" description="See status across every active site." icon={<IconProjects className="h-5 w-5" />} />
        )}
      </div>
    </div>
  );
}

function QuickLink({ href, title, description, icon }: { href: string; title: string; description: string; icon: React.ReactNode }) {
  return (
    <Link href={href} className="card group flex items-center gap-4 p-5 transition-shadow hover:shadow-lg">
      <span className="flex h-10 w-10 flex-none items-center justify-center rounded-field bg-primary-soft text-primary">{icon}</span>
      <span className="flex-1">
        <span className="block font-bold text-ink">{title}</span>
        <span className="block text-sm text-ink-soft">{description}</span>
      </span>
      <IconChevronRight className="h-4 w-4 flex-none text-ink-faint transition-transform group-hover:translate-x-0.5" />
    </Link>
  );
}
