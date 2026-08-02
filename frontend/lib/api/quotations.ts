import { apiDownloadFile, apiGet, apiPatch, apiPost } from "@/lib/api/client";
import type { QuotationCreate, QuotationOut, QuotationStatus, QuotationUpdate } from "@/lib/api/types";

export const quotationsApi = {
  list: (statusFilter?: QuotationStatus) =>
    apiGet<QuotationOut[]>(`/quotations${statusFilter ? `?status_filter=${statusFilter}` : ""}`),
  get: (id: number) => apiGet<QuotationOut>(`/quotations/${id}`),
  create: (payload: QuotationCreate) => apiPost<QuotationOut>("/quotations", payload),
  update: (id: number, payload: QuotationUpdate) => apiPatch<QuotationOut>(`/quotations/${id}`, payload),
  downloadPdf: (id: number) => apiDownloadFile(`/quotations/${id}/pdf`, `quotation-${id}.pdf`),
};
