import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { invoicesApi, milestonesApi } from "@/lib/api/invoices";
import type {
  InvoiceCreate,
  InvoicePaymentCreate,
  InvoiceStatus,
  InvoiceUpdate,
  MilestoneCreate,
  MilestoneUpdate,
} from "@/lib/api/types";

export function useProjectMilestones(projectId: number | undefined) {
  return useQuery({
    queryKey: ["milestones", projectId],
    queryFn: () => milestonesApi.listForProject(projectId as number),
    enabled: Number.isFinite(projectId),
  });
}

export function useCreateMilestone(projectId: number) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload: MilestoneCreate) => milestonesApi.create(projectId, payload),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["milestones", projectId] }),
  });
}

export function useUpdateMilestone(projectId: number, id: number) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload: MilestoneUpdate) => milestonesApi.update(id, payload),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["milestones", projectId] }),
  });
}

export function useInvoices(filters?: { project_id?: number; status_filter?: InvoiceStatus }) {
  return useQuery({
    queryKey: ["invoices", filters],
    queryFn: () => invoicesApi.list(filters),
  });
}

export function useInvoice(id: number) {
  return useQuery({ queryKey: ["invoices", id], queryFn: () => invoicesApi.get(id), enabled: Number.isFinite(id) });
}

export function useCreateInvoice() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload: InvoiceCreate) => invoicesApi.create(payload),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["invoices"] });
      qc.invalidateQueries({ queryKey: ["milestones"] });
    },
  });
}

export function useUpdateInvoice(id: number) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload: InvoiceUpdate) => invoicesApi.update(id, payload),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["invoices"] });
      qc.invalidateQueries({ queryKey: ["invoices", id] });
    },
  });
}

export function useRecordInvoicePayment(id: number) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload: InvoicePaymentCreate) => invoicesApi.recordPayment(id, payload),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["invoices"] });
      qc.invalidateQueries({ queryKey: ["invoices", id] });
    },
  });
}
