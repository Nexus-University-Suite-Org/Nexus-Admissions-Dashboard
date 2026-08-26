# Nexus Admissions Dashboard

A premium admissions administration dashboard for Nexus University staff to review, filter, and manage student applications.

## Run & Operate

- `pnpm --filter @workspace/api-server run dev` — run the API server (port 8080)
- `pnpm run typecheck` — full typecheck across all packages
- `pnpm run build` — typecheck + build all packages
- `pnpm --filter @workspace/api-spec run codegen` — regenerate API hooks and Zod schemas from the OpenAPI spec
- `pnpm --filter @workspace/db run push` — push DB schema changes (dev only)
- Required env: `DATABASE_URL` — Postgres connection string

## Stack

- pnpm workspaces, Node.js 24, TypeScript 5.9
- API: Express 5
- DB: PostgreSQL + Drizzle ORM
- Validation: Zod 3, `drizzle-zod`
- API codegen: Orval (from OpenAPI spec)
- Build: esbuild (CJS bundle)

## Where things live

- `artifacts/nexus-admissions` — standalone React/Vite web dashboard and all admin routes.
- `artifacts/api-server/src/routes/admin.ts` — development admissions API with seeded application records.
- `lib/api-spec/openapi.yaml` — source of truth for auth, dashboard, application, and review contracts.
- `lib/api-client-react/src/generated` — generated React Query client used by the dashboard.
- `artifacts/nexus-admissions/src/index.css` — Nexus editorial theme tokens and typography.

## Architecture decisions

- The admissions dashboard is a separate root web artifact from the shared API server and mockup sandbox.
- The frontend uses the generated OpenAPI React Query client rather than hand-written request types.
- The development API uses a small in-memory dataset so the review workflow is immediately demonstrable; the route contract is ready to point at the production admissions service.
- Admin login follows the requested `nap_admin_token` bearer-token contract and intentionally remains separate from end-user authentication.

## Product

Administrators can sign in, view admissions metrics and recent submissions, search and filter the application register, inspect complete applicant details, and admit, waitlist, or reject submitted applications with confirmation and reviewer notes.

## User preferences

The requested visual direction is warm editorial minimalism with a parchment canvas, deep institutional sidebar, amber decision accent, serif display typography, rounded surfaces, and premium motion.

## Gotchas

- The generated Zod package in this workspace is Zod 3-compatible; email formats are expressed as regex patterns and numeric IDs/counts as `number` in the OpenAPI source to avoid Zod 4-only helpers.

## Pointers

- See the `pnpm-workspace` skill for workspace structure, TypeScript setup, and package details
