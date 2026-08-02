"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

import { LineItemsEditor, emptyLineItem } from "@/components/line-items-editor";
import { useToast } from "@/components/providers/toast-provider";
import { Badge, type BadgeTone } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardBody, CardHeader, CardTitle } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { FieldWrap, Input, Select } from "@/components/ui/field";
import { IconPlus } from "@/components/ui/icons";
import { Modal } from "@/components/ui/modal";
import { PageSpinner } from "@/components/ui/spinner";
import type { InvoiceCreate, InvoiceStatus, LineItemInput } from "@/lib/api/types";
import { useAuth } from "@/lib/auth/context";
import { useCreateInvoice, useInvoices, useProjectMilestones } from "@/lib/hooks/use-invoices";
import { useProjects } from "@/lib/hooks/use-projects";
import { errorMessage, formatCurrency, formatDate, labelize, todayISO } from "@/lib/utils";

const STATUS_TONE: Record<InvoiceStatus, BadgeTone> = {
  unpaid: "neutral",
  partially_paid: "purple",
  paid: "good",
  overdue: "orange",
};

export default function InvoicesPage() {
  const { can } = useAuth();
  const { data: projects } = useProjects();
  const [projectFilter, setProjectFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState<InvoiceStatus | "">("");
  const [open, setOpen] = useState(false);

  const { data: invoices, isLoading } = useInvoices({
    project_id: projectFilter ? Number(projectFilter) : undefined,
    status_filter: statusFilter || undefined,
  });

  if (!can("invoices:read")) {
    return <EmptyState title="No access" description="You don't have permission to view invoices." />;
  }

  const projectName = (id: number) => projects?.find((p) => p.id === id)?.name ?? `Project #${id}`;

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-2xl font-extrabold text-ink">Invoices</h2>
          <p className="mt-1 text-sm text-ink-soft">Milestone-based client invoices with partial payments and PDF export.</p>
        </div>
        {can("invoices:write") && (
          <Button onClick={() => setOpen(true)}>
            <IconPlus className="h-4 w-4" /> New Invoice
          </Button>
        )}
      </div>

      <Card>
        <CardHeader>
          <CardTitle>All Invoices</CardTitle>
          <div className="flex gap-3">
            <div className="w-48">
              <Select value={projectFilter} onChange={(e) => setProjectFilter(e.target.value)}>
                <option value="">All projects</option>
                {projects?.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                  </option>
                ))}
              </Select>
            </div>
            <div className="w-40">
              <Select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value as InvoiceStatus | "")}>
                <option value="">All statuses</option>
                <option value="unpaid">Unpaid</option>
                <option value="partially_paid">Partially Paid</option>
                <option value="paid">Paid</option>
                <option value="overdue">Overdue</option>
              </Select>
            </div>
          </div>
        </CardHeader>
        <CardBody>
          {isLoading && <PageSpinner />}
          {invoices && invoices.length === 0 && (
            <EmptyState title="No invoices yet" description="Raise an invoice against a project's milestones once work is billable." />
          )}
          {invoices && invoices.length > 0 && (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[760px] text-sm">
                <thead>
                  <tr className="border-b border-border text-left text-xs font-bold uppercase tracking-wide text-ink-faint">
                    <th className="py-2.5 pr-4">Project</th>
                    <th className="py-2.5 pr-4">Client</th>
                    <th className="py-2.5 pr-4">Invoice Date</th>
                    <th className="py-2.5 pr-4">Due Date</th>
                    <th className="py-2.5 pr-4">Total</th>
                    <th className="py-2.5 pr-4">Outstanding</th>
                    <th className="py-2.5 pr-4">Status</th>
                    <th className="py-2.5" />
                  </tr>
                </thead>
                <tbody>
                  {invoices.map((inv) => (
                    <tr key={inv.id} className="border-b border-border last:border-0">
                      <td className="py-2.5 pr-4 font-semibold text-ink">{projectName(inv.project_id)}</td>
                      <td className="py-2.5 pr-4 text-ink-soft">{inv.client_name}</td>
                      <td className="py-2.5 pr-4 text-ink-soft">{formatDate(inv.invoice_date)}</td>
                      <td className="py-2.5 pr-4 text-ink-soft">{formatDate(inv.due_date)}</td>
                      <td className="tabular py-2.5 pr-4 font-semibold text-ink">{formatCurrency(inv.total_amount)}</td>
                      <td className="tabular py-2.5 pr-4 text-ink-soft">{formatCurrency(inv.amount_outstanding)}</td>
                      <td className="py-2.5 pr-4">
                        <Badge tone={STATUS_TONE[inv.status]}>{labelize(inv.status)}</Badge>
                      </td>
                      <td className="py-2.5">
                        <Link href={`/invoices/${inv.id}`} className="text-xs font-bold text-primary hover:underline">
                          View
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardBody>
      </Card>

      {open && <CreateInvoiceModal projects={projects ?? []} onClose={() => setOpen(false)} />}
    </div>
  );
}

function CreateInvoiceModal({ projects, onClose }: { projects: { id: number; name: string; client_name: string | null }[]; onClose: () => void }) {
  const toast = useToast();
  const createInvoice = useCreateInvoice();

  const [projectId, setProjectId] = useState("");
  const [clientName, setClientName] = useState("");
  const [invoiceDate, setInvoiceDate] = useState(todayISO());
  const [dueDate, setDueDate] = useState("");
  const [milestoneIds, setMilestoneIds] = useState<number[]>([]);
  const [items, setItems] = useState<LineItemInput[]>([{ ...emptyLineItem }]);
  const [error, setError] = useState<string | null>(null);

  const { data: milestones } = useProjectMilestones(projectId ? Number(projectId) : undefined);

  useEffect(() => {
    setMilestoneIds([]);
    if (projectId) {
      const project = projects.find((p) => p.id === Number(projectId));
      if (project?.client_name) setClientName(project.client_name);
    }
  }, [projectId, projects]);

  function toggleMilestone(id: number) {
    setMilestoneIds((prev) => (prev.includes(id) ? prev.filter((m) => m !== id) : [...prev, id]));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (!projectId || !clientName.trim() || items.some((i) => !i.description.trim())) {
      setError("Project, client name, and a description for every line item are required.");
      return;
    }
    try {
      const payload: InvoiceCreate = {
        project_id: Number(projectId),
        client_name: clientName,
        invoice_date: invoiceDate,
        due_date: dueDate || null,
        milestone_ids: milestoneIds,
        line_items: items,
      };
      await createInvoice.mutateAsync(payload);
      toast.success("Invoice created.");
      onClose();
    } catch (err) {
      setError(errorMessage(err));
    }
  }

  return (
    <Modal open onClose={onClose} title="New Invoice" width="lg">
      <form className="flex flex-col gap-4" onSubmit={handleSubmit}>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <FieldWrap label="Project" htmlFor="inv-project" required>
            <Select id="inv-project" required value={projectId} onChange={(e) => setProjectId(e.target.value)}>
              <option value="">Choose a project…</option>
              {projects.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </Select>
          </FieldWrap>
          <FieldWrap label="Client name" htmlFor="inv-client" required>
            <Input id="inv-client" required value={clientName} onChange={(e) => setClientName(e.target.value)} />
          </FieldWrap>
        </div>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <FieldWrap label="Invoice date" htmlFor="inv-date" required>
            <Input id="inv-date" type="date" required value={invoiceDate} onChange={(e) => setInvoiceDate(e.target.value)} />
          </FieldWrap>
          <FieldWrap label="Due date" htmlFor="inv-due">
            <Input id="inv-due" type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} />
          </FieldWrap>
        </div>

        {projectId && (
          <div>
            <label className="field-label">Milestones billed</label>
            {!milestones || milestones.length === 0 ? (
              <p className="text-sm text-ink-faint">No milestones on this project yet — add them from the project detail page.</p>
            ) : (
              <div className="flex flex-col gap-1.5">
                {milestones.map((m) => (
                  <label key={m.id} className="flex items-center gap-2 rounded-field bg-bg-alt px-3 py-2 text-sm">
                    <input type="checkbox" checked={milestoneIds.includes(m.id)} onChange={() => toggleMilestone(m.id)} />
                    <span className="font-semibold text-ink">{m.name}</span>
                    <span className="tabular ml-auto text-ink-faint">{formatCurrency(m.amount)}</span>
                  </label>
                ))}
              </div>
            )}
          </div>
        )}

        <LineItemsEditor items={items} onChange={setItems} />

        {error && <p className="rounded-field border border-orange/30 bg-orange-soft px-3 py-2 text-sm font-semibold text-orange">{error}</p>}

        <div className="mt-1 flex justify-end gap-3">
          <Button type="button" variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" loading={createInvoice.isPending}>
            Create Invoice
          </Button>
        </div>
      </form>
    </Modal>
  );
}
