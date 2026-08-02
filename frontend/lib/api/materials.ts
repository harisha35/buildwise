import { apiGet, apiPatch, apiPost } from "@/lib/api/client";
import type {
  MaterialCreate,
  MaterialExpenseCreate,
  MaterialExpenseOut,
  MaterialOut,
  MaterialStockBalanceOut,
  MaterialUpdate,
  StockMovementCreate,
  StockMovementOut,
  SupplierCreate,
  SupplierOut,
  SupplierUpdate,
  UnitOfMeasureCreate,
  UnitOfMeasureOut,
} from "@/lib/api/types";

export const unitsApi = {
  list: () => apiGet<UnitOfMeasureOut[]>("/units-of-measure"),
  create: (payload: UnitOfMeasureCreate) => apiPost<UnitOfMeasureOut>("/units-of-measure", payload),
};

export const suppliersApi = {
  list: () => apiGet<SupplierOut[]>("/suppliers"),
  create: (payload: SupplierCreate) => apiPost<SupplierOut>("/suppliers", payload),
  update: (id: number, payload: SupplierUpdate) => apiPatch<SupplierOut>(`/suppliers/${id}`, payload),
};

export const materialsApi = {
  list: () => apiGet<MaterialOut[]>("/materials"),
  get: (id: number) => apiGet<MaterialOut>(`/materials/${id}`),
  create: (payload: MaterialCreate) => apiPost<MaterialOut>("/materials", payload),
  update: (id: number, payload: MaterialUpdate) => apiPatch<MaterialOut>(`/materials/${id}`, payload),
};

export const stockApi = {
  balances: (projectId: number, materialId?: number) =>
    apiGet<MaterialStockBalanceOut[]>(
      `/stock?project_id=${projectId}${materialId ? `&material_id=${materialId}` : ""}`
    ),
  recordMovement: (payload: StockMovementCreate) => apiPost<StockMovementOut>("/stock/movements", payload),
};

export const materialExpensesApi = {
  list: (filters?: { project_id?: number; start_date?: string; end_date?: string }) => {
    const params = new URLSearchParams();
    if (filters?.project_id) params.set("project_id", String(filters.project_id));
    if (filters?.start_date) params.set("start_date", filters.start_date);
    if (filters?.end_date) params.set("end_date", filters.end_date);
    const qs = params.toString();
    return apiGet<MaterialExpenseOut[]>(`/material-expenses${qs ? `?${qs}` : ""}`);
  },
  create: (payload: MaterialExpenseCreate) => apiPost<MaterialExpenseOut>("/material-expenses", payload),
};
