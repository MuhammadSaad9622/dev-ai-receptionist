# AI Receptionist — HVAC & Plumbing

An AI phone/text receptionist for HVAC & plumbing businesses: triages inbound calls/texts into emergencies, routine bookings, quote follow-ups, or out-of-scope leads, plus a system-driven retention/rebooking flow — with a mobile-first owner dashboard.

Built from [`AI_Receptionist_HVAC_Technical_Architecture_and_Costing`](https://docs.google.com/document/d/1_x0Kpej6h3hSC7eMmAIjTr7HSyd9WoFWDPZ7JhLDKGs/edit).

## Status

- ✅ **Backend** (`backend/`) — NestJS API, Prisma data model, triage engine, voice/CRM provider abstractions, BullMQ follow-up + emergency-escalation jobs. See [`ARCHITECTURE.md`](ARCHITECTURE.md).
- ✅ **Dashboard** (`dashboard/`) — Next.js 16 owner dashboard: interactions feed, quotes, appointments, live emergency alerts, settings. See [`dashboard/README.md`](dashboard/README.md).
- ⏳ **Retell AI integration** — deliberately last. Triage/booking/follow-up logic is voice-provider-agnostic (`backend/src/voice/`); Retell gets wired in once the rest of the HVAC flow is proven end-to-end.

Build priority: HVAC first (business type defaults to HVAC; triage tuned for HVAC scenarios), plumbing support stays in the schema for later.

## Repo layout

```
backend/           NestJS backend — see backend/README.md
dashboard/         Next.js owner dashboard — see dashboard/README.md
ARCHITECTURE.md     Full design write-up: data model, triage flow, decisions
```

## Quick start

```bash
# Backend
cd backend && pnpm install && cp .env.example .env && pnpm run start:dev

# Dashboard (separate terminal)
cd dashboard && pnpm install && cp .env.local.example .env.local && pnpm dev
```

See [`backend/README.md`](backend/README.md) and [`dashboard/README.md`](dashboard/README.md) for details.
