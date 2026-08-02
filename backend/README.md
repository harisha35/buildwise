# Buildwise Backend — Phase 1

FastAPI + SQLAlchemy 2.0 + Alembic + PostgreSQL implementation of Phase 1 (Core) from
`docs/implementation-plan.md`: Auth, Users, Projects, Workers, Attendance, Weekly
Payments & Ledger, Advances, and Dashboard v1.

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

Materials/Suppliers, Quotations/Milestones/Invoices, and full Reports are out of scope
for this phase (Phase 2/3 per the implementation plan) and have no models, migrations,
or routes yet.
