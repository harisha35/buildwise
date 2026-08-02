import { apiGet } from "@/lib/api/client";
import type { DashboardSummary } from "@/lib/api/types";

export const dashboardApi = {
  summary: () => apiGet<DashboardSummary>("/dashboard/summary"),
};
