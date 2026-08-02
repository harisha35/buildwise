import { apiDownloadFile, apiGet, apiPatch, apiPost } from "@/lib/api/client";
import type {
  InvoiceCreate,
  InvoiceOut,
  InvoicePaymentCreate,
  InvoiceStatus,
  InvoiceUpdate,
  MilestoneCreate,
  MilestoneOut,
  MilestoneUpdate,
} from "@/lib/api/types";

export const milestonesApi = {
  listForProject: (projectId: number) => apiGet<MilestoneOut[]>(`/projects/${projectId}/milestones`),
  create: (projectId: number, payload: MilestoneCreate) =>
    apiPost<MilestoneOut>(`/projects/${projectId}/milestones`, payload),
  update: (id: number, payload: MilestoneUpdate) => apiPatch<MilestoneOut>(`/milestones/${id}`, payload),
};

export const invoicesApi = {
  list: (filters?: { project_id?: number; status_filter?: InvoiceStatus }) => {
    const params = new URLSearchParams();
    if (filters?.project_id) params.set("project_id", String(filters.project_id));
    if (filters?.status_filter) params.set("status_filter", filters.status_filter);
    const qs = params.toString();
    return apiGet<InvoiceOut[]>(`/invoices${qs ? `?${qs}` : ""}`);
  },
  get: (id: number) => apiGet<InvoiceOut>(`/invoices/${id}`),
  create: (payload: InvoiceCreate) => apiPost<InvoiceOut>("/invoices", payload),
  update: (id: number, payload: InvoiceUpdate) => apiPatch<InvoiceOut>(`/invoices/${id}`, payload),
  recordPayment: (id: number, payload: InvoicePaymentCreate) =>
    apiPost<InvoiceOut>(`/invoices/${id}/payments`, payload),
  downloadPdf: (id: number) => apiDownloadFile(`/invoices/${id}/pdf`, `invoice-${id}.pdf`),
};
