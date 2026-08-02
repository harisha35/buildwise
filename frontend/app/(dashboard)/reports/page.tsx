"use client";

import { useMemo, useState } from "react";

import { Badge, type BadgeTone } from "@/components/ui/badge";
import { Card, CardBody, CardHeader, CardTitle } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { Select } from "@/components/ui/field";
import { PageSpinner } from "@/components/ui/spinner";
import { StatCard } from "@/components/ui/stat-card";
import type { InvoiceStatus } from "@/lib/api/types";
import { useAuth } from "@/lib/auth/context";
import { useProjects } from "@/lib/hooks/use-projects";
import { useInvoiceReport, useProfitabilityReport } from "@/lib/hooks/use-reports";
import { formatCurrency, labelize } from "@/lib/utils";

const STATUS_TONE: Record<InvoiceStatus, BadgeTone> = {
  unpaid: "neutral",
  partially_paid: "purple",
  paid: "good",
  overdue: "orange",
};

export default function ReportsPage() {
  const { can } = useAuth();
  const { data: projects } = useProjects();
  const [projectFilter, setProjectFilter] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [statusFilter, setStatusFilter] = useState<InvoiceStatus | "">("");

  const filters = useMemo(
    () => ({
      project_id: projectFilter ? Number(projectFilter) : undefined,
      start_date: startDate || undefined,
      end_date: endDate || undefined,
    }),
    [projectFilter, startDate, endDate]
  );

  const { data: invoiceReport, isLoading: invoiceLoading } = useInvoiceReport({ ...filters, status_filter: statusFilter || undefined });
  const { data: profitabilityReport, isLoading: profitabilityLoading } = useProfitabilityReport(filters);

  if (!can("reports:read")) {
    return <EmptyState title="No access" description="You don't have permission to view reports." />;
  }

  return (
    <div className="flex flex-col gap-5">
      <div>
        <h2 className="text-2xl font-extrabold text-ink">Reports</h2>
        <p className="mt-1 text-sm text-ink-soft">Invoice & client payment status, and per-project profitability.</p>
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
          <div className="sm:w-44">
            <label className="field-label">Invoice status</label>
            <Select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value as InvoiceStatus | "")}>
              <option value="">All statuses</option>
              <option value="unpaid">Unpaid</option>
              <option value="partially_paid">Partially Paid</option>
              <option value="paid">Paid</option>
              <option value="overdue">Overdue</option>
            </Select>
          </div>
        </CardBody>
      </Card>

      <section className="flex flex-col gap-4">
        <h3 className="text-lg font-extrabold text-ink">Invoice & Client Payment Report</h3>
        {invoiceLoading && <PageSpinner />}
        {invoiceReport && (
          <>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <StatCard label="Total Invoiced" value={formatCurrency(invoiceReport.total_invoiced)} tone="primary" />
              <StatCard label="Total Received" value={formatCurrency(invoiceReport.total_received)} tone="good" />
              <StatCard label="Total Outstanding" value={formatCurrency(invoiceReport.total_outstanding)} tone="orange" />
              <StatCard
                label="Overdue Invoices"
                value={String(invoiceReport.overdue_count)}
                hint={`${invoiceReport.unpaid_count} unpaid · ${invoiceReport.partially_paid_count} partial · ${invoiceReport.paid_count} paid`}
                tone="purple"
              />
            </div>
            <Card>
              <CardBody>
                {invoiceReport.rows.length === 0 ? (
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
                        {invoiceReport.rows.map((row) => (
                          <tr key={row.invoice_id} className="border-b border-border last:border-0">
                            <td className="py-2.5 pr-4 font-semibold text-ink">{row.project_name}</td>
                            <td className="py-2.5 pr-4 text-ink-soft">{row.client_name}</td>
                            <td className="py-2.5 pr-4 text-ink-soft">{row.invoice_date}</td>
                            <td className="tabular py-2.5 pr-4 text-ink">{formatCurrency(row.total_amount)}</td>
                            <td className="tabular py-2.5 pr-4 text-good">{formatCurrency(row.amount_received)}</td>
                            <td className="tabular py-2.5 pr-4 text-ink">{formatCurrency(row.amount_outstanding)}</td>
                            <td className="py-2.5">
                              <Badge tone={STATUS_TONE[row.status]}>{labelize(row.status)}</Badge>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </CardBody>
            </Card>
          </>
        )}
      </section>

      <section className="flex flex-col gap-4">
        <h3 className="text-lg font-extrabold text-ink">Project Profitability</h3>
        {profitabilityLoading && <PageSpinner />}
        {profitabilityReport && (
          <>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <StatCard label="Amount Received" value={formatCurrency(profitabilityReport.total_amount_received)} tone="good" />
              <StatCard label="Labour Cost" value={formatCurrency(profitabilityReport.total_labour_cost)} tone="orange" />
              <StatCard label="Material Cost" value={formatCurrency(profitabilityReport.total_material_cost)} tone="purple" />
              <StatCard label="Net Profit" value={formatCurrency(profitabilityReport.total_profit)} tone="primary" />
            </div>
            <Card>
              <CardBody>
                {profitabilityReport.rows.length === 0 ? (
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
                        {profitabilityReport.rows.map((row) => (
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
          </>
        )}
      </section>
    </div>
  );
}
