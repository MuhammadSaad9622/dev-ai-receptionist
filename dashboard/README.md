# AI Receptionist — Owner Dashboard

Mobile-first Next.js dashboard for the AI Receptionist backend (`../backend`). See [`../ARCHITECTURE.md`](../ARCHITECTURE.md) for the full system design.

## Stack

- **Framework:** Next.js 16 (App Router, Turbopack), React 19, TypeScript
- **UI:** shadcn/ui (Base UI primitives, `base-nova` style), Tailwind CSS v4, dark-mode-default
- **Auth:** Supabase Auth — passwordless magic link, session cookies refreshed via `src/proxy.ts` (Next.js 16's renamed middleware)
- **Data:** talks to the backend's JWT-guarded REST API (`NEXT_PUBLIC_BACKEND_API_URL`), no direct DB access

## Getting started

```bash
pnpm install
cp .env.local.example .env.local   # fill in Supabase project + backend URL
pnpm dev
```

Needs a running backend (see `../backend/README.md`) and a Supabase project whose `SUPABASE_URL`/anon key match what the backend's `SUPABASE_JWT_SECRET` was issued from — the dashboard and backend must trust the same Supabase project.

## Pages

| Route | Purpose |
|---|---|
| `/login` | Passwordless magic-link sign-in |
| `/interactions` | Every call/text feed, filterable by triage category |
| `/interactions/[id]` | Transcript, recording, consent status, linked quote/appointment |
| `/quotes` | Open estimates; mark WON/LOST (cancels remaining follow-up steps server-side) |
| `/appointments` | Booked jobs (read-only — CRM is the source of truth) |
| `/alerts` | Open emergency alerts, live-polled every 10s, acknowledge button |
| `/settings` | Business info (read-only), triage/follow-up tuning, notification permission |

A sticky red banner (`src/components/emergency-banner.tsx`) surfaces unacked emergencies on every page, and the sidebar/bottom-nav "Alerts" item carries a live count badge — neither depends on the owner already being on `/alerts`, per the "can't wait for the dashboard to be open" requirement.

## What's real vs. stubbed

Real: auth, session-guarded routing, all five data pages wired to the live backend API, quote status mutation, emergency ack flow with live polling.

Stubbed: background push notifications (needs a Firebase project the backend's `NotificationsService` is also waiting on — see `src/components/push-permission.tsx` for what's there today: browser permission request only, no service worker yet).
