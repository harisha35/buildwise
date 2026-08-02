import { useQuery } from "@tanstack/react-query";

import { reportsApi, type ReportFilters } from "@/lib/api/reports";
import type { InvoiceStatus } from "@/lib/api/types";

export function useProfitabilityReport(filters?: ReportFilters) {
  return useQuery({
    queryKey: ["reports", "profitability", filters],
    queryFn: () => reportsApi.profitability(filters),
  });
}

export function useInvoiceReport(filters?: ReportFilters & { status_filter?: InvoiceStatus }) {
  return useQuery({
    queryKey: ["reports", "invoices", filters],
    queryFn: () => reportsApi.invoices(filters),
  });
}
