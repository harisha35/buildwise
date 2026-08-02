import { useQuery } from "@tanstack/react-query";

import { reportsApi, type ReportFilters } from "@/lib/api/reports";
import type { InvoiceStatus, PaymentStatus } from "@/lib/api/types";

interface QueryOptions {
  enabled?: boolean;
}

export function useProfitabilityReport(filters?: ReportFilters, options?: QueryOptions) {
  return useQuery({
    queryKey: ["reports", "profitability", filters],
    queryFn: () => reportsApi.profitability(filters),
    enabled: options?.enabled,
  });
}

export function useInvoiceReport(
  filters?: ReportFilters & { status_filter?: InvoiceStatus },
  options?: QueryOptions
) {
  return useQuery({
    queryKey: ["reports", "invoices", filters],
    queryFn: () => reportsApi.invoices(filters),
    enabled: options?.enabled,
  });
}

export function useAttendanceSummaryReport(filters?: ReportFilters, options?: QueryOptions) {
  return useQuery({
    queryKey: ["reports", "attendance", filters],
    queryFn: () => reportsApi.attendance(filters),
    enabled: options?.enabled,
  });
}

export function usePaymentDuesReport(
  filters?: ReportFilters & { status_filter?: PaymentStatus },
  options?: QueryOptions
) {
  return useQuery({
    queryKey: ["reports", "payments", filters],
    queryFn: () => reportsApi.payments(filters),
    enabled: options?.enabled,
  });
}

export function useMaterialExpenseReport(filters?: ReportFilters, options?: QueryOptions) {
  return useQuery({
    queryKey: ["reports", "materials", filters],
    queryFn: () => reportsApi.materials(filters),
    enabled: options?.enabled,
  });
}
