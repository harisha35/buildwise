"use client";

import { useEffect, useMemo, useState } from "react";

import { AttendanceHistoryModal } from "@/components/attendance-history-modal";
import { useToast } from "@/components/providers/toast-provider";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardBody } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { Input, Select } from "@/components/ui/field";
import { IconSearch } from "@/components/ui/icons";
import { Modal } from "@/components/ui/modal";
import { PageSpinner } from "@/components/ui/spinner";
import { useAuth } from "@/lib/auth/context";
import type { AttendanceStatus } from "@/lib/api/types";
import { useAttendance, useBulkUpsertAttendance } from "@/lib/hooks/use-attendance";
import { useProjects } from "@/lib/hooks/use-projects";
import { useWorkers } from "@/lib/hooks/use-workers";
import { errorMessage, formatCurrency, todayISO } from "@/lib/utils";

interface RowState {
  status: AttendanceStatus;
  ot_hours: string;
  rate_override: string;
}

const CYCLE: AttendanceStatus[] = ["present", "half_day", "absent"];

const STATUS_STYLE: Record<AttendanceStatus, { label: string; className: string }> = {
  present: { label: "Present", className: "bg-good text-white" },
  half_day: { label: "Half-day", className: "bg-purple text-white" },
  absent: { label: "Absent", className: "bg-orange text-white" },
};

export default function AttendancePage() {
  const { can } = useAuth();
  const { data: projects, isLoading: projectsLoading } = useProjects();
  const { data: workers } = useWorkers();

  const [projectId, setProjectId] = useState<string>("");
  const [date, setDate] = useState(todayISO());
  const [search, setSearch] = useState("");
  const [rows, setRows] = useState<Record<number, RowState>>({});
  const [historyFor, setHistoryFor] = useState<{ id: number; name: string } | null>(null);
  const [conflictWarnings, setConflictWarnings] = useState<string[] | null>(null);
  const toast = useToast();

  useEffect(() => {
    if (!projectId && projects && projects.length > 0) setProjectId(String(projects[0].id));
  }, [projects, projectId]);

  const { data: existing } = useAttendance({
    project_id: projectId ? Number(projectId) : undefined,
    start_date: date,
    end_date: date,
  });
  const bulkUpsert = useBulkUpsertAttendance();

  const activeWorkers = useMemo(
    () => (workers ?? []).filter((w) => w.is_active && w.name.toLowerCase().includes(search.toLowerCase())),
    [workers, search]
  );

  useEffect(() => {
    const next: Record<number, RowState> = {};
    for (const worker of activeWorkers) {
      const record = existing?.find((a) => a.worker_id === worker.id);
      next[worker.id] = record
        ? { status: record.status, ot_hours: String(record.ot_hours), rate_override: "" }
        : { status: "present", ot_hours: "0", rate_override: "" };
    }
    setRows(next);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [existing, projectId, date, workers]);

  function cycleStatus(workerId: number) {
    setRows((prev) => {
      const row = prev[workerId];
      const idx = CYCLE.indexOf(row.status);
      const status = CYCLE[(idx + 1) % CYCLE.length];
      return { ...prev, [workerId]: { ...row, status } };
    });
  }

  function updateRow(workerId: number, patch: Partial<RowState>) {
    setRows((prev) => ({ ...prev, [workerId]: { ...prev[workerId], ...patch } }));
  }

  async function handleSave() {
    if (!projectId) return;
    const entries = activeWorkers.map((worker) => {
      const row = rows[worker.id];
      return {
        worker_id: worker.id,
        status: row.status,
        ot_hours: Number(row.ot_hours) || 0,
        applicable_rate: row.rate_override ? Number(row.rate_override) : null,
        override_warning: false,
      };
    });
    try {
      const result = await bulkUpsert.mutateAsync({ project_id: Number(projectId), date, entries });
      toast.success(`Saved attendance for ${result.saved.length} worker${result.saved.length === 1 ? "" : "s"}.`);
      if (result.warnings.length > 0) setConflictWarnings(result.warnings);
    } catch (err) {
      toast.error(errorMessage(err));
    }
  }

  if (!can("attendance:read")) {
    return <EmptyState title="No access" description="You don't have permission to view attendance." />;
  }

  return (
    <div className="flex flex-col gap-5 pb-24">
      <div>
        <h2 className="text-2xl font-extrabold text-ink">Attendance</h2>
        <p className="mt-1 text-sm text-ink-soft">Tap a worker&rsquo;s status to cycle Present → Half-day → Absent.</p>
      </div>

      <Card>
        <CardBody className="flex flex-col gap-4 sm:flex-row sm:items-end sm:gap-4">
          <div className="flex-1">
            <label className="field-label">Project</label>
            {projectsLoading ? (
              <PageSpinner />
            ) : (
              <Select value={projectId} onChange={(e) => setProjectId(e.target.value)}>
                {projects?.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                  </option>
                ))}
              </Select>
            )}
          </div>
          <div className="sm:w-48">
            <label className="field-label">Date</label>
            <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} max={todayISO()} />
          </div>
          <div className="sm:w-64">
            <label className="field-label">Search worker</label>
            <div className="relative">
              <IconSearch className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-faint" />
              <Input className="pl-9" placeholder="Search…" value={search} onChange={(e) => setSearch(e.target.value)} />
            </div>
          </div>
        </CardBody>
      </Card>

      {!projectId && (
        <Card>
          <EmptyState title="No projects yet" description="Create a project first to start marking attendance." />
        </Card>
      )}

      {projectId && activeWorkers.length === 0 && (
        <Card>
          <EmptyState title="No workers match" description="Add workers first, or adjust your search." />
        </Card>
      )}

      {projectId && activeWorkers.length > 0 && (
        <div className="flex flex-col gap-2">
          {activeWorkers.map((worker) => {
            const row = rows[worker.id];
            if (!row) return null;
            const style = STATUS_STYLE[row.status];
            const record = existing?.find((a) => a.worker_id === worker.id);
            return (
              <Card key={worker.id} className="p-4">
                <div className="flex flex-wrap items-center gap-3 sm:flex-nowrap">
                  <div className="min-w-[140px] flex-1">
                    <p className="font-bold text-ink">{worker.name}</p>
                    <p className="text-xs text-ink-faint">
                      {worker.default_daily_rate ? formatCurrency(worker.default_daily_rate) + "/day" : "No default rate"}
                    </p>
                    {record && (
                      <button
                        type="button"
                        onClick={() => setHistoryFor({ id: record.id, name: worker.name })}
                        className="mt-0.5 text-xs font-semibold text-primary hover:underline"
                      >
                        Edit history
                      </button>
                    )}
                  </div>
                  <button
                    type="button"
                    onClick={() => cycleStatus(worker.id)}
                    className={`badge min-w-[104px] justify-center py-1.5 text-sm transition-colors ${style.className}`}
                  >
                    {style.label}
                  </button>
                  <div className="w-24">
                    <Input
                      type="number"
                      min={0}
                      step="0.5"
                      aria-label="OT hours"
                      placeholder="OT hrs"
                      value={row.ot_hours}
                      onChange={(e) => updateRow(worker.id, { ot_hours: e.target.value })}
                    />
                  </div>
                  <div className="w-32">
                    <Input
                      type="number"
                      min={0}
                      aria-label="Rate override"
                      placeholder="Rate override"
                      value={row.rate_override}
                      onChange={(e) => updateRow(worker.id, { rate_override: e.target.value })}
                    />
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
      )}

      {projectId && activeWorkers.length > 0 && can("attendance:write") && (
        <div className="fixed inset-x-0 bottom-0 z-20 border-t border-border bg-white/95 px-4 py-3 backdrop-blur lg:left-64">
          <div className="mx-auto flex max-w-6xl items-center justify-between gap-3">
            <p className="text-sm text-ink-soft">
              <Badge tone="good">{Object.values(rows).filter((r) => r.status === "present").length} present</Badge>{" "}
              <Badge tone="orange" className="ml-1">
                {Object.values(rows).filter((r) => r.status === "absent").length} absent
              </Badge>
            </p>
            <Button onClick={handleSave} loading={bulkUpsert.isPending}>
              Save Attendance
            </Button>
          </div>
        </div>
      )}

      <AttendanceHistoryModal
        attendanceId={historyFor?.id ?? null}
        workerName={historyFor?.name ?? ""}
        onClose={() => setHistoryFor(null)}
      />

      <Modal
        open={conflictWarnings !== null}
        onClose={() => setConflictWarnings(null)}
        title="Double-booked workers"
        width="sm"
      >
        <p className="text-sm text-ink-soft">
          These workers are already marked present or half-day on another project for this date. They&rsquo;ve been
          saved as entered — double-check this is intentional.
        </p>
        <ul className="mt-3 flex flex-col gap-2">
          {conflictWarnings?.map((warning, idx) => (
            <li key={idx} className="rounded-field border border-orange/30 bg-orange-soft px-3 py-2 text-sm font-semibold text-orange">
              {warning}
            </li>
          ))}
        </ul>
        <Button className="mt-4 w-full" variant="outline" onClick={() => setConflictWarnings(null)}>
          Got it
        </Button>
      </Modal>
    </div>
  );
}
