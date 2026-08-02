# Buildwise Frontend — Phase 1

Next.js 14 (App Router, TypeScript) console implementing Phase 1 (Core) from
`docs/implementation-plan.md`: Login, Dashboard, Projects, Workers, Attendance,
Weekly Payments & Mark-Paid, Advances, Worker Ledger, and User/Config settings —
against the FastAPI backend in `../backend`.

Visual design (colors, type, radius, shadows, buttons/cards) mirrors
`../landing-page/index.html` so the marketing site and the app read as one product.

## Setup

```bash
npm install
cp .env.local.example .env.local   # edit NEXT_PUBLIC_API_URL if the backend isn't on :8000
```

## Run

```bash
npm run dev
```

Requires the backend running (see `../backend/README.md`) with CORS allowing
`http://localhost:3000` (`BUILDWISE_CORS_ORIGINS` in `backend/.env`).

## Structure

- `app/(auth)/` — login, forgot password (public)
- `app/(dashboard)/` — authenticated console shell (sidebar + topbar), guarded
  client-side by `lib/auth/context.tsx`; redirects to `/login` if unauthenticated
- `lib/api/` — typed fetch client (access/refresh token handling) + per-resource
  functions matching the backend's OpenAPI contract
- `lib/hooks/` — TanStack Query hooks built on `lib/api/`
- `lib/auth/permissions.ts` — mirrors the backend's capability → role table
  (`backend/app/core/permissions.py`) for UI-only gating; the API is the real gate
- `components/ui/` — design-system primitives (Button, Card, Modal, Badge, fields…)
- `components/layout/` — Sidebar, Topbar, AppShell

## Scope

Materials/Suppliers, Quotations/Milestones/Invoices, and full Reports have no
backend routes yet (Phase 2/3) and are intentionally not built here.
