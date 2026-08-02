import { apiGet } from "@/lib/api/client";
import type { InvoiceReportOut, InvoiceStatus, ProfitabilityReportOut } from "@/lib/api/types";

export interface ReportFilters {
  project_id?: number;
  start_date?: string;
  end_date?: string;
}

function toQuery(filters?: ReportFilters & { status_filter?: InvoiceStatus }) {
  const params = new URLSearchParams();
  if (filters?.project_id) params.set("project_id", String(filters.project_id));
  if (filters?.start_date) params.set("start_date", filters.start_date);
  if (filters?.end_date) params.set("end_date", filters.end_date);
  if (filters?.status_filter) params.set("status_filter", filters.status_filter);
  const qs = params.toString();
  return qs ? `?${qs}` : "";
}

export const reportsApi = {
  profitability: (filters?: ReportFilters) =>
    apiGet<ProfitabilityReportOut>(`/reports/profitability${toQuery(filters)}`),
  invoices: (filters?: ReportFilters & { status_filter?: InvoiceStatus }) =>
    apiGet<InvoiceReportOut>(`/reports/invoices${toQuery(filters)}`),
};
