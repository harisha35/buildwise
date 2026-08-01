# Product Requirements Document (PRD) & Software Requirements Specification (SRS)
## Buildwise — Construction Project & Workforce Management System

**Product Name:** Buildwise
**Version:** 1.0
**Date:** August 1, 2026
**Status:** Draft for Review

---

## 1. Introduction

### 1.1 Purpose
This document defines the functional and non-functional requirements for a responsive web-based software application that enables a civil construction contractor to manage multiple construction projects, workers, attendance, payments, materials, suppliers, and client billing (quotations/invoices) from a single system.

### 1.2 Product Overview
**Buildwise** is a **single responsive web application** (not separate native mobile apps) accessible via desktop and mobile browsers, built to serve one contracting business (single-tenant) with multiple users across four roles: Owner, Contractor, Supervisor, and Accountant.

### 1.3 Intended Audience
- Development team (backend, frontend, QA)
- The contractor/business owner (product stakeholder)
- Future maintainers of the system

### 1.4 Definitions & Abbreviations

| Term | Meaning |
|---|---|
| Project | A single construction site/job managed under this system |
| Worker | A daily-wage individual (labour, mason, helper, etc.) who can be assigned to one or more projects |
| Supervisor | Site-level user responsible for attendance and on-site payments for their assigned project(s) |
| Ledger | A running record of debits/credits for a worker (wages, advances, payments) |
| Milestone | A custom, project-specific billing stage against which an invoice is raised |
| Soft Delete | Marking a record inactive/archived instead of permanently removing it from the database |
| SRS | Software Requirements Specification |
| PRD | Product Requirements Document |

---

## 2. Overall Scope

### 2.1 In Scope (v1)
- Multi-project management under a single contractor account
- Role-based access: Owner, Contractor, Supervisor, Accountant
- Worker profile management with admin-configurable worker types
- Daily attendance tracking (present/absent/half-day/overtime) per project
- Weekly auto-calculated worker payments with advance/loan deduction
- Worker-wise running ledger
- Lightweight material inventory tracking per project (stock in/out, wastage)
- Direct material expense entry and supplier management (no supplier ledger)
- Quotation creation (pre-project) and milestone-based client invoicing
- Partial/multiple payments received against invoices
- Dashboards and reports with date-range filtering
- PDF export for quotations/invoices (clean, simple format, no GST)

### 2.2 Out of Scope (v1) — Candidates for Future Phases
- Native mobile apps (iOS/Android)
- Offline mode / sync
- GPS/biometric/photo-based attendance verification
- GST/tax compliance, HSN/SAC codes
- Quotation → invoice auto-conversion
- Supplier payable ledger
- Low-stock reorder alerts
- Multi-language support
- Multi-tenant SaaS capability (architecture should not block this later, but not built now)
- Payroll statutory deductions (PF/ESI)
- SMS/WhatsApp notifications (in-app only for v1, see open item in §9)

### 2.3 Assumptions
- All data entry is in English.
- The system will run on the contractor's existing Hostinger cloud VM.
- Internet connectivity is assumed to be available at the point of data entry (no offline requirement).
- All monetary values are in a single currency (assumed ₹ INR based on context; confirm with stakeholder).
- No tax/GST calculations are required at this stage.

---

## 3. User Roles & Permissions

### 3.1 Roles
1. **Owner** — Full system access (admin-level)
2. **Contractor** — Full system access, identical permissions to Owner (separate login/identity, same access level)
3. **Supervisor** — Restricted to their assigned project(s); can be assigned to multiple projects
4. **Accountant** — Full access to financial data (worker payments, material expenses, invoices) across **all** projects; no user/role management

### 3.2 Permission Matrix

| Capability | Owner | Contractor | Supervisor | Accountant |
|---|:---:|:---:|:---:|:---:|
| Create/edit/delete projects | ✅ | ✅ | ❌ | ❌ |
| View all projects | ✅ | ✅ | ❌ (assigned only) | ✅ |
| Create/manage users (Supervisor, Accountant) | ✅ | ✅ | ❌ | ❌ |
| Add/edit worker profiles | ✅ | ✅ | ✅ | ✅ |
| Soft-delete workers | ✅ | ✅ | ✅ | ✅ |
| Configure worker types | ✅ | ✅ | ❌ | ❌ |
| Set wage rates (type/project/worker level) | ✅ | ✅ | ❌ (view only) | ✅ |
| Mark daily attendance | ✅ | ✅ | ✅ (assigned project only) | ❌ |
| Edit/backdate attendance | ✅ | ✅ | ✅ (assigned project only) | ❌ |
| View weekly payment due | ✅ | ✅ | ✅ (assigned project only) | ✅ |
| Mark worker payment as paid | ✅ | ✅ | ✅ (assigned project only) | ✅ |
| Record worker advances | ✅ | ✅ | ✅ (assigned project only) | ✅ |
| View worker ledger | ✅ | ✅ | ✅ (assigned project workers) | ✅ |
| Add/manage materials & suppliers | ✅ | ✅ | ✅ (assigned project only) | ✅ |
| Record stock in/out/wastage | ✅ | ✅ | ✅ (assigned project only) | ✅ |
| Record material expense | ✅ | ✅ | ✅ (assigned project only) | ✅ |
| Create quotations | ✅ | ✅ | ❌ | ✅ |
| Create/manage milestone invoices | ✅ | ✅ | ❌ | ✅ |
| Record client payments received | ✅ | ✅ | ❌ | ✅ |
| View dashboards/reports (all projects) | ✅ | ✅ | ❌ (assigned only) | ✅ |
| Export reports/PDFs | ✅ | ✅ | ✅ (assigned project only) | ✅ |

> **Note:** This matrix is a starting recommendation based on your answers. Please review the Supervisor row for materials/payments carefully — since Supervisors handle on-site cash and materials, they've been given operational access scoped strictly to their assigned project(s).

### 3.3 Authentication
- Email + password login for all roles.
- "Forgot password" via email reset link.
- Owner/Contractor creates accounts for Supervisor and Accountant (no self-signup).
- Session-based or JWT-based auth (technical decision, see §8).

---

## 4. Functional Requirements

### 4.1 Module: Project Management

**FR-1.1** System shall allow Owner/Contractor to create a project with the following fields:
- Project name (required)
- Client name
- Client contact (phone/email)
- Site location/address
- Start date
- Expected end date
- Project type (residential/commercial/other — admin-configurable list)
- Contract type (fixed price / cost-plus / other)
- Budget (optional)
- Status: Planning, Ongoing, On-Hold, Completed (default: Planning)

**FR-1.2** Owner/Contractor can edit project details and update status at any time.

**FR-1.3** Owner/Contractor can soft-delete (archive) a project. Archived projects are excluded from active lists but retained for historical reports.

**FR-1.4** A worker or material can be allocated to multiple concurrent projects simultaneously; attendance and stock/expense records are always tied to a specific project.

**FR-1.5** Owner/Contractor assigns one or more Supervisors to a project. A Supervisor may be assigned to multiple projects.

---

### 4.2 Module: Worker Management

**FR-2.1** System shall maintain an admin-configurable list of **Worker Types** (e.g., Labour, Mason, Helper, Electrician, Plumber, Carpenter — fully editable by Owner/Contractor).

**FR-2.2** Worker profile fields:
- Name (required — only mandatory field)
- Worker type
- Phone number
- Photo
- ID proof (e.g., Aadhaar number/upload)
- Address
- Default daily wage rate
- Bank account / UPI ID (for payment reference)
- Joining date
- Emergency contact
- Active/Inactive status

**FR-2.3** A worker can be assigned to one or more active projects.

**FR-2.4** Workers can be soft-deleted (deactivated); historical attendance/payment records remain intact and viewable in reports.

**FR-2.5** Wage rate resolution hierarchy (highest priority first):
1. Worker-specific custom rate for a given project (rare override)
2. Project-level rate for that worker type
3. Worker-type default rate (global default)

System shall use this hierarchy to auto-populate the applicable daily rate when attendance is marked, while allowing manual override at entry time if needed.

---

### 4.3 Module: Attendance

**FR-3.1** Supervisor marks daily attendance for each worker on their assigned project with status:
- Present (full day)
- Absent
- Half-day
- Present + Overtime hours (numeric input)

**FR-3.2** Attendance is marked once per day per worker per project (no check-in/check-out times required).

**FR-3.3** Overtime is paid as a **flat extra amount per OT hour**, configurable per worker type or project (not derived from the daily rate automatically, but should have a sensible default that's editable).

**FR-3.4** Supervisors can edit or backdate attendance entries with no time limit restriction. All edits should be logged with timestamp and editing user (audit trail) for accountability.

**FR-3.5** A worker present on multiple projects on the same day is logically prevented or flagged (system should warn if a worker is marked present on two projects for the same date, since this is likely a data entry error) — **[Open item — confirm desired behavior, see §9]**.

---

### 4.4 Module: Worker Payments & Ledger

**FR-4.1** System auto-calculates the weekly payment due for each worker every **Sunday**, based on:
`(Days Present × applicable daily rate) + (Half-days × 0.5 × daily rate) + (OT hours × OT rate) − (Advance deducted this cycle)`

**FR-4.2** The calculated amount is shown to the Supervisor as "due" — it is **not** auto-marked as paid. The Supervisor marks it as paid after handing over cash/completing transfer.

**FR-4.3** Advance/Loan handling:
- Advances can be recorded against a worker at any time (date, amount, project, recorded-by user).
- At the time of weekly payment, the Supervisor can choose to:
  - Deduct the full outstanding advance
  - Deduct a partial amount
  - Skip deduction entirely (carry over to a future cycle)
- Outstanding advance balance is always visible on the worker's ledger.

**FR-4.4** Since a worker may be shared across multiple projects, **weekly payment is consolidated into a single payout per worker** (not per project), aggregating attendance/dues across all projects for that week. The underlying project-wise breakdown must still be retained for per-project cost reporting.

**FR-4.5** Payment modes: Cash, Bank Transfer, UPI.
- For Bank Transfer and UPI: proof required — either a transaction reference/ID **or** a photo/screenshot upload (system supports both; at least one is required).
- For Cash: no proof required.

**FR-4.6** Worker Ledger view shows a chronological running record per worker:
- Wages earned (by week/project)
- Advances given
- Advances deducted
- Payments made (with mode & proof)
- Running balance (amount owed to worker / advance outstanding)

**FR-4.7** All worker payment and advance records are visible to Owner, Contractor, and Accountant across all projects; Supervisors see only their assigned project(s)' workers.

---

### 4.5 Module: Materials & Suppliers

**FR-5.1** Material master fields: name, category, unit of measure (kg, bag, cft, nos, etc. — admin-configurable), default supplier, default unit price.

**FR-5.2** Supplier master fields: name, contact person, phone, address, notes. (Lightweight — no payable ledger in v1.)

**FR-5.3** Material stock is tracked **per project** (each project maintains its own stock quantities; no central warehouse).

**FR-5.4** Stock movements:
- **Stock In**: quantity purchased/received, supplier, unit price, total cost, date, recorded-by user.
- **Stock Out**: aggregate quantity consumed, date, recorded-by user, optional note.
- **Wastage**: recorded as a distinct stock-out reason/category (separate from normal consumption) so wastage can be reported separately.

**FR-5.5** Direct material expense entry: amount spent, material, supplier, project, date — feeds directly into project cost tracking (no purchase-order workflow).

**FR-5.6** Current stock balance per material per project = Σ(Stock In) − Σ(Stock Out) − Σ(Wastage).

**FR-5.7** This is a lightweight tracking module: goal is to know (a) total material spend per project and (b) current stock per project — not a full accounting/inventory valuation system (no FIFO/weighted-average costing needed).

---

### 4.6 Module: Quotations

**FR-6.1** Quotations are created **before** a project starts (pre-sales stage), associated with a prospective client (may or may not yet be linked to a formal Project record).

**FR-6.2** Quotation fields: client name, project name/description, line items (description, quantity, rate, amount), total amount, date, validity/expiry date, terms & conditions/payment terms (free text), status (Draft/Sent/Accepted/Rejected — manually updated, no auto-conversion to invoice).

**FR-6.3** Quotation can be exported as a clean, simple PDF (no GST fields, no logo/letterhead customization required for v1 — plain professional layout).

**FR-6.4** Acceptance of a quotation is manually noted by the user (status field); it does not automatically create a project or invoice.

---

### 4.7 Module: Milestone Billing & Invoices

**FR-7.1** Each project can have custom-defined milestones created at any time during the project (not required upfront), each with: milestone name, description, billing amount, status (Pending/Invoiced/Paid).

**FR-7.2** An invoice is raised against one or more milestones for a project.

**FR-7.3** Invoice fields: client name, project, milestone(s), line items, total amount, invoice date, due date, status (Unpaid/Partially Paid/Paid/Overdue).

**FR-7.4** Invoice amounts are **manually entered** by the user — the system does not auto-pull actual tracked labour/material costs into the invoice (billing to client is independent of internal cost tracking; profitability reports reconcile the two separately, see FR-8.3).

**FR-7.5** Client payments received against an invoice are recorded individually (date, amount, mode) — **partial payments are supported**, and the invoice status updates automatically based on total received vs. total invoiced:
- Received = 0 → Unpaid
- 0 < Received < Total → Partially Paid
- Received ≥ Total → Paid
- Past due date and not fully paid → Overdue (flagged in addition to above status)

**FR-7.6** Invoices exportable as clean, simple PDF (no GST, no custom branding required for v1).

---

### 4.8 Module: Dashboards & Reports

**FR-8.1** All reports and dashboards must support **date-range filtering** (e.g., today, this week, this month, custom start–end date).

**FR-8.2** Dashboard (role-scoped — all projects for Owner/Contractor/Accountant; assigned project(s) for Supervisor) shows at-a-glance:
- Active projects count
- Today's attendance summary (present/absent across workers)
- Payments due this week
- Overdue invoices
- Low-level material spend summary

**FR-8.3** Reports required:
- **Project Profitability**: (Amount received from client via invoices) − (Total labour cost + Total material cost), filterable by date range, per project.
- **Attendance Summary**: per worker / per project, days present/absent/half-day/OT, filterable by date range.
- **Payment Dues & History**: worker-wise, filterable by date range and payment status.
- **Material Expense Report**: per project, per material/category, filterable by date range.
- **Invoice & Client Payment Report**: outstanding, overdue, paid — filterable by date range.

**FR-8.4** All reports support export (PDF and/or Excel — **to be confirmed**, see §9).

---

## 5. Data Model (High-Level Entities)

```
User (id, name, email, password_hash, role, active, created_at)
  └── SupervisorProjectAssignment (user_id, project_id)

Project (id, name, client_name, client_contact, location, start_date,
         end_date, type, contract_type, budget, status, is_deleted)

WorkerType (id, name, default_daily_rate, default_ot_rate, is_active)

Worker (id, name, worker_type_id, phone, photo_url, id_proof, address,
        default_daily_rate, bank_account, upi_id, joining_date,
        emergency_contact, is_active, is_deleted)
  └── ProjectWorkerAssignment (worker_id, project_id, custom_rate_override)

Attendance (id, worker_id, project_id, date, status[present/absent/half_day],
            ot_hours, applicable_rate, ot_rate, recorded_by, edited_log[])

WorkerAdvance (id, worker_id, project_id, amount, date, recorded_by, note)

WorkerPayment (id, worker_id, week_start, week_end, gross_wage_due,
               advance_deducted, net_paid, payment_mode, proof_ref/upload,
               marked_by, paid_at, status)
  └── WorkerPaymentProjectBreakdown (payment_id, project_id, amount)

Material (id, name, category, unit, default_supplier_id, default_unit_price)
Supplier (id, name, contact_person, phone, address, notes)

MaterialStockMovement (id, material_id, project_id, type[in/out/wastage],
                        quantity, unit_price, total_cost, supplier_id,
                        date, recorded_by, note)

MaterialExpense (id, project_id, material_id, supplier_id, amount, date,
                  recorded_by)

Quotation (id, client_name, project_ref, line_items[], total_amount,
           date, validity_date, terms, status)

Milestone (id, project_id, name, description, amount, status)

Invoice (id, project_id, milestone_ids[], client_name, line_items[],
         total_amount, invoice_date, due_date, status)

InvoicePayment (id, invoice_id, amount, date, mode, note)
```

---

## 6. Key Workflows

### 6.1 Attendance → Weekly Payment Cycle
1. Supervisor marks daily attendance for each worker on their project(s), Mon–Sun.
2. System auto-calculates gross wages due per worker every Sunday, aggregated across all projects the worker worked on that week.
3. System shows outstanding advance balance for the worker (if any).
4. Supervisor reviews the "due" screen: gross wage, suggested advance deduction (full/partial/none — Supervisor's choice), net payable.
5. Supervisor hands over payment (cash/UPI/transfer) and marks it "Paid," attaching proof if UPI/transfer.
6. System updates the worker's ledger and per-project cost breakdown.

### 6.2 Quotation → Milestone Invoicing
1. Owner/Contractor/Accountant creates a Quotation for a prospective client before project start.
2. Quotation is shared with client (exported as PDF) and status tracked manually (Sent/Accepted/Rejected).
3. Once work begins, a Project is created (independent of the quotation record).
4. As work progresses, milestones are defined on the project as needed (no fixed upfront list).
5. When a milestone is complete, an invoice is raised referencing that milestone with a manually entered amount.
6. Client payments are recorded against the invoice as received (supporting partial payments); invoice status auto-updates.

### 6.3 Material Stock Flow
1. Material purchased → Stock In entry recorded against a project (with supplier, cost).
2. Material used on-site → Stock Out entry recorded (aggregate quantity, no per-worker/task tracking).
3. Material wasted/damaged → recorded as Wastage (separate category, still reduces stock).
4. Current stock = In − Out − Wastage, viewable per project per material.
5. All costs feed into the Material Expense Report and Project Profitability calculation.

---

## 7. Non-Functional Requirements

| Category | Requirement |
|---|---|
| **Platform** | Single responsive web application (mobile browser + desktop browser), no native apps |
| **Tech Stack** | Backend: Python (FastAPI); Frontend: Next.js (React) |
| **Hosting** | Deployed on existing Hostinger cloud VM |
| **Offline Support** | Not required — always-online usage assumed |
| **Language** | English only |
| **Scale (initial)** | ~5 concurrent projects, ~50 workers, ~50 suppliers, ~10 system users — system should comfortably handle this without needing heavy optimization, but schema should not block reasonable future growth |
| **Security** | Role-based access control enforced server-side; passwords hashed (bcrypt/argon2); HTTPS enforced; audit logging on attendance edits and financial transactions |
| **Data Integrity** | Soft-delete only for Projects and Workers (no hard deletes) to preserve historical report accuracy |
| **Availability** | Standard single-VM deployment; nightly database backups recommended |
| **Browser Support** | Latest versions of Chrome, Safari, Firefox, Edge (mobile & desktop) |

---

## 8. Proposed Screen/Page List

1. Login / Forgot Password
2. Dashboard (role-scoped)
3. Projects — List / Create / Edit / Detail
4. Project Detail — tabs: Overview, Workers, Attendance, Materials, Milestones/Invoices, Reports
5. Workers — List / Create / Edit / Profile / Ledger
6. Worker Types — Config (Owner/Contractor only)
7. Attendance Entry — daily grid per project
8. Weekly Payments — due list, mark-as-paid flow
9. Advances — record advance, view outstanding
10. Materials & Suppliers — master list, add/edit
11. Stock Movements — In/Out/Wastage entry, current stock view
12. Quotations — List / Create / PDF export
13. Milestones — per project, create/manage
14. Invoices — List / Create / Payments received / PDF export
15. Reports — Attendance, Payments, Materials, Profitability, Invoices (all with date-range filter)
16. User Management — create Supervisor/Accountant, assign Supervisor to project(s) (Owner/Contractor only)

---

## 9. Open Items / Needs Final Confirmation

These points came up while structuring the requirements and should be confirmed before development starts:

1. **Currency** — confirmed as ₹ INR? Please confirm explicitly.
2. **Same-day double attendance** — if a worker is marked present on two different projects on the same date, should the system block it, just warn, or allow it freely (e.g., a mason doing a half-day on two nearby sites)?
3. **Report export formats** — PDF only, or also Excel/CSV for accountant use?
4. **Notifications** — you hadn't specified a channel; current draft assumes in-app only (e.g., dashboard alerts for overdue invoices, unpaid workers). Confirm if that's sufficient for v1 or if email notifications are also needed (no SMS/WhatsApp per earlier scope).
5. **Overtime default rate** — should there be a system-wide default OT rate formula (e.g., 1.5× hourly-equivalent of daily rate) to pre-fill, or should it always be manually set per worker type/project with no smart default?
6. **Worker photo/ID storage** — any specific file storage requirement (kept on the same VM vs. cloud object storage like S3-compatible), given optional ID proof/photo uploads?
7. **Quotation "project_ref"** — since a quotation can exist before a formal Project record, should there be a way to later link an accepted quotation to the Project once created (for traceability), even though it's not automatic?

---

## 10. Next Steps
1. Review this PRD/SRS and confirm/adjust the open items in §9 and the permission matrix in §3.2.
2. On approval, proceed to: database schema design, API contract (FastAPI endpoints), and UI wireframes for the screens listed in §8.
3. Recommend building in phases even though scope is fixed:
   - **Phase 1 (Core):** Auth, Projects, Workers, Attendance, Weekly Payments & Ledger
   - **Phase 2:** Materials & Suppliers
   - **Phase 3:** Quotations, Milestones, Invoices, Client Payments
   - **Phase 4:** Dashboards & Reports (can be built incrementally alongside each phase rather than saved fully for last)
