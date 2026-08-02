import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { quotationsApi } from "@/lib/api/quotations";
import type { QuotationCreate, QuotationStatus, QuotationUpdate } from "@/lib/api/types";

export function useQuotations(statusFilter?: QuotationStatus) {
  return useQuery({
    queryKey: ["quotations", statusFilter],
    queryFn: () => quotationsApi.list(statusFilter),
  });
}

export function useCreateQuotation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload: QuotationCreate) => quotationsApi.create(payload),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["quotations"] }),
  });
}

export function useUpdateQuotation(id: number) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload: QuotationUpdate) => quotationsApi.update(id, payload),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["quotations"] }),
  });
}
