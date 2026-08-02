export type UserRole = "owner" | "contractor" | "supervisor" | "accountant";
export type ProjectStatus = "planning" | "ongoing" | "on_hold" | "completed";
export type ContractType = "fixed_price" | "cost_plus" | "other";
export type AttendanceStatus = "present" | "absent" | "half_day";
export type PaymentMode = "cash" | "bank_transfer" | "upi";
export type PaymentStatus = "due" | "paid";
export type StockMovementType = "in" | "out" | "wastage";
export type QuotationStatus = "draft" | "sent" | "accepted" | "rejected";
export type MilestoneStatus = "pending" | "invoiced" | "paid";
export type InvoiceStatus = "unpaid" | "partially_paid" | "paid" | "overdue";

export interface UserOut {
  id: number;
  name: string;
  email: string;
  role: UserRole;
  is_active: boolean;
}

export interface UserCreate {
  name: string;
  email: string;
  password: string;
  role: UserRole;
}

export interface UserUpdate {
  name?: string;
  role?: UserRole;
  is_active?: boolean;
}

export interface ProjectTypeOut {
  id: number;
  name: string;
  is_active: boolean;
}

export interface ProjectOut {
  id: number;
  name: string;
  client_name: string | null;
  client_contact: string | null;
  location: string | null;
  start_date: string | null;
  end_date: string | null;
  project_type_id: number | null;
  contract_type: ContractType | null;
  budget: number | null;
  status: ProjectStatus;
  is_deleted: boolean;
}

export interface ProjectCreate {
  name: string;
  client_name?: string | null;
  client_contact?: string | null;
  location?: string | null;
  start_date?: string | null;
  end_date?: string | null;
  project_type_id?: number | null;
  contract_type?: ContractType | null;
  budget?: number | null;
}

export type ProjectUpdate = Partial<ProjectCreate> & { status?: ProjectStatus };

export interface WorkerTypeOut {
  id: number;
  name: string;
  default_daily_rate: number | null;
  default_ot_rate: number | null;
  is_active: boolean;
}

export interface WorkerOut {
  id: number;
  name: string;
  worker_type_id: number | null;
  phone: string | null;
  photo_url: string | null;
  id_proof_number: string | null;
  address: string | null;
  default_daily_rate: number | null;
  bank_account: string | null;
  upi_id: string | null;
  joining_date: string | null;
  emergency_contact: string | null;
  is_active: boolean;
  is_deleted: boolean;
}

export interface WorkerCreate {
  name: string;
  worker_type_id?: number | null;
  phone?: string | null;
  photo_url?: string | null;
  id_proof_number?: string | null;
  id_proof_file_url?: string | null;
  address?: string | null;
  default_daily_rate?: number | null;
  bank_account?: string | null;
  upi_id?: string | null;
  joining_date?: string | null;
  emergency_contact?: string | null;
}

export type WorkerUpdate = Partial<WorkerCreate> & { is_active?: boolean };

export interface ProjectWorkerAssignmentOut {
  id: number;
  worker_id: number;
  project_id: number;
  custom_rate_override: number | null;
  ot_rate_override: number | null;
}

export interface AttendanceEntryInput {
  worker_id: number;
  status: AttendanceStatus;
  ot_hours: number;
  applicable_rate?: number | null;
  ot_rate?: number | null;
  override_warning?: boolean;
}

export interface AttendanceOut {
  id: number;
  worker_id: number;
  project_id: number;
  date: string;
  status: AttendanceStatus;
  ot_hours: number;
  applicable_rate: number;
  ot_rate: number;
  recorded_by: number | null;
}

export interface AttendanceUpsertResult {
  saved: AttendanceOut[];
  warnings: string[];
}

export interface AttendanceAuditLogOut {
  id: number;
  attendance_id: number;
  changed_by: number | null;
  changed_at: string;
  field_name: string;
  old_value: string | null;
  new_value: string | null;
}

export interface WorkerAdvanceOut {
  id: number;
  worker_id: number;
  project_id: number | null;
  amount: number;
  date: string;
  note: string | null;
  outstanding_amount: number;
}

export interface WorkerAdvanceCreate {
  amount: number;
  date: string;
  project_id?: number | null;
  note?: string | null;
}

export interface WorkerPaymentProjectBreakdownOut {
  project_id: number;
  days_present: number;
  ot_hours: number;
  amount: number;
}

export interface WorkerPaymentOut {
  id: number;
  worker_id: number;
  week_start: string;
  week_end: string;
  gross_wage_due: number;
  advance_deducted: number;
  net_paid: number | null;
  payment_mode: PaymentMode | null;
  proof_reference: string | null;
  proof_file_url: string | null;
  status: PaymentStatus;
  paid_at: string | null;
  breakdown: WorkerPaymentProjectBreakdownOut[];
}

export interface MarkPaidRequest {
  advance_deduction_amount: number;
  payment_mode: PaymentMode;
  proof_reference?: string | null;
  proof_file_url?: string | null;
}

export interface LedgerEntry {
  date: string;
  type: "wage" | "advance_given" | "advance_deducted" | "payment";
  description: string;
  debit: number;
  credit: number;
}

export interface WorkerLedgerOut {
  worker_id: number;
  entries: LedgerEntry[];
  outstanding_advance_balance: number;
}

export interface DashboardSummary {
  active_projects_count: number;
  todays_attendance: { present: number; absent: number; half_day: number };
  payments_due_this_week_total: number;
  payments_due_this_week_count: number;
  overdue_invoices_count: number;
  overdue_invoices_total: number;
  material_spend_total: number;
}

export interface UnitOfMeasureOut {
  id: number;
  code: string;
  label: string;
}

export interface UnitOfMeasureCreate {
  code: string;
  label: string;
}

export interface SupplierOut {
  id: number;
  name: string;
  contact_person: string | null;
  phone: string | null;
  address: string | null;
  notes: string | null;
  is_active: boolean;
}

export interface SupplierCreate {
  name: string;
  contact_person?: string | null;
  phone?: string | null;
  address?: string | null;
  notes?: string | null;
}

export type SupplierUpdate = Partial<SupplierCreate> & { is_active?: boolean };

export interface MaterialOut {
  id: number;
  name: string;
  category: string | null;
  unit_id: number | null;
  default_supplier_id: number | null;
  default_unit_price: number | null;
  is_active: boolean;
}

export interface MaterialCreate {
  name: string;
  category?: string | null;
  unit_id?: number | null;
  default_supplier_id?: number | null;
  default_unit_price?: number | null;
}

export type MaterialUpdate = Partial<MaterialCreate> & { is_active?: boolean };

export interface StockMovementCreate {
  material_id: number;
  project_id: number;
  type: StockMovementType;
  quantity: number;
  unit_price?: number | null;
  total_cost?: number | null;
  supplier_id?: number | null;
  date: string;
  note?: string | null;
}

export interface StockMovementOut {
  id: number;
  material_id: number;
  project_id: number;
  type: StockMovementType;
  quantity: number;
  unit_price: number | null;
  total_cost: number | null;
  supplier_id: number | null;
  date: string;
  note: string | null;
}

export interface MaterialStockBalanceOut {
  material_id: number;
  material_name: string;
  unit_label: string | null;
  project_id: number;
  quantity_in: number;
  quantity_out: number;
  quantity_wastage: number;
  current_stock: number;
}

export interface MaterialExpenseCreate {
  project_id: number;
  material_id?: number | null;
  supplier_id?: number | null;
  amount: number;
  date: string;
  note?: string | null;
}

export interface MaterialExpenseOut {
  id: number;
  project_id: number;
  material_id: number | null;
  supplier_id: number | null;
  amount: number;
  date: string;
  note: string | null;
}

// ---------- Quotations ----------

export interface LineItemInput {
  description: string;
  quantity: number;
  rate: number;
  amount?: number | null;
}

export interface LineItemOut {
  id: number;
  description: string;
  quantity: number;
  rate: number;
  amount: number;
  sort_order: number;
}

export interface QuotationCreate {
  client_name: string;
  project_description?: string | null;
  project_ref_id?: number | null;
  date: string;
  validity_date?: string | null;
  terms?: string | null;
  line_items: LineItemInput[];
}

export interface QuotationUpdate extends Partial<QuotationCreate> {
  status?: QuotationStatus;
}

export interface QuotationOut {
  id: number;
  client_name: string;
  project_description: string | null;
  project_ref_id: number | null;
  total_amount: number;
  date: string;
  validity_date: string | null;
  terms: string | null;
  status: QuotationStatus;
  created_at: string;
  line_items: LineItemOut[];
}

// ---------- Milestones ----------

export interface MilestoneCreate {
  name: string;
  description?: string | null;
  amount: number;
}

export interface MilestoneUpdate {
  name?: string;
  description?: string | null;
  amount?: number;
  status?: MilestoneStatus;
}

export interface MilestoneOut {
  id: number;
  project_id: number;
  name: string;
  description: string | null;
  amount: number;
  status: MilestoneStatus;
}

// ---------- Invoices ----------

export interface InvoiceCreate {
  project_id: number;
  client_name: string;
  invoice_date: string;
  due_date?: string | null;
  milestone_ids: number[];
  line_items: LineItemInput[];
}

export interface InvoiceUpdate {
  client_name?: string;
  due_date?: string | null;
  line_items?: LineItemInput[];
}

export interface InvoicePaymentCreate {
  amount: number;
  date: string;
  mode: PaymentMode;
  note?: string | null;
}

export interface InvoicePaymentOut {
  id: number;
  invoice_id: number;
  amount: number;
  date: string;
  mode: PaymentMode;
  note: string | null;
}

export interface InvoiceOut {
  id: number;
  project_id: number;
  client_name: string;
  total_amount: number;
  invoice_date: string;
  due_date: string | null;
  status: InvoiceStatus;
  created_at: string;
  line_items: LineItemOut[];
  milestone_ids: number[];
  payments: InvoicePaymentOut[];
  amount_received: number;
  amount_outstanding: number;
}

// ---------- Reports ----------

export interface InvoiceReportRow {
  invoice_id: number;
  project_id: number;
  project_name: string;
  client_name: string;
  invoice_date: string;
  due_date: string | null;
  total_amount: number;
  amount_received: number;
  amount_outstanding: number;
  status: InvoiceStatus;
}

export interface InvoiceReportOut {
  rows: InvoiceReportRow[];
  total_invoiced: number;
  total_received: number;
  total_outstanding: number;
  overdue_count: number;
  unpaid_count: number;
  partially_paid_count: number;
  paid_count: number;
}

export interface ProfitabilityRow {
  project_id: number;
  project_name: string;
  amount_received: number;
  labour_cost: number;
  material_cost: number;
  profit: number;
}

export interface ProfitabilityReportOut {
  rows: ProfitabilityRow[];
  total_amount_received: number;
  total_labour_cost: number;
  total_material_cost: number;
  total_profit: number;
}

export interface AttendanceSummaryRow {
  worker_id: number;
  worker_name: string;
  project_id: number;
  project_name: string;
  days_present: number;
  days_absent: number;
  days_half_day: number;
  ot_hours: number;
}

export interface AttendanceSummaryReportOut {
  rows: AttendanceSummaryRow[];
  total_days_present: number;
  total_days_absent: number;
  total_days_half_day: number;
  total_ot_hours: number;
}

export interface PaymentDuesRow {
  payment_id: number;
  worker_id: number;
  worker_name: string;
  week_start: string;
  week_end: string;
  gross_wage_due: number;
  advance_deducted: number;
  net_paid: number | null;
  status: PaymentStatus;
  payment_mode: PaymentMode | null;
  paid_at: string | null;
}

export interface PaymentDuesReportOut {
  rows: PaymentDuesRow[];
  total_gross_wage_due: number;
  total_net_paid: number;
  due_count: number;
  paid_count: number;
}

export interface MaterialExpenseRow {
  project_id: number;
  project_name: string;
  material_id: number | null;
  material_name: string;
  category: string | null;
  stock_in_cost: number;
  direct_expense_amount: number;
  total_cost: number;
}

export interface MaterialExpenseReportOut {
  rows: MaterialExpenseRow[];
  total_stock_in_cost: number;
  total_direct_expense_amount: number;
  total_cost: number;
}
