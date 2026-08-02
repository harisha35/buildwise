"use client";

import Link from "next/link";
import { useState } from "react";

import { useToast } from "@/components/providers/toast-provider";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { FieldWrap, Input, Select } from "@/components/ui/field";
import { IconPlus, IconSearch } from "@/components/ui/icons";
import { Modal } from "@/components/ui/modal";
import { PageSpinner } from "@/components/ui/spinner";
import type { WorkerCreate } from "@/lib/api/types";
import { useCreateWorker, useWorkerTypes, useWorkers } from "@/lib/hooks/use-workers";
import { errorMessage, formatCurrency } from "@/lib/utils";

const EMPTY_FORM: WorkerCreate = {
  name: "",
  worker_type_id: null,
  phone: "",
  default_daily_rate: null,
  joining_date: "",
};

export default function WorkersPage() {
  const { data: workers, isLoading } = useWorkers();
  const { data: workerTypes } = useWorkerTypes();
  const createWorker = useCreateWorker();
  const toast = useToast();

  const [search, setSearch] = useState("");
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState<WorkerCreate>(EMPTY_FORM);
  const [error, setError] = useState<string | null>(null);

  const typeName = (id: number | null) => workerTypes?.find((t) => t.id === id)?.name ?? "—";

  const filtered = (workers ?? []).filter((w) => w.name.toLowerCase().includes(search.toLowerCase()));

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    try {
      await createWorker.mutateAsync({
        ...form,
        phone: form.phone || null,
        joining_date: form.joining_date || null,
      });
      toast.success(`${form.name} was added.`);
      setForm(EMPTY_FORM);
      setOpen(false);
    } catch (err) {
      setError(errorMessage(err));
    }
  }

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-2xl font-extrabold text-ink">Workers</h2>
          <p className="mt-1 text-sm text-ink-soft">Every worker across your sites, active and inactive.</p>
        </div>
        <Button onClick={() => setOpen(true)}>
          <IconPlus className="h-4 w-4" /> New Worker
        </Button>
      </div>

      <div className="relative max-w-xs">
        <IconSearch className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-faint" />
        <Input placeholder="Search workers…" className="pl-9" value={search} onChange={(e) => setSearch(e.target.value)} />
      </div>

      {isLoading && <PageSpinner />}

      {workers && workers.length === 0 && (
        <Card>
          <EmptyState
            title="No workers yet"
            description="Add your first worker to start marking attendance and tracking wages."
            action={
              <Button onClick={() => setOpen(true)}>
                <IconPlus className="h-4 w-4" /> New Worker
              </Button>
            }
          />
        </Card>
      )}

      {filtered.length > 0 && (
        <Card className="overflow-x-auto">
          <table className="w-full min-w-[600px] text-sm">
            <thead>
              <tr className="border-b border-border text-left text-xs font-bold uppercase tracking-wide text-ink-faint">
                <th className="px-5 py-3">Name</th>
                <th className="px-5 py-3">Type</th>
                <th className="px-5 py-3">Phone</th>
                <th className="px-5 py-3">Daily Rate</th>
                <th className="px-5 py-3">Status</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((worker) => (
                <tr key={worker.id} className="border-b border-border last:border-0 hover:bg-bg-alt">
                  <td className="px-5 py-3.5">
                    <Link href={`/workers/${worker.id}`} className="font-bold text-ink hover:text-primary">
                      {worker.name}
                    </Link>
                  </td>
                  <td className="px-5 py-3.5 text-ink-soft">{typeName(worker.worker_type_id)}</td>
                  <td className="px-5 py-3.5 text-ink-soft">{worker.phone || "—"}</td>
                  <td className="tabular px-5 py-3.5 text-ink-soft">{worker.default_daily_rate ? formatCurrency(worker.default_daily_rate) : "—"}</td>
                  <td className="px-5 py-3.5">
                    <Badge tone={worker.is_active ? "good" : "neutral"}>{worker.is_active ? "Active" : "Inactive"}</Badge>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
      )}

      <Modal open={open} onClose={() => setOpen(false)} title="New Worker">
        <form className="flex flex-col gap-4" onSubmit={handleCreate}>
          <FieldWrap label="Name" htmlFor="w-name" required>
            <Input id="w-name" required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
          </FieldWrap>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <FieldWrap label="Worker type" htmlFor="w-type">
              <Select
                id="w-type"
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
            <FieldWrap label="Phone" htmlFor="w-phone">
              <Input id="w-phone" value={form.phone ?? ""} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
            </FieldWrap>
          </div>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <FieldWrap label="Default daily rate (₹)" htmlFor="w-rate" hint="Overrides worker-type default">
              <Input
                id="w-rate"
                type="number"
                min={0}
                value={form.default_daily_rate ?? ""}
                onChange={(e) => setForm({ ...form, default_daily_rate: e.target.value ? Number(e.target.value) : null })}
              />
            </FieldWrap>
            <FieldWrap label="Joining date" htmlFor="w-joining">
              <Input id="w-joining" type="date" value={form.joining_date ?? ""} onChange={(e) => setForm({ ...form, joining_date: e.target.value })} />
            </FieldWrap>
          </div>

          {error && <p className="rounded-field border border-orange/30 bg-orange-soft px-3 py-2 text-sm font-semibold text-orange">{error}</p>}

          <div className="mt-1 flex justify-end gap-3">
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" loading={createWorker.isPending}>
              Add Worker
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
