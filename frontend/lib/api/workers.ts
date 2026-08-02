import { apiGet, apiPatch, apiPost } from "@/lib/api/client";
import type {
  ProjectWorkerAssignmentOut,
  WorkerCreate,
  WorkerLedgerOut,
  WorkerOut,
  WorkerTypeOut,
  WorkerUpdate,
} from "@/lib/api/types";

export const workersApi = {
  list: () => apiGet<WorkerOut[]>("/workers"),
  get: (id: number) => apiGet<WorkerOut>(`/workers/${id}`),
  create: (payload: WorkerCreate) => apiPost<WorkerOut>("/workers", payload),
  update: (id: number, payload: WorkerUpdate) => apiPatch<WorkerOut>(`/workers/${id}`, payload),
  deactivate: (id: number) => apiPost<WorkerOut>(`/workers/${id}/deactivate`),
  assignToProject: (id: number, payload: { project_id: number; custom_rate_override?: number | null; ot_rate_override?: number | null }) =>
    apiPost<ProjectWorkerAssignmentOut>(`/workers/${id}/project-assignments`, payload),
  ledger: (id: number) => apiGet<WorkerLedgerOut>(`/workers/${id}/ledger`),
};

export const workerTypesApi = {
  list: () => apiGet<WorkerTypeOut[]>("/worker-types"),
  create: (payload: { name: string; default_daily_rate?: number | null; default_ot_rate?: number | null }) =>
    apiPost<WorkerTypeOut>("/worker-types", payload),
};
