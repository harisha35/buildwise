import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { advancesApi, paymentsApi } from "@/lib/api/payments";
import type { MarkPaidRequest, WorkerAdvanceCreate } from "@/lib/api/types";

export function usePaymentsDue(weekStart: string) {
  return useQuery({ queryKey: ["payments", "due", weekStart], queryFn: () => paymentsApi.due(weekStart) });
}

export function usePayments(workerId?: number) {
  return useQuery({ queryKey: ["payments", "history", workerId], queryFn: () => paymentsApi.list(workerId) });
}

export function useMarkPaid() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, payload }: { id: number; payload: MarkPaidRequest }) => paymentsApi.markPaid(id, payload),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["payments"] });
      qc.invalidateQueries({ queryKey: ["workers"] });
    },
  });
}

export function useRunWeeklyPayments() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (weekStart: string) => paymentsApi.runWeeklyJob(weekStart),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["payments"] }),
  });
}

export function useAdvances(workerId: number) {
  return useQuery({ queryKey: ["advances", workerId], queryFn: () => advancesApi.list(workerId), enabled: Number.isFinite(workerId) });
}

export function useCreateAdvance(workerId: number) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload: WorkerAdvanceCreate) => advancesApi.create(workerId, payload),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["advances", workerId] });
      qc.invalidateQueries({ queryKey: ["workers", workerId, "ledger"] });
    },
  });
}
