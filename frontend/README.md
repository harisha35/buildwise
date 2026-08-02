# Buildwise Frontend — Phase 1, 2 & 3

Next.js 14 (App Router, TypeScript) console implementing Phase 1 (Core),
Phase 2 (Materials & Suppliers), and Phase 3 (Quotations, Milestones &
Invoices) from `docs/implementation-plan.md`: Login, Dashboard, Projects,
Workers, Attendance, Weekly Payments & Mark-Paid, Advances, Worker Ledger,
User/Config settings, Materials & Suppliers masters, Units of Measure config,
per-project Stock In/Out/Wastage entry with current stock view, direct
Material Expense tracking, Quotations with line items and PDF export,
per-project Milestones, milestone-based Invoices with partial client
payments and PDF export, and the Invoice & Client Payment / Project
Profitability reports — against the FastAPI backend in `../backend`.

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
- `components/line-items-editor.tsx` — shared add/remove/quantity×rate line-item
  editor used by both the Quotation and Invoice forms

## Scope

Full Reports polish (Attendance Summary, Payment Dues & History standalone
views), CSV export, and the role-based dashboard pass are Phase 4 and
intentionally not built here. PDF downloads (`lib/api/client.ts::apiDownloadFile`)
fetch the authenticated binary response and save it via a throwaway anchor
click, since the PDF routes require a Bearer token that a plain `<a href>`
can't attach.
