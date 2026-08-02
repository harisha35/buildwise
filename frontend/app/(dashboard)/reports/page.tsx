"use client";

import { useMemo, useState } from "react";

import { useToast } from "@/components/providers/toast-provider";
import { Badge, type BadgeTone } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardBody } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { IconDownload } from "@/components/ui/icons";
import { Select } from "@/components/ui/field";
import { PageSpinner } from "@/components/ui/spinner";
import { StatCard } from "@/components/ui/stat-card";
import { reportsApi, type ReportKey } from "@/lib/api/reports";
import type { InvoiceStatus, PaymentStatus } from "@/lib/api/types";
import { useAuth } from "@/lib/auth/context";
import { useProjects } from "@/lib/hooks/use-projects";
import {
  useAttendanceSummaryReport,
  useInvoiceReport,
  useMaterialExpenseReport,
  usePaymentDuesReport,
  useProfitabilityReport,
} from "@/lib/hooks/use-reports";
import { errorMessage, formatCurrency, formatDate, labelize } from "@/lib/utils";

const INVOICE_STATUS_TONE: Record<InvoiceStatus, BadgeTone> = {
  unpaid: "neutral",
  partially_paid: "purple",
  paid: "good",
  overdue: "orange",
};

const REPORT_TABS: { key: ReportKey; label: string }[] = [
  { key: "invoices", label: "Invoices & Payments" },
  { key: "profitability", label: "Profitability" },
  { key: "attendance", label: "Attendance Summary" },
  { key: "payments", label: "Payment Dues & History" },
  { key: "materials", label: "Material Expense" },
];

export default function ReportsPage() {
  const { can } = useAuth();
  const toast = useToast();
  const { data: projects } = useProjects();

  const [activeReport, setActiveReport] = useState<ReportKey>("invoices");
  const [projectFilter, setProjectFilter] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [invoiceStatusFilter, setInvoiceStatusFilter] = useState<InvoiceStatus | "">("");
  const [paymentStatusFilter, setPaymentStatusFilter] = useState<PaymentStatus | "">("");
  const [downloading, setDownloading] = useState(false);

  const filters = useMemo(
    () => ({
      project_id: projectFilter ? Number(projectFilter) : undefined,
      start_date: startDate || undefined,
      end_date: endDate || undefined,
    }),
    [projectFilter, startDate, endDate]
  );

  const invoiceQuery = useInvoiceReport(
    { ...filters, status_filter: invoiceStatusFilter || undefined },
    { enabled: activeReport === "invoices" }
  );
  const profitabilityQuery = useProfitabilityReport(filters, { enabled: activeReport === "profitability" });
  const attendanceQuery = useAttendanceSummaryReport(filters, { enabled: activeReport === "attendance" });
  const paymentsQuery = usePaymentDuesReport(
    { ...filters, status_filter: paymentStatusFilter || undefined },
    { enabled: activeReport === "payments" }
  );
  const materialsQuery = useMaterialExpenseReport(filters, { enabled: activeReport === "materials" });

  if (!can("reports:read")) {
    return <EmptyState title="No access" description="You don't have permission to view reports." />;
  }

  async function handleExport() {
    setDownloading(true);
    try {
      const statusFilter =
        activeReport === "invoices" ? invoiceStatusFilter || undefined
        : activeReport === "payments" ? paymentStatusFilter || undefined
        : undefined;
      await reportsApi.downloadCsv(activeReport, { ...filters, status_filter: statusFilter });
    } catch (err) {
      toast.error(errorMessage(err));
    } finally {
      setDownloading(false);
    }
  }

  return (
    <div className="flex flex-col gap-5">
      <div>
        <h2 className="text-2xl font-extrabold text-ink">Reports</h2>
        <p className="mt-1 text-sm text-ink-soft">Attendance, payments, materials, invoices, and profitability — filterable, exportable to CSV.</p>
      </div>

      <div className="flex flex-wrap gap-2">
        {REPORT_TABS.map((tab) => (
          <button
            key={tab.key}
            type="button"
            onClick={() => setActiveReport(tab.key)}
            className={
              activeReport === tab.key
                ? "rounded-field bg-primary px-3.5 py-2 text-sm font-bold text-white"
                : "rounded-field border border-border bg-card px-3.5 py-2 text-sm font-semibold text-ink-soft hover:text-ink"
            }
          >
            {tab.label}
          </button>
        ))}
      </div>

      <Card>
        <CardBody className="flex flex-wrap items-end gap-4">
          <div className="sm:w-56">
            <label className="field-label">Project</label>
            <Select value={projectFilter} onChange={(e) => setProjectFilter(e.target.value)}>
              <option value="">All projects</option>
              {projects?.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </Select>
          </div>
          <div className="sm:w-44">
            <label className="field-label">From</label>
            <input type="date" className="field-input" value={startDate} onChange={(e) => setStartDate(e.target.value)} />
          </div>
          <div className="sm:w-44">
            <label className="field-label">To</label>
            <input type="date" className="field-input" value={endDate} onChange={(e) => setEndDate(e.target.value)} />
          </div>
          {activeReport === "invoices" && (
            <div className="sm:w-44">
              <label className="field-label">Invoice status</label>
              <Select value={invoiceStatusFilter} onChange={(e) => setInvoiceStatusFilter(e.target.value as InvoiceStatus | "")}>
                <option value="">All statuses</option>
                <option value="unpaid">Unpaid</option>
                <option value="partially_paid">Partially Paid</option>
                <option value="paid">Paid</option>
                <option value="overdue">Overdue</option>
              </Select>
            </div>
          )}
          {activeReport === "payments" && (
            <div className="sm:w-44">
              <label className="field-label">Payment status</label>
              <Select value={paymentStatusFilter} onChange={(e) => setPaymentStatusFilter(e.target.value as PaymentStatus | "")}>
                <option value="">All statuses</option>
                <option value="due">Due</option>
                <option value="paid">Paid</option>
              </Select>
            </div>
          )}
          <Button variant="outline" className="ml-auto" onClick={handleExport} loading={downloading}>
            <IconDownload className="h-4 w-4" />
            Export CSV
          </Button>
        </CardBody>
      </Card>

      {activeReport === "invoices" && (
        <InvoiceReportSection isLoading={invoiceQuery.isLoading} data={invoiceQuery.data} />
      )}
      {activeReport === "profitability" && (
        <ProfitabilityReportSection isLoading={profitabilityQuery.isLoading} data={profitabilityQuery.data} />
      )}
      {activeReport === "attendance" && (
        <AttendanceReportSection isLoading={attendanceQuery.isLoading} data={attendanceQuery.data} />
      )}
      {activeReport === "payments" && (
        <PaymentDuesReportSection isLoading={paymentsQuery.isLoading} data={paymentsQuery.data} />
      )}
      {activeReport === "materials" && (
        <MaterialExpenseReportSection isLoading={materialsQuery.isLoading} data={materialsQuery.data} />
      )}
    </div>
  );
}

function InvoiceReportSection({
  isLoading,
  data,
}: {
  isLoading: boolean;
  data: ReturnType<typeof useInvoiceReport>["data"];
}) {
  if (isLoading) return <PageSpinner />;
  if (!data) return null;
  return (
    <section className="flex flex-col gap-4">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Total Invoiced" value={formatCurrency(data.total_invoiced)} tone="primary" />
        <StatCard label="Total Received" value={formatCurrency(data.total_received)} tone="good" />
        <StatCard label="Total Outstanding" value={formatCurrency(data.total_outstanding)} tone="orange" />
        <StatCard
          label="Overdue Invoices"
          value={String(data.overdue_count)}
          hint={`${data.unpaid_count} unpaid · ${data.partially_paid_count} partial · ${data.paid_count} paid`}
          tone="purple"
        />
      </div>
      <Card>
        <CardBody>
          {data.rows.length === 0 ? (
            <EmptyState title="No invoices in this range" description="Adjust the filters above to widen the search." />
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[760px] text-sm">
                <thead>
                  <tr className="border-b border-border text-left text-xs font-bold uppercase tracking-wide text-ink-faint">
                    <th className="py-2.5 pr-4">Project</th>
                    <th className="py-2.5 pr-4">Client</th>
                    <th className="py-2.5 pr-4">Invoice Date</th>
                    <th className="py-2.5 pr-4">Total</th>
                    <th className="py-2.5 pr-4">Received</th>
                    <th className="py-2.5 pr-4">Outstanding</th>
                    <th className="py-2.5">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {data.rows.map((row) => (
                    <tr key={row.invoice_id} className="border-b border-border last:border-0">
                      <td className="py-2.5 pr-4 font-semibold text-ink">{row.project_name}</td>
                      <td className="py-2.5 pr-4 text-ink-soft">{row.client_name}</td>
                      <td className="py-2.5 pr-4 text-ink-soft">{formatDate(row.invoice_date)}</td>
                      <td className="tabular py-2.5 pr-4 text-ink">{formatCurrency(row.total_amount)}</td>
                      <td className="tabular py-2.5 pr-4 text-good">{formatCurrency(row.amount_received)}</td>
                      <td className="tabular py-2.5 pr-4 text-ink">{formatCurrency(row.amount_outstanding)}</td>
                      <td className="py-2.5">
                        <Badge tone={INVOICE_STATUS_TONE[row.status]}>{labelize(row.status)}</Badge>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardBody>
      </Card>
    </section>
  );
}

function ProfitabilityReportSection({
  isLoading,
  data,
}: {
  isLoading: boolean;
  data: ReturnType<typeof useProfitabilityReport>["data"];
}) {
  if (isLoading) return <PageSpinner />;
  if (!data) return null;
  return (
    <section className="flex flex-col gap-4">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Amount Received" value={formatCurrency(data.total_amount_received)} tone="good" />
        <StatCard label="Labour Cost" value={formatCurrency(data.total_labour_cost)} tone="orange" />
        <StatCard label="Material Cost" value={formatCurrency(data.total_material_cost)} tone="purple" />
        <StatCard label="Net Profit" value={formatCurrency(data.total_profit)} tone="primary" />
      </div>
      <Card>
        <CardBody>
          {data.rows.length === 0 ? (
            <EmptyState title="No data in this range" description="Adjust the filters above to widen the search." />
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[640px] text-sm">
                <thead>
                  <tr className="border-b border-border text-left text-xs font-bold uppercase tracking-wide text-ink-faint">
                    <th className="py-2.5 pr-4">Project</th>
                    <th className="py-2.5 pr-4">Received</th>
                    <th className="py-2.5 pr-4">Labour Cost</th>
                    <th className="py-2.5 pr-4">Material Cost</th>
                    <th className="py-2.5">Profit</th>
                  </tr>
                </thead>
                <tbody>
                  {data.rows.map((row) => (
                    <tr key={row.project_id} className="border-b border-border last:border-0">
                      <td className="py-2.5 pr-4 font-semibold text-ink">{row.project_name}</td>
                      <td className="tabular py-2.5 pr-4 text-good">{formatCurrency(row.amount_received)}</td>
                      <td className="tabular py-2.5 pr-4 text-ink-soft">{formatCurrency(row.labour_cost)}</td>
                      <td className="tabular py-2.5 pr-4 text-ink-soft">{formatCurrency(row.material_cost)}</td>
                      <td className={`tabular py-2.5 font-bold ${row.profit >= 0 ? "text-good" : "text-orange"}`}>
                        {formatCurrency(row.profit)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardBody>
      </Card>
    </section>
  );
}

function AttendanceReportSection({
  isLoading,
  data,
}: {
  isLoading: boolean;
  data: ReturnType<typeof useAttendanceSummaryReport>["data"];
}) {
  if (isLoading) return <PageSpinner />;
  if (!data) return null;
  return (
    <section className="flex flex-col gap-4">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Days Present" value={data.total_days_present.toFixed(1)} tone="good" />
        <StatCard label="Days Absent" value={data.total_days_absent.toFixed(1)} tone="orange" />
        <StatCard label="Half Days" value={data.total_days_half_day.toFixed(1)} tone="purple" />
        <StatCard label="OT Hours" value={data.total_ot_hours.toFixed(1)} tone="primary" />
      </div>
      <Card>
        <CardBody>
          {data.rows.length === 0 ? (
            <EmptyState title="No attendance in this range" description="Adjust the filters above to widen the search." />
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[640px] text-sm">
                <thead>
                  <tr className="border-b border-border text-left text-xs font-bold uppercase tracking-wide text-ink-faint">
                    <th className="py-2.5 pr-4">Worker</th>
                    <th className="py-2.5 pr-4">Project</th>
                    <th className="py-2.5 pr-4">Present</th>
                    <th className="py-2.5 pr-4">Absent</th>
                    <th className="py-2.5 pr-4">Half Day</th>
                    <th className="py-2.5">OT Hours</th>
                  </tr>
                </thead>
                <tbody>
                  {data.rows.map((row) => (
                    <tr key={`${row.worker_id}-${row.project_id}`} className="border-b border-border last:border-0">
                      <td className="py-2.5 pr-4 font-semibold text-ink">{row.worker_name}</td>
                      <td className="py-2.5 pr-4 text-ink-soft">{row.project_name}</td>
                      <td className="tabular py-2.5 pr-4 text-good">{row.days_present}</td>
                      <td className="tabular py-2.5 pr-4 text-orange">{row.days_absent}</td>
                      <td className="tabular py-2.5 pr-4 text-ink-soft">{row.days_half_day}</td>
                      <td className="tabular py-2.5 text-ink">{row.ot_hours}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardBody>
      </Card>
    </section>
  );
}

function PaymentDuesReportSection({
  isLoading,
  data,
}: {
  isLoading: boolean;
  data: ReturnType<typeof usePaymentDuesReport>["data"];
}) {
  if (isLoading) return <PageSpinner />;
  if (!data) return null;
  return (
    <section className="flex flex-col gap-4">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Gross Wage Due" value={formatCurrency(data.total_gross_wage_due)} tone="orange" />
        <StatCard label="Net Paid" value={formatCurrency(data.total_net_paid)} tone="good" />
        <StatCard label="Due" value={String(data.due_count)} tone="purple" />
        <StatCard label="Paid" value={String(data.paid_count)} tone="primary" />
      </div>
      <Card>
        <CardBody>
          {data.rows.length === 0 ? (
            <EmptyState title="No payments in this range" description="Adjust the filters above to widen the search." />
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[760px] text-sm">
                <thead>
                  <tr className="border-b border-border text-left text-xs font-bold uppercase tracking-wide text-ink-faint">
                    <th className="py-2.5 pr-4">Worker</th>
                    <th className="py-2.5 pr-4">Week</th>
                    <th className="py-2.5 pr-4">Gross Due</th>
                    <th className="py-2.5 pr-4">Advance Deducted</th>
                    <th className="py-2.5 pr-4">Net Paid</th>
                    <th className="py-2.5 pr-4">Mode</th>
                    <th className="py-2.5">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {data.rows.map((row) => (
                    <tr key={row.payment_id} className="border-b border-border last:border-0">
                      <td className="py-2.5 pr-4 font-semibold text-ink">{row.worker_name}</td>
                      <td className="py-2.5 pr-4 text-ink-soft">
                        {formatDate(row.week_start)} – {formatDate(row.week_end)}
                      </td>
                      <td className="tabular py-2.5 pr-4 text-ink">{formatCurrency(row.gross_wage_due)}</td>
                      <td className="tabular py-2.5 pr-4 text-ink-soft">{formatCurrency(row.advance_deducted)}</td>
                      <td className="tabular py-2.5 pr-4 text-good">{row.net_paid != null ? formatCurrency(row.net_paid) : "—"}</td>
                      <td className="py-2.5 pr-4 text-ink-soft">{row.payment_mode ? labelize(row.payment_mode) : "—"}</td>
                      <td className="py-2.5">
                        <Badge tone={row.status === "paid" ? "good" : "orange"}>{labelize(row.status)}</Badge>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardBody>
      </Card>
    </section>
  );
}

function MaterialExpenseReportSection({
  isLoading,
  data,
}: {
  isLoading: boolean;
  data: ReturnType<typeof useMaterialExpenseReport>["data"];
}) {
  if (isLoading) return <PageSpinner />;
  if (!data) return null;
  return (
    <section className="flex flex-col gap-4">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <StatCard label="Stock-In Cost" value={formatCurrency(data.total_stock_in_cost)} tone="primary" />
        <StatCard label="Direct Expenses" value={formatCurrency(data.total_direct_expense_amount)} tone="purple" />
        <StatCard label="Total Material Cost" value={formatCurrency(data.total_cost)} tone="orange" />
      </div>
      <Card>
        <CardBody>
          {data.rows.length === 0 ? (
            <EmptyState title="No material spend in this range" description="Adjust the filters above to widen the search." />
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[680px] text-sm">
                <thead>
                  <tr className="border-b border-border text-left text-xs font-bold uppercase tracking-wide text-ink-faint">
                    <th className="py-2.5 pr-4">Project</th>
                    <th className="py-2.5 pr-4">Material</th>
                    <th className="py-2.5 pr-4">Category</th>
                    <th className="py-2.5 pr-4">Stock-In Cost</th>
                    <th className="py-2.5 pr-4">Direct Expenses</th>
                    <th className="py-2.5">Total</th>
                  </tr>
                </thead>
                <tbody>
                  {data.rows.map((row, idx) => (
                    <tr key={`${row.project_id}-${row.material_id ?? "none"}-${idx}`} className="border-b border-border last:border-0">
                      <td className="py-2.5 pr-4 font-semibold text-ink">{row.project_name}</td>
                      <td className="py-2.5 pr-4 text-ink-soft">{row.material_name}</td>
                      <td className="py-2.5 pr-4 text-ink-soft">{row.category ?? "—"}</td>
                      <td className="tabular py-2.5 pr-4 text-ink-soft">{formatCurrency(row.stock_in_cost)}</td>
                      <td className="tabular py-2.5 pr-4 text-ink-soft">{formatCurrency(row.direct_expense_amount)}</td>
                      <td className="tabular py-2.5 font-semibold text-ink">{formatCurrency(row.total_cost)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardBody>
      </Card>
    </section>
  );
}
