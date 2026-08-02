"use client";

import { useEffect, useMemo, useState } from "react";

import { useToast } from "@/components/providers/toast-provider";
import { Button } from "@/components/ui/button";
import { Card, CardBody, CardHeader, CardTitle } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { FieldWrap, Input, Select, Textarea } from "@/components/ui/field";
import { IconPlus } from "@/components/ui/icons";
import { Modal } from "@/components/ui/modal";
import { PageSpinner } from "@/components/ui/spinner";
import type {
  MaterialCreate,
  MaterialExpenseCreate,
  MaterialOut,
  StockMovementType,
  SupplierCreate,
  SupplierOut,
} from "@/lib/api/types";
import { useAuth } from "@/lib/auth/context";
import {
  useCreateMaterial,
  useCreateMaterialExpense,
  useCreateSupplier,
  useMaterialExpenses,
  useMaterials,
  useRecordStockMovement,
  useStockBalances,
  useSuppliers,
  useUnits,
  useUpdateMaterial,
  useUpdateSupplier,
} from "@/lib/hooks/use-materials";
import { useProjects } from "@/lib/hooks/use-projects";
import { errorMessage, formatCurrency, formatDate, todayISO } from "@/lib/utils";

export default function MaterialsPage() {
  const { can } = useAuth();

  if (!can("materials:read")) {
    return <EmptyState title="No access" description="You don't have permission to view materials." />;
  }

  return (
    <div className="flex flex-col gap-5">
      <div>
        <h2 className="text-2xl font-extrabold text-ink">Materials & Stock</h2>
        <p className="mt-1 text-sm text-ink-soft">Masters, per-project stock movements, and direct material expenses.</p>
      </div>

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
        <MaterialsCard />
        <SuppliersCard />
      </div>

      <StockCard />
      <MaterialExpensesCard />
    </div>
  );
}

// ---------- Materials master ----------

const EMPTY_MATERIAL: MaterialCreate = {
  name: "",
  category: "",
  unit_id: null,
  default_supplier_id: null,
  default_unit_price: null,
};

function MaterialsCard() {
  const { can } = useAuth();
  const { data: materials, isLoading } = useMaterials();
  const { data: units } = useUnits();
  const { data: suppliers } = useSuppliers();
  const [editing, setEditing] = useState<MaterialOut | null>(null);
  const [open, setOpen] = useState(false);

  const unitLabel = (id: number | null) => units?.find((u) => u.id === id)?.label ?? "—";

  return (
    <Card>
      <CardHeader>
        <CardTitle>Materials</CardTitle>
        {can("materials:write") && (
          <Button size="sm" onClick={() => setOpen(true)}>
            <IconPlus className="h-4 w-4" /> Add Material
          </Button>
        )}
      </CardHeader>
      <CardBody>
        {isLoading && <PageSpinner />}
        {materials && materials.length === 0 && <EmptyState title="No materials yet" description="Add cement, steel, sand, etc. to start tracking stock." />}
        {materials && materials.length > 0 && (
          <ul className="flex flex-col gap-1.5">
            {materials.map((m) => (
              <li key={m.id} className="flex items-center justify-between gap-3 rounded-field bg-bg-alt px-3 py-2 text-sm">
                <div>
                  <span className="font-semibold text-ink">{m.name}</span>
                  <span className="ml-2 text-xs text-ink-faint">{m.category || "Uncategorized"} · {unitLabel(m.unit_id)}</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="tabular text-ink-faint">{m.default_unit_price ? formatCurrency(m.default_unit_price) : "—"}</span>
                  {can("materials:write") && (
                    <button type="button" className="text-xs font-bold text-primary hover:underline" onClick={() => setEditing(m)}>
                      Edit
                    </button>
                  )}
                </div>
              </li>
            ))}
          </ul>
        )}
      </CardBody>

      {(open || editing) && (
        <MaterialModal
          material={editing}
          units={units ?? []}
          suppliers={suppliers ?? []}
          onClose={() => {
            setOpen(false);
            setEditing(null);
          }}
        />
      )}
    </Card>
  );
}

function MaterialModal({
  material,
  units,
  suppliers,
  onClose,
}: {
  material: MaterialOut | null;
  units: { id: number; label: string }[];
  suppliers: SupplierOut[];
  onClose: () => void;
}) {
  const toast = useToast();
  const createMaterial = useCreateMaterial();
  const updateMaterial = useUpdateMaterial(material?.id ?? 0);
  const [form, setForm] = useState<MaterialCreate>(material ?? EMPTY_MATERIAL);
  const [error, setError] = useState<string | null>(null);
  const pending = createMaterial.isPending || updateMaterial.isPending;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    const payload = {
      ...form,
      category: form.category || null,
    };
    try {
      if (material) {
        await updateMaterial.mutateAsync(payload);
        toast.success(`${form.name} updated.`);
      } else {
        await createMaterial.mutateAsync(payload);
        toast.success(`${form.name} added.`);
      }
      onClose();
    } catch (err) {
      setError(errorMessage(err));
    }
  }

  return (
    <Modal open onClose={onClose} title={material ? "Edit Material" : "New Material"} width="md">
      <form className="flex flex-col gap-4" onSubmit={handleSubmit}>
        <FieldWrap label="Name" htmlFor="mat-name" required>
          <Input id="mat-name" required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
        </FieldWrap>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <FieldWrap label="Category" htmlFor="mat-category">
            <Input id="mat-category" placeholder="e.g. Cement" value={form.category ?? ""} onChange={(e) => setForm({ ...form, category: e.target.value })} />
          </FieldWrap>
          <FieldWrap label="Unit" htmlFor="mat-unit">
            <Select
              id="mat-unit"
              value={form.unit_id ?? ""}
              onChange={(e) => setForm({ ...form, unit_id: e.target.value ? Number(e.target.value) : null })}
            >
              <option value="">Unspecified</option>
              {units.map((u) => (
                <option key={u.id} value={u.id}>
                  {u.label}
                </option>
              ))}
            </Select>
          </FieldWrap>
        </div>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <FieldWrap label="Default supplier" htmlFor="mat-supplier">
            <Select
              id="mat-supplier"
              value={form.default_supplier_id ?? ""}
              onChange={(e) => setForm({ ...form, default_supplier_id: e.target.value ? Number(e.target.value) : null })}
            >
              <option value="">Unspecified</option>
              {suppliers.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </Select>
          </FieldWrap>
          <FieldWrap label="Default unit price (₹)" htmlFor="mat-price">
            <Input
              id="mat-price"
              type="number"
              min={0}
              value={form.default_unit_price ?? ""}
              onChange={(e) => setForm({ ...form, default_unit_price: e.target.value ? Number(e.target.value) : null })}
            />
          </FieldWrap>
        </div>

        {error && <p className="rounded-field border border-orange/30 bg-orange-soft px-3 py-2 text-sm font-semibold text-orange">{error}</p>}

        <div className="mt-1 flex justify-end gap-3">
          <Button type="button" variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" loading={pending}>
            {material ? "Save Changes" : "Add Material"}
          </Button>
        </div>
      </form>
    </Modal>
  );
}

// ---------- Suppliers master ----------

const EMPTY_SUPPLIER: SupplierCreate = { name: "", contact_person: "", phone: "", address: "", notes: "" };

function SuppliersCard() {
  const { can } = useAuth();
  const { data: suppliers, isLoading } = useSuppliers();
  const [editing, setEditing] = useState<SupplierOut | null>(null);
  const [open, setOpen] = useState(false);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Suppliers</CardTitle>
        {can("suppliers:write") && (
          <Button size="sm" onClick={() => setOpen(true)}>
            <IconPlus className="h-4 w-4" /> Add Supplier
          </Button>
        )}
      </CardHeader>
      <CardBody>
        {isLoading && <PageSpinner />}
        {suppliers && suppliers.length === 0 && <EmptyState title="No suppliers yet" description="Add suppliers to reference on stock-in and expenses." />}
        {suppliers && suppliers.length > 0 && (
          <ul className="flex flex-col gap-1.5">
            {suppliers.map((s) => (
              <li key={s.id} className="flex items-center justify-between gap-3 rounded-field bg-bg-alt px-3 py-2 text-sm">
                <div>
                  <span className="font-semibold text-ink">{s.name}</span>
                  {s.phone && <span className="ml-2 text-xs text-ink-faint">{s.phone}</span>}
                </div>
                {can("suppliers:write") && (
                  <button type="button" className="text-xs font-bold text-primary hover:underline" onClick={() => setEditing(s)}>
                    Edit
                  </button>
                )}
              </li>
            ))}
          </ul>
        )}
      </CardBody>

      {(open || editing) && (
        <SupplierModal
          supplier={editing}
          onClose={() => {
            setOpen(false);
            setEditing(null);
          }}
        />
      )}
    </Card>
  );
}

function SupplierModal({ supplier, onClose }: { supplier: SupplierOut | null; onClose: () => void }) {
  const toast = useToast();
  const createSupplier = useCreateSupplier();
  const updateSupplier = useUpdateSupplier(supplier?.id ?? 0);
  const [form, setForm] = useState<SupplierCreate>(supplier ?? EMPTY_SUPPLIER);
  const [error, setError] = useState<string | null>(null);
  const pending = createSupplier.isPending || updateSupplier.isPending;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    const payload = {
      ...form,
      contact_person: form.contact_person || null,
      phone: form.phone || null,
      address: form.address || null,
      notes: form.notes || null,
    };
    try {
      if (supplier) {
        await updateSupplier.mutateAsync(payload);
        toast.success(`${form.name} updated.`);
      } else {
        await createSupplier.mutateAsync(payload);
        toast.success(`${form.name} added.`);
      }
      onClose();
    } catch (err) {
      setError(errorMessage(err));
    }
  }

  return (
    <Modal open onClose={onClose} title={supplier ? "Edit Supplier" : "New Supplier"} width="md">
      <form className="flex flex-col gap-4" onSubmit={handleSubmit}>
        <FieldWrap label="Name" htmlFor="sup-name" required>
          <Input id="sup-name" required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
        </FieldWrap>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <FieldWrap label="Contact person" htmlFor="sup-contact">
            <Input id="sup-contact" value={form.contact_person ?? ""} onChange={(e) => setForm({ ...form, contact_person: e.target.value })} />
          </FieldWrap>
          <FieldWrap label="Phone" htmlFor="sup-phone">
            <Input id="sup-phone" value={form.phone ?? ""} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
          </FieldWrap>
        </div>
        <FieldWrap label="Address" htmlFor="sup-address">
          <Textarea id="sup-address" value={form.address ?? ""} onChange={(e) => setForm({ ...form, address: e.target.value })} />
        </FieldWrap>
        <FieldWrap label="Notes" htmlFor="sup-notes">
          <Textarea id="sup-notes" value={form.notes ?? ""} onChange={(e) => setForm({ ...form, notes: e.target.value })} />
        </FieldWrap>

        {error && <p className="rounded-field border border-orange/30 bg-orange-soft px-3 py-2 text-sm font-semibold text-orange">{error}</p>}

        <div className="mt-1 flex justify-end gap-3">
          <Button type="button" variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" loading={pending}>
            {supplier ? "Save Changes" : "Add Supplier"}
          </Button>
        </div>
      </form>
    </Modal>
  );
}

// ---------- Stock ----------

function StockCard() {
  const { can } = useAuth();
  const { data: projects, isLoading: projectsLoading } = useProjects();
  const [projectId, setProjectId] = useState<string>("");
  const [movementOpen, setMovementOpen] = useState(false);

  useEffect(() => {
    if (!projectId && projects && projects.length > 0) setProjectId(String(projects[0].id));
  }, [projects, projectId]);

  const { data: balances, isLoading: balancesLoading } = useStockBalances(projectId ? Number(projectId) : undefined);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Current Stock</CardTitle>
        {can("stock:write") && projectId && (
          <Button size="sm" onClick={() => setMovementOpen(true)}>
            <IconPlus className="h-4 w-4" /> Record Movement
          </Button>
        )}
      </CardHeader>
      <CardBody className="flex flex-col gap-4">
        <div className="sm:w-72">
          <label className="field-label">Project</label>
          {projectsLoading ? (
            <PageSpinner />
          ) : (
            <Select value={projectId} onChange={(e) => setProjectId(e.target.value)}>
              {projects?.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </Select>
          )}
        </div>

        {!projectId && <EmptyState title="No projects yet" description="Create a project first to track its stock." />}
        {projectId && balancesLoading && <PageSpinner />}
        {projectId && balances && balances.length === 0 && (
          <EmptyState title="No stock movements yet" description="Record a stock-in entry to start tracking this project's materials." />
        )}
        {projectId && balances && balances.length > 0 && (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[560px] text-sm">
              <thead>
                <tr className="border-b border-border text-left text-xs font-bold uppercase tracking-wide text-ink-faint">
                  <th className="py-2.5 pr-4">Material</th>
                  <th className="py-2.5 pr-4">In</th>
                  <th className="py-2.5 pr-4">Out</th>
                  <th className="py-2.5 pr-4">Wastage</th>
                  <th className="py-2.5">Current Stock</th>
                </tr>
              </thead>
              <tbody>
                {balances.map((b) => (
                  <tr key={b.material_id} className="border-b border-border last:border-0">
                    <td className="py-3 pr-4 font-bold text-ink">{b.material_name}</td>
                    <td className="tabular py-3 pr-4 text-ink-soft">{b.quantity_in}</td>
                    <td className="tabular py-3 pr-4 text-ink-soft">{b.quantity_out}</td>
                    <td className="tabular py-3 pr-4 text-ink-soft">{b.quantity_wastage}</td>
                    <td className="tabular py-3 font-semibold text-ink">
                      {b.current_stock} {b.unit_label ?? ""}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </CardBody>

      {movementOpen && projectId && <StockMovementModal projectId={Number(projectId)} onClose={() => setMovementOpen(false)} />}
    </Card>
  );
}

function StockMovementModal({ projectId, onClose }: { projectId: number; onClose: () => void }) {
  const toast = useToast();
  const { data: materials } = useMaterials();
  const { data: suppliers } = useSuppliers();
  const recordMovement = useRecordStockMovement();
  const [materialId, setMaterialId] = useState("");
  const [type, setType] = useState<StockMovementType>("in");
  const [quantity, setQuantity] = useState("");
  const [unitPrice, setUnitPrice] = useState("");
  const [supplierId, setSupplierId] = useState("");
  const [date, setDate] = useState(todayISO());
  const [note, setNote] = useState("");
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (!materialId || !quantity) {
      setError("Material and quantity are required.");
      return;
    }
    try {
      await recordMovement.mutateAsync({
        material_id: Number(materialId),
        project_id: projectId,
        type,
        quantity: Number(quantity),
        unit_price: unitPrice ? Number(unitPrice) : null,
        supplier_id: type === "in" && supplierId ? Number(supplierId) : null,
        date,
        note: note || null,
      });
      toast.success("Stock movement recorded.");
      onClose();
    } catch (err) {
      setError(errorMessage(err));
    }
  }

  return (
    <Modal open onClose={onClose} title="Record Stock Movement" width="md">
      <form className="flex flex-col gap-4" onSubmit={handleSubmit}>
        <FieldWrap label="Material" htmlFor="mv-material" required>
          <Select id="mv-material" required value={materialId} onChange={(e) => setMaterialId(e.target.value)}>
            <option value="">Choose a material…</option>
            {materials?.map((m) => (
              <option key={m.id} value={m.id}>
                {m.name}
              </option>
            ))}
          </Select>
        </FieldWrap>
        <FieldWrap label="Type" htmlFor="mv-type" required>
          <Select id="mv-type" value={type} onChange={(e) => setType(e.target.value as StockMovementType)}>
            <option value="in">Stock In</option>
            <option value="out">Stock Out</option>
            <option value="wastage">Wastage</option>
          </Select>
        </FieldWrap>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <FieldWrap label="Quantity" htmlFor="mv-qty" required>
            <Input id="mv-qty" type="number" min={0} step="0.01" required value={quantity} onChange={(e) => setQuantity(e.target.value)} />
          </FieldWrap>
          <FieldWrap label="Date" htmlFor="mv-date" required>
            <Input id="mv-date" type="date" required value={date} max={todayISO()} onChange={(e) => setDate(e.target.value)} />
          </FieldWrap>
        </div>
        {type === "in" && (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <FieldWrap label="Unit price (₹)" htmlFor="mv-price" hint="Total cost is derived automatically">
              <Input id="mv-price" type="number" min={0} value={unitPrice} onChange={(e) => setUnitPrice(e.target.value)} />
            </FieldWrap>
            <FieldWrap label="Supplier" htmlFor="mv-supplier">
              <Select id="mv-supplier" value={supplierId} onChange={(e) => setSupplierId(e.target.value)}>
                <option value="">Unspecified</option>
                {suppliers?.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name}
                  </option>
                ))}
              </Select>
            </FieldWrap>
          </div>
        )}
        <FieldWrap label="Note" htmlFor="mv-note">
          <Input id="mv-note" value={note} onChange={(e) => setNote(e.target.value)} />
        </FieldWrap>

        {error && <p className="rounded-field border border-orange/30 bg-orange-soft px-3 py-2 text-sm font-semibold text-orange">{error}</p>}

        <div className="mt-1 flex justify-end gap-3">
          <Button type="button" variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" loading={recordMovement.isPending}>
            Save Movement
          </Button>
        </div>
      </form>
    </Modal>
  );
}

// ---------- Material expenses ----------

function MaterialExpensesCard() {
  const { can } = useAuth();
  const { data: projects } = useProjects();
  const { data: materials } = useMaterials();
  const { data: suppliers } = useSuppliers();
  const [projectFilter, setProjectFilter] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [open, setOpen] = useState(false);

  const filters = useMemo(
    () => ({
      project_id: projectFilter ? Number(projectFilter) : undefined,
      start_date: startDate || undefined,
      end_date: endDate || undefined,
    }),
    [projectFilter, startDate, endDate]
  );
  const { data: expenses, isLoading } = useMaterialExpenses(filters);

  const projectName = (id: number) => projects?.find((p) => p.id === id)?.name ?? `Project #${id}`;
  const materialName = (id: number | null) => (id ? materials?.find((m) => m.id === id)?.name ?? `#${id}` : "—");
  const supplierName = (id: number | null) => (id ? suppliers?.find((s) => s.id === id)?.name ?? `#${id}` : "—");

  const total = expenses?.reduce((sum, e) => sum + e.amount, 0) ?? 0;

  return (
    <Card>
      <CardHeader>
        <CardTitle>Material Expenses</CardTitle>
        {can("material_expenses:write") && (
          <Button size="sm" onClick={() => setOpen(true)}>
            <IconPlus className="h-4 w-4" /> Record Expense
          </Button>
        )}
      </CardHeader>
      <CardBody className="flex flex-col gap-4">
        <div className="flex flex-wrap items-end gap-4">
          <div className="sm:w-56">
            <label className="field-label">Project</label>
            <Select value={projectFilter} onChange={(e) => setProjectFilter(e.target.value)}>
              <option value="">All projects</option>
              {projects?.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </Select>
          </div>
          <div className="sm:w-44">
            <label className="field-label">From</label>
            <Input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} />
          </div>
          <div className="sm:w-44">
            <label className="field-label">To</label>
            <Input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} />
          </div>
          {expenses && expenses.length > 0 && (
            <div className="ml-auto rounded-field bg-primary-soft px-3 py-2 text-sm font-bold text-primary">
              Total: {formatCurrency(total)}
            </div>
          )}
        </div>

        {isLoading && <PageSpinner />}
        {expenses && expenses.length === 0 && <EmptyState title="No expenses recorded" description="Direct material purchases feed straight into project cost tracking." />}
        {expenses && expenses.length > 0 && (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[640px] text-sm">
              <thead>
                <tr className="border-b border-border text-left text-xs font-bold uppercase tracking-wide text-ink-faint">
                  <th className="py-2.5 pr-4">Date</th>
                  <th className="py-2.5 pr-4">Project</th>
                  <th className="py-2.5 pr-4">Material</th>
                  <th className="py-2.5 pr-4">Supplier</th>
                  <th className="py-2.5">Amount</th>
                </tr>
              </thead>
              <tbody>
                {expenses.map((e) => (
                  <tr key={e.id} className="border-b border-border last:border-0">
                    <td className="py-2.5 pr-4 text-ink-soft">{formatDate(e.date)}</td>
                    <td className="py-2.5 pr-4 font-semibold text-ink">{projectName(e.project_id)}</td>
                    <td className="py-2.5 pr-4 text-ink-soft">{materialName(e.material_id)}</td>
                    <td className="py-2.5 pr-4 text-ink-soft">{supplierName(e.supplier_id)}</td>
                    <td className="tabular py-2.5 font-semibold text-ink">{formatCurrency(e.amount)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </CardBody>

      {open && <MaterialExpenseModal onClose={() => setOpen(false)} />}
    </Card>
  );
}

function MaterialExpenseModal({ onClose }: { onClose: () => void }) {
  const toast = useToast();
  const { data: projects } = useProjects();
  const { data: materials } = useMaterials();
  const { data: suppliers } = useSuppliers();
  const createExpense = useCreateMaterialExpense();

  const [form, setForm] = useState<MaterialExpenseCreate>({
    project_id: 0,
    material_id: null,
    supplier_id: null,
    amount: 0,
    date: todayISO(),
    note: "",
  });
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!form.project_id && projects && projects.length > 0) {
      setForm((f) => ({ ...f, project_id: projects[0].id }));
    }
  }, [projects, form.project_id]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (!form.project_id || !form.amount) {
      setError("Project and amount are required.");
      return;
    }
    try {
      await createExpense.mutateAsync({ ...form, note: form.note || null });
      toast.success("Expense recorded.");
      onClose();
    } catch (err) {
      setError(errorMessage(err));
    }
  }

  return (
    <Modal open onClose={onClose} title="Record Material Expense" width="md">
      <form className="flex flex-col gap-4" onSubmit={handleSubmit}>
        <FieldWrap label="Project" htmlFor="exp-project" required>
          <Select
            id="exp-project"
            required
            value={form.project_id || ""}
            onChange={(e) => setForm({ ...form, project_id: Number(e.target.value) })}
          >
            <option value="">Choose a project…</option>
            {projects?.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </Select>
        </FieldWrap>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <FieldWrap label="Material" htmlFor="exp-material" hint="Optional">
            <Select
              id="exp-material"
              value={form.material_id ?? ""}
              onChange={(e) => setForm({ ...form, material_id: e.target.value ? Number(e.target.value) : null })}
            >
              <option value="">Unspecified</option>
              {materials?.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.name}
                </option>
              ))}
            </Select>
          </FieldWrap>
          <FieldWrap label="Supplier" htmlFor="exp-supplier" hint="Optional">
            <Select
              id="exp-supplier"
              value={form.supplier_id ?? ""}
              onChange={(e) => setForm({ ...form, supplier_id: e.target.value ? Number(e.target.value) : null })}
            >
              <option value="">Unspecified</option>
              {suppliers?.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </Select>
          </FieldWrap>
        </div>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <FieldWrap label="Amount (₹)" htmlFor="exp-amount" required>
            <Input
              id="exp-amount"
              type="number"
              min={0}
              required
              value={form.amount || ""}
              onChange={(e) => setForm({ ...form, amount: Number(e.target.value) || 0 })}
            />
          </FieldWrap>
          <FieldWrap label="Date" htmlFor="exp-date" required>
            <Input id="exp-date" type="date" required value={form.date} max={todayISO()} onChange={(e) => setForm({ ...form, date: e.target.value })} />
          </FieldWrap>
        </div>
        <FieldWrap label="Note" htmlFor="exp-note">
          <Input id="exp-note" value={form.note ?? ""} onChange={(e) => setForm({ ...form, note: e.target.value })} />
        </FieldWrap>

        {error && <p className="rounded-field border border-orange/30 bg-orange-soft px-3 py-2 text-sm font-semibold text-orange">{error}</p>}

        <div className="mt-1 flex justify-end gap-3">
          <Button type="button" variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" loading={createExpense.isPending}>
            Save Expense
          </Button>
        </div>
      </form>
    </Modal>
  );
}
