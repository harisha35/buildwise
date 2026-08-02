import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { workerTypesApi, workersApi } from "@/lib/api/workers";
import type { WorkerCreate, WorkerUpdate } from "@/lib/api/types";

export function useWorkers() {
  return useQuery({ queryKey: ["workers"], queryFn: workersApi.list });
}

export function useWorker(id: number) {
  return useQuery({ queryKey: ["workers", id], queryFn: () => workersApi.get(id), enabled: Number.isFinite(id) });
}

export function useCreateWorker() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload: WorkerCreate) => workersApi.create(payload),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["workers"] }),
  });
}

export function useUpdateWorker(id: number) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload: WorkerUpdate) => workersApi.update(id, payload),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["workers"] });
      qc.invalidateQueries({ queryKey: ["workers", id] });
    },
  });
}

export function useDeactivateWorker() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => workersApi.deactivate(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["workers"] }),
  });
}

export function useAssignWorkerToProject(workerId: number) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload: { project_id: number; custom_rate_override?: number | null; ot_rate_override?: number | null }) =>
      workersApi.assignToProject(workerId, payload),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["workers", workerId] }),
  });
}

export function useWorkerLedger(id: number) {
  return useQuery({ queryKey: ["workers", id, "ledger"], queryFn: () => workersApi.ledger(id), enabled: Number.isFinite(id) });
}

export function useWorkerTypes() {
  return useQuery({ queryKey: ["worker-types"], queryFn: workerTypesApi.list });
}

export function useCreateWorkerType() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload: { name: string; default_daily_rate?: number | null; default_ot_rate?: number | null }) =>
      workerTypesApi.create(payload),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["worker-types"] }),
  });
}
