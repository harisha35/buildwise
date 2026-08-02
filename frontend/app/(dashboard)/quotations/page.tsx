"use client";

import { useState } from "react";

import { LineItemsEditor, emptyLineItem } from "@/components/line-items-editor";
import { useToast } from "@/components/providers/toast-provider";
import { Badge, type BadgeTone } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardBody, CardHeader, CardTitle } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { FieldWrap, Input, Select, Textarea } from "@/components/ui/field";
import { IconPlus } from "@/components/ui/icons";
import { Modal } from "@/components/ui/modal";
import { PageSpinner } from "@/components/ui/spinner";
import { quotationsApi } from "@/lib/api/quotations";
import type { LineItemInput, QuotationCreate, QuotationOut, QuotationStatus, QuotationUpdate } from "@/lib/api/types";
import { useAuth } from "@/lib/auth/context";
import { useCreateQuotation, useQuotations, useUpdateQuotation } from "@/lib/hooks/use-quotations";
import { useProjects } from "@/lib/hooks/use-projects";
import { errorMessage, formatCurrency, formatDate, labelize, todayISO } from "@/lib/utils";

const STATUS_TONE: Record<QuotationStatus, BadgeTone> = {
  draft: "neutral",
  sent: "primary",
  accepted: "good",
  rejected: "orange",
};

export default function QuotationsPage() {
  const { can } = useAuth();
  const [statusFilter, setStatusFilter] = useState<QuotationStatus | "">("");
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<QuotationOut | null>(null);
  const [downloadingId, setDownloadingId] = useState<number | null>(null);
  const toast = useToast();

  const { data: quotations, isLoading } = useQuotations(statusFilter || undefined);
  const { data: projects } = useProjects();

  if (!can("quotations:read")) {
    return <EmptyState title="No access" description="You don't have permission to view quotations." />;
  }

  const projectName = (id: number | null) => (id ? projects?.find((p) => p.id === id)?.name ?? `#${id}` : "—");

  async function handleDownload(id: number) {
    setDownloadingId(id);
    try {
      await quotationsApi.downloadPdf(id);
    } catch (err) {
      toast.error(errorMessage(err));
    } finally {
      setDownloadingId(null);
    }
  }

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-2xl font-extrabold text-ink">Quotations</h2>
          <p className="mt-1 text-sm text-ink-soft">Pre-project client quotations with line items and PDF export.</p>
        </div>
        {can("quotations:write") && (
          <Button onClick={() => setOpen(true)}>
            <IconPlus className="h-4 w-4" /> New Quotation
          </Button>
        )}
      </div>

      <Card>
        <CardHeader>
          <CardTitle>All Quotations</CardTitle>
          <div className="w-44">
            <Select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value as QuotationStatus | "")}>
              <option value="">All statuses</option>
              <option value="draft">Draft</option>
              <option value="sent">Sent</option>
              <option value="accepted">Accepted</option>
              <option value="rejected">Rejected</option>
            </Select>
          </div>
        </CardHeader>
        <CardBody>
          {isLoading && <PageSpinner />}
          {quotations && quotations.length === 0 && (
            <EmptyState title="No quotations yet" description="Create a quotation for a prospective client before the project starts." />
          )}
          {quotations && quotations.length > 0 && (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[760px] text-sm">
                <thead>
                  <tr className="border-b border-border text-left text-xs font-bold uppercase tracking-wide text-ink-faint">
                    <th className="py-2.5 pr-4">Client</th>
                    <th className="py-2.5 pr-4">Description</th>
                    <th className="py-2.5 pr-4">Project</th>
                    <th className="py-2.5 pr-4">Date</th>
                    <th className="py-2.5 pr-4">Valid Until</th>
                    <th className="py-2.5 pr-4">Total</th>
                    <th className="py-2.5 pr-4">Status</th>
                    <th className="py-2.5">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {quotations.map((q) => (
                    <tr key={q.id} className="border-b border-border last:border-0">
                      <td className="py-2.5 pr-4 font-semibold text-ink">{q.client_name}</td>
                      <td className="py-2.5 pr-4 text-ink-soft">{q.project_description || "—"}</td>
                      <td className="py-2.5 pr-4 text-ink-soft">{projectName(q.project_ref_id)}</td>
                      <td className="py-2.5 pr-4 text-ink-soft">{formatDate(q.date)}</td>
                      <td className="py-2.5 pr-4 text-ink-soft">{formatDate(q.validity_date)}</td>
                      <td className="tabular py-2.5 pr-4 font-semibold text-ink">{formatCurrency(q.total_amount)}</td>
                      <td className="py-2.5 pr-4">
                        <Badge tone={STATUS_TONE[q.status]}>{labelize(q.status)}</Badge>
                      </td>
                      <td className="py-2.5">
                        <div className="flex items-center gap-3">
                          {can("quotations:write") && (
                            <button type="button" className="text-xs font-bold text-primary hover:underline" onClick={() => setEditing(q)}>
                              Edit
                            </button>
                          )}
                          <button
                            type="button"
                            className="text-xs font-bold text-primary hover:underline disabled:opacity-50"
                            disabled={downloadingId === q.id}
                            onClick={() => handleDownload(q.id)}
                          >
                            {downloadingId === q.id ? "Downloading…" : "PDF"}
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardBody>
      </Card>

      {(open || editing) && (
        <QuotationModal
          quotation={editing}
          projects={projects ?? []}
          onClose={() => {
            setOpen(false);
            setEditing(null);
          }}
        />
      )}
    </div>
  );
}

function QuotationModal({
  quotation,
  projects,
  onClose,
}: {
  quotation: QuotationOut | null;
  projects: { id: number; name: string }[];
  onClose: () => void;
}) {
  const toast = useToast();
  const createQuotation = useCreateQuotation();
  const updateQuotation = useUpdateQuotation(quotation?.id ?? 0);
  const pending = createQuotation.isPending || updateQuotation.isPending;

  const [clientName, setClientName] = useState(quotation?.client_name ?? "");
  const [description, setDescription] = useState(quotation?.project_description ?? "");
  const [projectRefId, setProjectRefId] = useState(quotation?.project_ref_id ? String(quotation.project_ref_id) : "");
  const [date, setDate] = useState(quotation?.date ?? todayISO());
  const [validityDate, setValidityDate] = useState(quotation?.validity_date ?? "");
  const [terms, setTerms] = useState(quotation?.terms ?? "");
  const [status, setStatus] = useState<QuotationStatus>(quotation?.status ?? "draft");
  const [items, setItems] = useState<LineItemInput[]>(
    quotation?.line_items.map((li) => ({ description: li.description, quantity: li.quantity, rate: li.rate })) ?? [
      { ...emptyLineItem },
    ]
  );
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (!clientName.trim() || items.some((i) => !i.description.trim())) {
      setError("Client name and a description for every line item are required.");
      return;
    }
    try {
      if (quotation) {
        const payload: QuotationUpdate = {
          client_name: clientName,
          project_description: description || null,
          project_ref_id: projectRefId ? Number(projectRefId) : null,
          date,
          validity_date: validityDate || null,
          terms: terms || null,
          status,
          line_items: items,
        };
        await updateQuotation.mutateAsync(payload);
        toast.success("Quotation updated.");
      } else {
        const payload: QuotationCreate = {
          client_name: clientName,
          project_description: description || null,
          project_ref_id: projectRefId ? Number(projectRefId) : null,
          date,
          validity_date: validityDate || null,
          terms: terms || null,
          line_items: items,
        };
        await createQuotation.mutateAsync(payload);
        toast.success("Quotation created.");
      }
      onClose();
    } catch (err) {
      setError(errorMessage(err));
    }
  }

  return (
    <Modal open onClose={onClose} title={quotation ? "Edit Quotation" : "New Quotation"} width="lg">
      <form className="flex flex-col gap-4" onSubmit={handleSubmit}>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <FieldWrap label="Client name" htmlFor="q-client" required>
            <Input id="q-client" required value={clientName} onChange={(e) => setClientName(e.target.value)} />
          </FieldWrap>
          <FieldWrap label="Link to project" htmlFor="q-project" hint="Optional — link once a formal project exists">
            <Select id="q-project" value={projectRefId} onChange={(e) => setProjectRefId(e.target.value)}>
              <option value="">Not linked</option>
              {projects.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </Select>
          </FieldWrap>
        </div>
        <FieldWrap label="Project description" htmlFor="q-desc">
          <Textarea id="q-desc" value={description} onChange={(e) => setDescription(e.target.value)} />
        </FieldWrap>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <FieldWrap label="Date" htmlFor="q-date" required>
            <Input id="q-date" type="date" required value={date} onChange={(e) => setDate(e.target.value)} />
          </FieldWrap>
          <FieldWrap label="Valid until" htmlFor="q-validity">
            <Input id="q-validity" type="date" value={validityDate ?? ""} onChange={(e) => setValidityDate(e.target.value)} />
          </FieldWrap>
          {quotation && (
            <FieldWrap label="Status" htmlFor="q-status">
              <Select id="q-status" value={status} onChange={(e) => setStatus(e.target.value as QuotationStatus)}>
                <option value="draft">Draft</option>
                <option value="sent">Sent</option>
                <option value="accepted">Accepted</option>
                <option value="rejected">Rejected</option>
              </Select>
            </FieldWrap>
          )}
        </div>
        <FieldWrap label="Terms & conditions" htmlFor="q-terms">
          <Textarea id="q-terms" value={terms ?? ""} onChange={(e) => setTerms(e.target.value)} />
        </FieldWrap>

        <LineItemsEditor items={items} onChange={setItems} />

        {error && <p className="rounded-field border border-orange/30 bg-orange-soft px-3 py-2 text-sm font-semibold text-orange">{error}</p>}

        <div className="mt-1 flex justify-end gap-3">
          <Button type="button" variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" loading={pending}>
            {quotation ? "Save Changes" : "Create Quotation"}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
