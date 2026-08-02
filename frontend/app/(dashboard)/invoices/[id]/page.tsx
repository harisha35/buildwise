"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useState } from "react";

import { useToast } from "@/components/providers/toast-provider";
import { Badge, type BadgeTone } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardBody, CardHeader, CardTitle } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { FieldWrap, Input, Select } from "@/components/ui/field";
import { Modal } from "@/components/ui/modal";
import { PageSpinner } from "@/components/ui/spinner";
import { invoicesApi } from "@/lib/api/invoices";
import type { InvoiceStatus, PaymentMode } from "@/lib/api/types";
import { useAuth } from "@/lib/auth/context";
import { useInvoice, useProjectMilestones, useRecordInvoicePayment } from "@/lib/hooks/use-invoices";
import { useProject } from "@/lib/hooks/use-projects";
import { errorMessage, formatCurrency, formatDate, labelize, todayISO } from "@/lib/utils";

const STATUS_TONE: Record<InvoiceStatus, BadgeTone> = {
  unpaid: "neutral",
  partially_paid: "purple",
  paid: "good",
  overdue: "orange",
};

export default function InvoiceDetailPage() {
  const params = useParams<{ id: string }>();
  const invoiceId = Number(params.id);
  const { can } = useAuth();
  const toast = useToast();

  const { data: invoice, isLoading } = useInvoice(invoiceId);
  const { data: project } = useProject(invoice?.project_id ?? NaN);
  const { data: milestones } = useProjectMilestones(invoice?.project_id);
  const [paymentOpen, setPaymentOpen] = useState(false);
  const [downloading, setDownloading] = useState(false);

  if (!can("invoices:read")) {
    return <EmptyState title="No access" description="You don't have permission to view invoices." />;
  }
  if (isLoading || !invoice) return <PageSpinner />;

  const milestoneNames = invoice.milestone_ids
    .map((id) => milestones?.find((m) => m.id === id)?.name)
    .filter((name): name is string => Boolean(name));

  async function handleDownload() {
    setDownloading(true);
    try {
      await invoicesApi.downloadPdf(invoiceId);
    } catch (err) {
      toast.error(errorMessage(err));
    } finally {
      setDownloading(false);
    }
  }

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <Link href="/invoices" className="text-xs font-bold uppercase tracking-wide text-ink-faint hover:text-primary">
            ← All Invoices
          </Link>
          <div className="mt-1 flex items-center gap-3">
            <h2 className="text-2xl font-extrabold text-ink">Invoice #{invoice.id}</h2>
            <Badge tone={STATUS_TONE[invoice.status]}>{labelize(invoice.status)}</Badge>
          </div>
          <p className="mt-1 text-sm text-ink-soft">
            {project?.name ?? `Project #${invoice.project_id}`} &middot; {invoice.client_name}
          </p>
        </div>
        <Button variant="outline" onClick={handleDownload} loading={downloading}>
          Download PDF
        </Button>
      </div>

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Line Items</CardTitle>
          </CardHeader>
          <CardBody>
            {milestoneNames.length > 0 && (
              <p className="mb-3 text-sm text-ink-soft">
                Billed against: <span className="font-semibold text-ink">{milestoneNames.join(", ")}</span>
              </p>
            )}
            <div className="overflow-x-auto">
              <table className="w-full min-w-[480px] text-sm">
                <thead>
                  <tr className="border-b border-border text-left text-xs font-bold uppercase tracking-wide text-ink-faint">
                    <th className="py-2 pr-4">Description</th>
                    <th className="py-2 pr-4">Qty</th>
                    <th className="py-2 pr-4">Rate</th>
                    <th className="py-2">Amount</th>
                  </tr>
                </thead>
                <tbody>
                  {invoice.line_items.map((li) => (
                    <tr key={li.id} className="border-b border-border last:border-0">
                      <td className="py-2.5 pr-4 text-ink">{li.description}</td>
                      <td className="tabular py-2.5 pr-4 text-ink-soft">{li.quantity}</td>
                      <td className="tabular py-2.5 pr-4 text-ink-soft">{formatCurrency(li.rate)}</td>
                      <td className="tabular py-2.5 font-semibold text-ink">{formatCurrency(li.amount)}</td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr>
                    <td colSpan={3} className="pt-3 text-right text-sm font-bold text-ink">
                      Total
                    </td>
                    <td className="tabular pt-3 text-sm font-extrabold text-ink">{formatCurrency(invoice.total_amount)}</td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </CardBody>
        </Card>

        <div className="flex flex-col gap-5">
          <Card>
            <CardBody className="flex flex-col gap-2 text-sm">
              <div className="flex justify-between">
                <span className="text-ink-soft">Invoice date</span>
                <span className="font-semibold text-ink">{formatDate(invoice.invoice_date)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-ink-soft">Due date</span>
                <span className="font-semibold text-ink">{formatDate(invoice.due_date)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-ink-soft">Received</span>
                <span className="tabular font-semibold text-good">{formatCurrency(invoice.amount_received)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-ink-soft">Outstanding</span>
                <span className="tabular font-bold text-ink">{formatCurrency(invoice.amount_outstanding)}</span>
              </div>
            </CardBody>
          </Card>

          {can("invoice_payments:write") && invoice.amount_outstanding > 0 && (
            <Button onClick={() => setPaymentOpen(true)}>Record Payment</Button>
          )}
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Payments Received</CardTitle>
        </CardHeader>
        <CardBody>
          {invoice.payments.length === 0 ? (
            <EmptyState title="No payments recorded yet" description="Client payments received will appear here." />
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[480px] text-sm">
                <thead>
                  <tr className="border-b border-border text-left text-xs font-bold uppercase tracking-wide text-ink-faint">
                    <th className="py-2 pr-4">Date</th>
                    <th className="py-2 pr-4">Amount</th>
                    <th className="py-2 pr-4">Mode</th>
                    <th className="py-2">Note</th>
                  </tr>
                </thead>
                <tbody>
                  {invoice.payments.map((p) => (
                    <tr key={p.id} className="border-b border-border last:border-0">
                      <td className="py-2.5 pr-4 text-ink-soft">{formatDate(p.date)}</td>
                      <td className="tabular py-2.5 pr-4 font-semibold text-ink">{formatCurrency(p.amount)}</td>
                      <td className="py-2.5 pr-4 text-ink-soft">{labelize(p.mode)}</td>
                      <td className="py-2.5 text-ink-soft">{p.note || "—"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardBody>
      </Card>

      {paymentOpen && (
        <RecordPaymentModal invoiceId={invoice.id} outstanding={invoice.amount_outstanding} onClose={() => setPaymentOpen(false)} />
      )}
    </div>
  );
}

function RecordPaymentModal({ invoiceId, outstanding, onClose }: { invoiceId: number; outstanding: number; onClose: () => void }) {
  const toast = useToast();
  const recordPayment = useRecordInvoicePayment(invoiceId);
  const [amount, setAmount] = useState(String(outstanding));
  const [date, setDate] = useState(todayISO());
  const [mode, setMode] = useState<PaymentMode>("bank_transfer");
  const [note, setNote] = useState("");
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    const amountNum = Number(amount);
    if (!amountNum || amountNum <= 0) {
      setError("Enter a valid amount.");
      return;
    }
    try {
      await recordPayment.mutateAsync({ amount: amountNum, date, mode, note: note || null });
      toast.success("Payment recorded.");
      onClose();
    } catch (err) {
      setError(errorMessage(err));
    }
  }

  return (
    <Modal open onClose={onClose} title="Record Payment" width="sm">
      <form className="flex flex-col gap-4" onSubmit={handleSubmit}>
        <FieldWrap label="Amount (₹)" htmlFor="pay-amount" required hint={`Outstanding: ${formatCurrency(outstanding)}`}>
          <Input id="pay-amount" type="number" min={0} step="0.01" required value={amount} onChange={(e) => setAmount(e.target.value)} />
        </FieldWrap>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <FieldWrap label="Date" htmlFor="pay-date" required>
            <Input id="pay-date" type="date" required value={date} max={todayISO()} onChange={(e) => setDate(e.target.value)} />
          </FieldWrap>
          <FieldWrap label="Mode" htmlFor="pay-mode" required>
            <Select id="pay-mode" value={mode} onChange={(e) => setMode(e.target.value as PaymentMode)}>
              <option value="cash">Cash</option>
              <option value="bank_transfer">Bank Transfer</option>
              <option value="upi">UPI</option>
            </Select>
          </FieldWrap>
        </div>
        <FieldWrap label="Note" htmlFor="pay-note">
          <Input id="pay-note" value={note} onChange={(e) => setNote(e.target.value)} />
        </FieldWrap>

        {error && <p className="rounded-field border border-orange/30 bg-orange-soft px-3 py-2 text-sm font-semibold text-orange">{error}</p>}

        <div className="mt-1 flex justify-end gap-3">
          <Button type="button" variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" loading={recordPayment.isPending}>
            Save Payment
          </Button>
        </div>
      </form>
    </Modal>
  );
}
