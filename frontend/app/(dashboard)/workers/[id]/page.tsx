"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useState } from "react";

import { useToast } from "@/components/providers/toast-provider";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardBody, CardHeader, CardTitle } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { FieldWrap, Input, Select } from "@/components/ui/field";
import { PageSpinner } from "@/components/ui/spinner";
import { useAuth } from "@/lib/auth/context";
import type { WorkerAdvanceCreate, WorkerUpdate } from "@/lib/api/types";
import { useProjects } from "@/lib/hooks/use-projects";
import { useAdvances, useCreateAdvance } from "@/lib/hooks/use-payments";
import {
  useAssignWorkerToProject,
  useDeactivateWorker,
  useUpdateWorker,
  useWorker,
  useWorkerLedger,
  useWorkerTypes,
} from "@/lib/hooks/use-workers";
import { errorMessage, formatCurrency, formatDate, todayISO } from "@/lib/utils";

export default function WorkerDetailPage() {
  const params = useParams<{ id: string }>();
  const workerId = Number(params.id);
  const { can } = useAuth();
  const toast = useToast();

  const { data: worker, isLoading } = useWorker(workerId);
  const { data: workerTypes } = useWorkerTypes();
  const updateWorker = useUpdateWorker(workerId);
  const deactivateWorker = useDeactivateWorker();

  const [form, setForm] = useState<WorkerUpdate | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (worker) setForm(worker);
  }, [worker]);

  if (isLoading || !form) return <PageSpinner />;
  if (!worker) return <p className="text-ink-soft">Worker not found.</p>;

  const canWrite = can("workers:write");

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    if (!form) return;
    setError(null);
    try {
      await updateWorker.mutateAsync(form);
      toast.success("Worker profile saved.");
    } catch (err) {
      setError(errorMessage(err));
    }
  }

  async function handleDeactivate() {
    if (!confirm(`Deactivate ${worker?.name}? Their history stays intact and visible in reports.`)) return;
    try {
      await deactivateWorker.mutateAsync(workerId);
      toast.success("Worker deactivated.");
    } catch (err) {
      toast.error(errorMessage(err));
    }
  }

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <Link href="/workers" className="text-xs font-bold uppercase tracking-wide text-ink-faint hover:text-primary">
            ← All Workers
          </Link>
          <div className="mt-1 flex items-center gap-3">
            <h2 className="text-2xl font-extrabold text-ink">{worker.name}</h2>
            <Badge tone={worker.is_active ? "good" : "neutral"}>{worker.is_active ? "Active" : "Inactive"}</Badge>
          </div>
        </div>
        {canWrite && worker.is_active && (
          <Button variant="danger" size="sm" onClick={handleDeactivate} loading={deactivateWorker.isPending}>
            Deactivate Worker
          </Button>
        )}
      </div>

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Profile</CardTitle>
          </CardHeader>
          <CardBody>
            <form className="flex flex-col gap-4" onSubmit={handleSave}>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <FieldWrap label="Name" htmlFor="name" required>
                  <Input id="name" required disabled={!canWrite} value={form.name ?? ""} onChange={(e) => setForm({ ...form, name: e.target.value })} />
                </FieldWrap>
                <FieldWrap label="Worker type" htmlFor="type">
                  <Select
                    id="type"
                    disabled={!canWrite}
                    value={form.worker_type_id ?? ""}
                    onChange={(e) => setForm({ ...form, worker_type_id: e.target.value ? Number(e.target.value) : null })}
                  >
                    <option value="">Unspecified</option>
                    {workerTypes?.map((t) => (
                      <option key={t.id} value={t.id}>
                        {t.name}
                      </option>
                    ))}
                  </Select>
                </FieldWrap>
              </div>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <FieldWrap label="Phone" htmlFor="phone">
                  <Input id="phone" disabled={!canWrite} value={form.phone ?? ""} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
                </FieldWrap>
                <FieldWrap label="Emergency contact" htmlFor="emergency">
                  <Input id="emergency" disabled={!canWrite} value={form.emergency_contact ?? ""} onChange={(e) => setForm({ ...form, emergency_contact: e.target.value })} />
                </FieldWrap>
              </div>
              <FieldWrap label="Address" htmlFor="address">
                <Input id="address" disabled={!canWrite} value={form.address ?? ""} onChange={(e) => setForm({ ...form, address: e.target.value })} />
              </FieldWrap>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <FieldWrap label="ID proof number" htmlFor="id-proof">
                  <Input id="id-proof" disabled={!canWrite} value={form.id_proof_number ?? ""} onChange={(e) => setForm({ ...form, id_proof_number: e.target.value })} />
                </FieldWrap>
                <FieldWrap label="Joining date" htmlFor="joining">
                  <Input id="joining" type="date" disabled={!canWrite} value={form.joining_date ?? ""} onChange={(e) => setForm({ ...form, joining_date: e.target.value })} />
                </FieldWrap>
              </div>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <FieldWrap label="Default daily rate (₹)" htmlFor="rate">
                  <Input
                    id="rate"
                    type="number"
                    min={0}
                    disabled={!canWrite}
                    value={form.default_daily_rate ?? ""}
                    onChange={(e) => setForm({ ...form, default_daily_rate: e.target.value ? Number(e.target.value) : null })}
                  />
                </FieldWrap>
                <FieldWrap label="Bank account" htmlFor="bank">
                  <Input id="bank" disabled={!canWrite} value={form.bank_account ?? ""} onChange={(e) => setForm({ ...form, bank_account: e.target.value })} />
                </FieldWrap>
              </div>
              <FieldWrap label="UPI ID" htmlFor="upi">
                <Input id="upi" disabled={!canWrite} value={form.upi_id ?? ""} onChange={(e) => setForm({ ...form, upi_id: e.target.value })} />
              </FieldWrap>

              {error && <p className="rounded-field border border-orange/30 bg-orange-soft px-3 py-2 text-sm font-semibold text-orange">{error}</p>}

              {canWrite && (
                <div className="flex justify-end">
                  <Button type="submit" loading={updateWorker.isPending}>
                    Save Changes
                  </Button>
                </div>
              )}
            </form>
          </CardBody>
        </Card>

        <div className="flex flex-col gap-5">
          {canWrite && <ProjectAssignmentCard workerId={workerId} />}
          {can("advances:read") && <OutstandingAdvanceCard workerId={workerId} />}
        </div>
      </div>

      {can("advances:write") && <AdvancesCard workerId={workerId} />}
      {can("ledger:read") && <LedgerCard workerId={workerId} />}
    </div>
  );
}

function ProjectAssignmentCard({ workerId }: { workerId: number }) {
  const { data: projects } = useProjects();
  const assignToProject = useAssignWorkerToProject(workerId);
  const toast = useToast();
  const [projectId, setProjectId] = useState("");
  const [rate, setRate] = useState("");
  const [otRate, setOtRate] = useState("");

  async function handleAssign() {
    if (!projectId) return;
    try {
      await assignToProject.mutateAsync({
        project_id: Number(projectId),
        custom_rate_override: rate ? Number(rate) : null,
        ot_rate_override: otRate ? Number(otRate) : null,
      });
      toast.success("Worker assigned to project.");
      setProjectId("");
      setRate("");
      setOtRate("");
    } catch (err) {
      toast.error(errorMessage(err));
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Assign to Project</CardTitle>
      </CardHeader>
      <CardBody className="flex flex-col gap-3">
        <Select value={projectId} onChange={(e) => setProjectId(e.target.value)}>
          <option value="">Choose a project…</option>
          {projects?.map((p) => (
            <option key={p.id} value={p.id}>
              {p.name}
            </option>
          ))}
        </Select>
        <div className="grid grid-cols-2 gap-3">
          <Input placeholder="Rate override (₹)" type="number" min={0} value={rate} onChange={(e) => setRate(e.target.value)} />
          <Input placeholder="OT rate override (₹)" type="number" min={0} value={otRate} onChange={(e) => setOtRate(e.target.value)} />
        </div>
        <Button size="sm" onClick={handleAssign} disabled={!projectId} loading={assignToProject.isPending}>
          Assign
        </Button>
      </CardBody>
    </Card>
  );
}

function OutstandingAdvanceCard({ workerId }: { workerId: number }) {
  const { data: ledger } = useWorkerLedger(workerId);
  return (
    <Card>
      <CardBody>
        <p className="text-xs font-bold uppercase tracking-wide text-ink-faint">Outstanding Advance</p>
        <p className="tabular mt-2 text-2xl font-extrabold text-orange">{formatCurrency(ledger?.outstanding_advance_balance ?? 0)}</p>
      </CardBody>
    </Card>
  );
}

function AdvancesCard({ workerId }: { workerId: number }) {
  const { data: advances } = useAdvances(workerId);
  const createAdvance = useCreateAdvance(workerId);
  const toast = useToast();
  const [form, setForm] = useState<WorkerAdvanceCreate>({ amount: 0, date: todayISO(), note: "" });
  const [open, setOpen] = useState(false);

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault();
    try {
      await createAdvance.mutateAsync({ ...form, note: form.note || null });
      toast.success("Advance recorded.");
      setForm({ amount: 0, date: todayISO(), note: "" });
      setOpen(false);
    } catch (err) {
      toast.error(errorMessage(err));
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Advances</CardTitle>
        <Button size="sm" variant="outline" onClick={() => setOpen((v) => !v)}>
          {open ? "Close" : "Record Advance"}
        </Button>
      </CardHeader>
      <CardBody className="flex flex-col gap-4">
        {open && (
          <form className="grid grid-cols-1 gap-3 rounded-field border border-border bg-bg-alt p-4 sm:grid-cols-4" onSubmit={handleAdd}>
            <Input
              type="number"
              min={0.01}
              step="0.01"
              placeholder="Amount (₹)"
              required
              value={form.amount || ""}
              onChange={(e) => setForm({ ...form, amount: Number(e.target.value) })}
            />
            <Input type="date" required value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} />
            <Input placeholder="Note (optional)" className="sm:col-span-1" value={form.note ?? ""} onChange={(e) => setForm({ ...form, note: e.target.value })} />
            <Button type="submit" size="sm" loading={createAdvance.isPending}>
              Save
            </Button>
          </form>
        )}
        {!advances || advances.length === 0 ? (
          <p className="text-sm text-ink-soft">No advances recorded yet.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border text-left text-xs font-bold uppercase tracking-wide text-ink-faint">
                  <th className="py-2 pr-4">Date</th>
                  <th className="py-2 pr-4">Amount</th>
                  <th className="py-2 pr-4">Outstanding</th>
                  <th className="py-2">Note</th>
                </tr>
              </thead>
              <tbody>
                {advances.map((a) => (
                  <tr key={a.id} className="border-b border-border last:border-0">
                    <td className="py-2 pr-4 text-ink-soft">{formatDate(a.date)}</td>
                    <td className="tabular py-2 pr-4 font-semibold text-ink">{formatCurrency(a.amount)}</td>
                    <td className="tabular py-2 pr-4 text-orange">{formatCurrency(a.outstanding_amount)}</td>
                    <td className="py-2 text-ink-soft">{a.note || "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </CardBody>
    </Card>
  );
}

const ENTRY_TONE: Record<string, string> = {
  wage: "text-good",
  advance_given: "text-orange",
  advance_deducted: "text-primary",
  payment: "text-ink-soft",
};

function LedgerCard({ workerId }: { workerId: number }) {
  const { data: ledger, isLoading } = useWorkerLedger(workerId);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Worker Ledger</CardTitle>
      </CardHeader>
      <CardBody>
        {isLoading && <PageSpinner />}
        {ledger && ledger.entries.length === 0 && <EmptyState title="No ledger activity yet" description="Wages, advances and payments will show up here." />}
        {ledger && ledger.entries.length > 0 && (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[560px] text-sm">
              <thead>
                <tr className="border-b border-border text-left text-xs font-bold uppercase tracking-wide text-ink-faint">
                  <th className="py-2 pr-4">Date</th>
                  <th className="py-2 pr-4">Type</th>
                  <th className="py-2 pr-4">Description</th>
                  <th className="py-2 pr-4 text-right">Debit</th>
                  <th className="py-2 text-right">Credit</th>
                </tr>
              </thead>
              <tbody>
                {ledger.entries.map((entry, idx) => (
                  <tr key={idx} className="border-b border-border last:border-0">
                    <td className="py-2 pr-4 text-ink-soft">{formatDate(entry.date)}</td>
                    <td className={`py-2 pr-4 font-semibold ${ENTRY_TONE[entry.type] ?? "text-ink"}`}>{entry.type.replace(/_/g, " ")}</td>
                    <td className="py-2 pr-4 text-ink-soft">{entry.description}</td>
                    <td className="tabular py-2 pr-4 text-right text-orange">{entry.debit ? formatCurrency(entry.debit) : ""}</td>
                    <td className="tabular py-2 text-right text-good">{entry.credit ? formatCurrency(entry.credit) : ""}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </CardBody>
    </Card>
  );
}
