# Buildwise Backend — Phase 1 & 2

FastAPI + SQLAlchemy 2.0 + Alembic + PostgreSQL implementation of Phase 1 (Core) and
Phase 2 (Materials & Suppliers) from `docs/implementation-plan.md`:

- **Phase 1:** Auth, Users, Projects, Workers, Attendance, Weekly Payments & Ledger,
  Advances, and Dashboard v1.
- **Phase 2:** Units of Measure / Suppliers / Materials masters, per-project Stock
  In/Out/Wastage movements, current-stock balances, direct material expenses, and a
  material spend summary on the dashboard.

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

Quotations/Milestones/Invoices and full Reports are out of scope for this phase
(Phase 3/4 per the implementation plan) and have no models, migrations, or routes yet.
