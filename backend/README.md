# Buildwise Backend — Phase 1, 2 & 3

FastAPI + SQLAlchemy 2.0 + Alembic + PostgreSQL implementation of Phase 1 (Core),
Phase 2 (Materials & Suppliers), and Phase 3 (Quotations, Milestones & Invoices) from
`docs/implementation-plan.md`:

- **Phase 1:** Auth, Users, Projects, Workers, Attendance, Weekly Payments & Ledger,
  Advances, and Dashboard v1.
- **Phase 2:** Units of Measure / Suppliers / Materials masters, per-project Stock
  In/Out/Wastage movements, current-stock balances, direct material expenses, and a
  material spend summary on the dashboard.
- **Phase 3:** Quotations (with line items and PDF export), per-project Milestones,
  Invoices raised against milestones (with line items, partial client payments, and PDF
  export), automatic invoice status transitions with a nightly overdue sweep job, and
  the Project Profitability / Invoice & Client Payment reports.

## Setup

```bash
python3 -m venv .venv
source .venv/bin/activate
pip install -e ".[dev]"
cp .env.example .env   # edit BUILDWISE_DATABASE_URL if needed
alembic upgrade head
```

## Run

```bash
uvicorn app.main:app --reload
```

API docs at `http://localhost:8000/docs`.

## Tests

Tests run against a real Postgres database (each test rolls back its own transaction).

```bash
createdb buildwise_test   # once
BUILDWISE_DATABASE_URL=postgresql+psycopg://postgres:postgres@localhost:5432/buildwise_test \
  alembic upgrade head
pytest
```

## Scope

Implements PRD Phase 1 exit criteria: create a project, add workers, mark a week of
attendance across two projects for a shared worker, generate the Sunday payment, mark
it paid with proof, and see the worker ledger update — see
`tests/test_e2e_phase1_flow.py`.

Implements PRD Phase 2 exit criteria: stock and spend numbers for a project are
traceable and match manual reconciliation — record Stock In (with supplier/cost),
Stock Out, and Wastage against a project, view the resulting current-stock balance per
material, log a direct material expense, and see both feed into the dashboard's
material spend total — see `tests/test_e2e_phase2_flow.py`.

Implements PRD Phase 3 exit criteria: a full quotation-to-paid-invoice flow is
demoable with PDFs matching the "clean, no-GST" spec — create and accept a quotation,
export it as a PDF, define a project milestone, raise an invoice against it, record a
partial and then a final client payment (status auto-transitions
unpaid → partially_paid → paid, and the linked milestone flips to paid), export the
invoice as a PDF, and see both the Invoice & Client Payment report and the Project
Profitability report reflect the numbers — see `tests/test_e2e_phase3_flow.py`. An
invoice past its due date with an outstanding balance is flipped to `overdue` by a
nightly job (also triggerable via `POST /api/v1/admin/jobs/run-invoice-overdue-sweep`).

Dashboard/report polish (CSV export, remaining standalone report views) and Phase 4
hardening are out of scope for this phase.
