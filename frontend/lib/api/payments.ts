import { apiGet, apiPost } from "@/lib/api/client";
import type { MarkPaidRequest, WorkerAdvanceCreate, WorkerAdvanceOut, WorkerPaymentOut } from "@/lib/api/types";

export const paymentsApi = {
  due: (weekStart: string) => apiGet<WorkerPaymentOut[]>(`/payments/due?week_start=${weekStart}`),
  list: (workerId?: number) =>
    apiGet<WorkerPaymentOut[]>(`/payments${workerId ? `?worker_id=${workerId}` : ""}`),
  markPaid: (id: number, payload: MarkPaidRequest) =>
    apiPost<WorkerPaymentOut>(`/payments/${id}/mark-paid`, payload),
  runWeeklyJob: (weekStart: string) =>
    apiPost<WorkerPaymentOut[]>(`/admin/jobs/run-weekly-payments?week_start=${weekStart}`),
};

export const advancesApi = {
  list: (workerId: number) => apiGet<WorkerAdvanceOut[]>(`/workers/${workerId}/advances`),
  create: (workerId: number, payload: WorkerAdvanceCreate) =>
    apiPost<WorkerAdvanceOut>(`/workers/${workerId}/advances`, payload),
};
