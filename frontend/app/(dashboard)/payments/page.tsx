"use client";

import { useState } from "react";

import { useToast } from "@/components/providers/toast-provider";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardBody, CardHeader, CardTitle } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { FieldWrap, Input, Select } from "@/components/ui/field";
import { Modal } from "@/components/ui/modal";
import { PageSpinner } from "@/components/ui/spinner";
import { apiUpload } from "@/lib/api/client";
import type { MarkPaidRequest, PaymentMode, WorkerPaymentOut } from "@/lib/api/types";
import { useAuth } from "@/lib/auth/context";
import { useMarkPaid, usePayments, usePaymentsDue, useRunWeeklyPayments } from "@/lib/hooks/use-payments";
import { useWorkers } from "@/lib/hooks/use-workers";
import { currentWeekStartISO, errorMessage, formatCurrency, formatDate, formatDateTime, labelize } from "@/lib/utils";

export default function PaymentsPage() {
  const { can } = useAuth();
  const { data: workers } = useWorkers();
  const [weekStart, setWeekStart] = useState(currentWeekStartISO());
  const { data: due, isLoading, error } = usePaymentsDue(weekStart);
  const { data: history } = usePayments();
  const runWeeklyJob = useRunWeeklyPayments();
  const toast = useToast();

  const [selected, setSelected] = useState<WorkerPaymentOut | null>(null);

  const workerName = (id: number) => workers?.find((w) => w.id === id)?.name ?? `Worker #${id}`;

  async function handleRunJob() {
    try {
      const created = await runWeeklyJob.mutateAsync(weekStart);
      toast.success(`Generated ${created.length} payment${created.length === 1 ? "" : "s"} for the week of ${formatDate(weekStart)}.`);
    } catch (err) {
      toast.error(errorMessage(err));
    }
  }

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-2xl font-extrabold text-ink">Payments & Ledger</h2>
          <p className="mt-1 text-sm text-ink-soft">Weekly wages due, review and mark paid.</p>
        </div>
      </div>

      <Card>
        <CardBody className="flex flex-wrap items-end gap-4">
          <div className="sm:w-56">
            <label className="field-label">Week starting (Monday)</label>
            <Input type="date" value={weekStart} onChange={(e) => setWeekStart(e.target.value)} />
          </div>
          {can("payments:write") && (
            <Button variant="outline" size="sm" onClick={handleRunJob} loading={runWeeklyJob.isPending}>
              Generate Payments for Week
            </Button>
          )}
        </CardBody>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Due — week of {formatDate(weekStart)}</CardTitle>
        </CardHeader>
        <CardBody>
          {isLoading && <PageSpinner />}
          {error && <p className="text-sm font-semibold text-orange">{errorMessage(error, "week_start must be a Monday.")}</p>}
          {due && due.length === 0 && <EmptyState title="Nothing due" description="No unpaid wages generated for this week yet." />}
          {due && due.length > 0 && (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[640px] text-sm">
                <thead>
                  <tr className="border-b border-border text-left text-xs font-bold uppercase tracking-wide text-ink-faint">
                    <th className="py-2.5 pr-4">Worker</th>
                    <th className="py-2.5 pr-4">Gross Due</th>
                    <th className="py-2.5 pr-4">Status</th>
                    <th className="py-2.5" />
                  </tr>
                </thead>
                <tbody>
                  {due.map((payment) => (
                    <tr key={payment.id} className="border-b border-border last:border-0">
                      <td className="py-3 pr-4 font-bold text-ink">{workerName(payment.worker_id)}</td>
                      <td className="tabular py-3 pr-4 font-semibold text-ink">{formatCurrency(payment.gross_wage_due)}</td>
                      <td className="py-3 pr-4">
                        <Badge tone={payment.status === "paid" ? "good" : "orange"}>{labelize(payment.status)}</Badge>
                      </td>
                      <td className="py-3 text-right">
                        {can("payments:write") && payment.status === "due" && (
                          <Button size="sm" onClick={() => setSelected(payment)}>
                            Mark Paid
                          </Button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardBody>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Recent Payment History</CardTitle>
        </CardHeader>
        <CardBody>
          {!history || history.length === 0 ? (
            <EmptyState title="No payments recorded yet" />
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[720px] text-sm">
                <thead>
                  <tr className="border-b border-border text-left text-xs font-bold uppercase tracking-wide text-ink-faint">
                    <th className="py-2.5 pr-4">Worker</th>
                    <th className="py-2.5 pr-4">Week</th>
                    <th className="py-2.5 pr-4">Net Paid</th>
                    <th className="py-2.5 pr-4">Mode</th>
                    <th className="py-2.5 pr-4">Paid At</th>
                    <th className="py-2.5">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {history.slice(0, 25).map((payment) => (
                    <tr key={payment.id} className="border-b border-border last:border-0">
                      <td className="py-2.5 pr-4 font-semibold text-ink">{workerName(payment.worker_id)}</td>
                      <td className="py-2.5 pr-4 text-ink-soft">
                        {formatDate(payment.week_start)} – {formatDate(payment.week_end)}
                      </td>
                      <td className="tabular py-2.5 pr-4 text-ink-soft">{payment.net_paid ? formatCurrency(payment.net_paid) : "—"}</td>
                      <td className="py-2.5 pr-4 text-ink-soft">{payment.payment_mode ? labelize(payment.payment_mode) : "—"}</td>
                      <td className="py-2.5 pr-4 text-ink-soft">{formatDateTime(payment.paid_at)}</td>
                      <td className="py-2.5">
                        <Badge tone={payment.status === "paid" ? "good" : "orange"}>{labelize(payment.status)}</Badge>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardBody>
      </Card>

      {selected && <MarkPaidModal payment={selected} onClose={() => setSelected(null)} />}
    </div>
  );
}

function MarkPaidModal({ payment, onClose }: { payment: WorkerPaymentOut; onClose: () => void }) {
  const markPaid = useMarkPaid();
  const toast = useToast();
  const [form, setForm] = useState<MarkPaidRequest>({
    advance_deduction_amount: 0,
    payment_mode: "cash",
    proof_reference: "",
    proof_file_url: "",
  });
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const proofRequired = form.payment_mode !== "cash";
  const hasProof = Boolean(form.proof_reference || form.proof_file_url);

  async function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      const { url } = await apiUpload(file);
      setForm((f) => ({ ...f, proof_file_url: url }));
    } catch (err) {
      toast.error(errorMessage(err, "Upload failed."));
    } finally {
      setUploading(false);
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (proofRequired && !hasProof) {
      setError("Bank transfer and UPI require a transaction reference or proof upload.");
      return;
    }
    try {
      await markPaid.mutateAsync({
        id: payment.id,
        payload: { ...form, proof_reference: form.proof_reference || null, proof_file_url: form.proof_file_url || null },
      });
      toast.success("Payment marked as paid.");
      onClose();
    } catch (err) {
      setError(errorMessage(err));
    }
  }

  return (
    <Modal open onClose={onClose} title="Mark Payment as Paid" width="sm">
      <form className="flex flex-col gap-4" onSubmit={handleSubmit}>
        <div className="rounded-field bg-bg-alt p-3 text-sm">
          <div className="flex justify-between">
            <span className="text-ink-soft">Gross wage due</span>
            <span className="tabular font-bold text-ink">{formatCurrency(payment.gross_wage_due)}</span>
          </div>
        </div>

        <FieldWrap label="Advance deduction (₹)" htmlFor="deduction" hint="Full, partial, or none — supervisor's choice">
          <Input
            id="deduction"
            type="number"
            min={0}
            value={form.advance_deduction_amount}
            onChange={(e) => setForm({ ...form, advance_deduction_amount: Number(e.target.value) || 0 })}
          />
        </FieldWrap>

        <FieldWrap label="Payment mode" htmlFor="mode" required>
          <Select id="mode" value={form.payment_mode} onChange={(e) => setForm({ ...form, payment_mode: e.target.value as PaymentMode })}>
            <option value="cash">Cash</option>
            <option value="bank_transfer">Bank Transfer</option>
            <option value="upi">UPI</option>
          </Select>
        </FieldWrap>

        {proofRequired && (
          <>
            <FieldWrap label="Transaction reference" htmlFor="ref" hint="Or upload a screenshot below">
              <Input id="ref" value={form.proof_reference ?? ""} onChange={(e) => setForm({ ...form, proof_reference: e.target.value })} />
            </FieldWrap>
            <FieldWrap label="Proof upload" htmlFor="file">
              <input id="file" type="file" accept="image/*,application/pdf" onChange={handleFile} className="text-sm" />
              {uploading && <p className="mt-1 text-xs text-ink-faint">Uploading…</p>}
              {form.proof_file_url && <p className="mt-1 text-xs font-semibold text-good">Uploaded ✓</p>}
            </FieldWrap>
          </>
        )}

        <div className="rounded-field bg-primary-soft p-3 text-sm font-bold text-primary">
          Net payable: {formatCurrency(payment.gross_wage_due - (form.advance_deduction_amount || 0))}
        </div>

        {error && <p className="rounded-field border border-orange/30 bg-orange-soft px-3 py-2 text-sm font-semibold text-orange">{error}</p>}

        <div className="flex justify-end gap-3">
          <Button type="button" variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" loading={markPaid.isPending}>
            Confirm Paid
          </Button>
        </div>
      </form>
    </Modal>
  );
}
