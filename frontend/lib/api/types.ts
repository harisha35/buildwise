export type UserRole = "owner" | "contractor" | "supervisor" | "accountant";
export type ProjectStatus = "planning" | "ongoing" | "on_hold" | "completed";
export type ContractType = "fixed_price" | "cost_plus" | "other";
export type AttendanceStatus = "present" | "absent" | "half_day";
export type PaymentMode = "cash" | "bank_transfer" | "upi";
export type PaymentStatus = "due" | "paid";

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
}
