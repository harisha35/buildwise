import { apiDownloadFile, apiGet } from "@/lib/api/client";
import type {
  AttendanceSummaryReportOut,
  InvoiceReportOut,
  InvoiceStatus,
  MaterialExpenseReportOut,
  PaymentDuesReportOut,
  PaymentStatus,
  ProfitabilityReportOut,
} from "@/lib/api/types";

export interface ReportFilters {
  project_id?: number;
  start_date?: string;
  end_date?: string;
}

export type ReportKey = "profitability" | "invoices" | "attendance" | "payments" | "materials";

const REPORT_PATH: Record<ReportKey, string> = {
  profitability: "/reports/profitability",
  invoices: "/reports/invoices",
  attendance: "/reports/attendance",
  payments: "/reports/payments",
  materials: "/reports/materials",
};

const REPORT_FILENAME: Record<ReportKey, string> = {
  profitability: "profitability-report.csv",
  invoices: "invoice-report.csv",
  attendance: "attendance-summary-report.csv",
  payments: "payment-dues-report.csv",
  materials: "material-expense-report.csv",
};

function toQuery(filters?: ReportFilters & { status_filter?: string; format?: "csv" }) {
  const params = new URLSearchParams();
  if (filters?.project_id) params.set("project_id", String(filters.project_id));
  if (filters?.start_date) params.set("start_date", filters.start_date);
  if (filters?.end_date) params.set("end_date", filters.end_date);
  if (filters?.status_filter) params.set("status_filter", filters.status_filter);
  if (filters?.format) params.set("format", filters.format);
  const qs = params.toString();
  return qs ? `?${qs}` : "";
}

export const reportsApi = {
  profitability: (filters?: ReportFilters) =>
    apiGet<ProfitabilityReportOut>(`${REPORT_PATH.profitability}${toQuery(filters)}`),
  invoices: (filters?: ReportFilters & { status_filter?: InvoiceStatus }) =>
    apiGet<InvoiceReportOut>(`${REPORT_PATH.invoices}${toQuery(filters)}`),
  attendance: (filters?: ReportFilters) =>
    apiGet<AttendanceSummaryReportOut>(`${REPORT_PATH.attendance}${toQuery(filters)}`),
  payments: (filters?: ReportFilters & { status_filter?: PaymentStatus }) =>
    apiGet<PaymentDuesReportOut>(`${REPORT_PATH.payments}${toQuery(filters)}`),
  materials: (filters?: ReportFilters) =>
    apiGet<MaterialExpenseReportOut>(`${REPORT_PATH.materials}${toQuery(filters)}`),
  downloadCsv: (report: ReportKey, filters?: ReportFilters & { status_filter?: string }) =>
    apiDownloadFile(
      `${REPORT_PATH[report]}${toQuery({ ...filters, format: "csv" })}`,
      REPORT_FILENAME[report]
    ),
};
