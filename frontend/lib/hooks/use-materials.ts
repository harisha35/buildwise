import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { materialExpensesApi, materialsApi, stockApi, suppliersApi, unitsApi } from "@/lib/api/materials";
import type {
  MaterialCreate,
  MaterialExpenseCreate,
  MaterialUpdate,
  StockMovementCreate,
  SupplierCreate,
  SupplierUpdate,
  UnitOfMeasureCreate,
} from "@/lib/api/types";

export function useUnits() {
  return useQuery({ queryKey: ["units"], queryFn: unitsApi.list });
}

export function useCreateUnit() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload: UnitOfMeasureCreate) => unitsApi.create(payload),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["units"] }),
  });
}

export function useSuppliers() {
  return useQuery({ queryKey: ["suppliers"], queryFn: suppliersApi.list });
}

export function useCreateSupplier() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload: SupplierCreate) => suppliersApi.create(payload),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["suppliers"] }),
  });
}

export function useUpdateSupplier(id: number) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload: SupplierUpdate) => suppliersApi.update(id, payload),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["suppliers"] }),
  });
}

export function useMaterials() {
  return useQuery({ queryKey: ["materials"], queryFn: materialsApi.list });
}

export function useCreateMaterial() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload: MaterialCreate) => materialsApi.create(payload),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["materials"] }),
  });
}

export function useUpdateMaterial(id: number) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload: MaterialUpdate) => materialsApi.update(id, payload),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["materials"] }),
  });
}

export function useStockBalances(projectId: number | undefined) {
  return useQuery({
    queryKey: ["stock", "balances", projectId],
    queryFn: () => stockApi.balances(projectId as number),
    enabled: Number.isFinite(projectId),
  });
}

export function useRecordStockMovement() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload: StockMovementCreate) => stockApi.recordMovement(payload),
    onSuccess: (_data, variables) => {
      qc.invalidateQueries({ queryKey: ["stock", "balances", variables.project_id] });
      qc.invalidateQueries({ queryKey: ["dashboard", "summary"] });
    },
  });
}

export function useMaterialExpenses(filters?: { project_id?: number; start_date?: string; end_date?: string }) {
  return useQuery({
    queryKey: ["material-expenses", filters],
    queryFn: () => materialExpensesApi.list(filters),
  });
}

export function useCreateMaterialExpense() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload: MaterialExpenseCreate) => materialExpensesApi.create(payload),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["material-expenses"] });
      qc.invalidateQueries({ queryKey: ["dashboard", "summary"] });
    },
  });
}
