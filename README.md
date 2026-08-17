# AI Receptionist — HVAC & Plumbing

An AI phone/text receptionist for HVAC & plumbing businesses: triages inbound calls/texts into emergencies, routine bookings, quote follow-ups, or out-of-scope leads, plus a system-driven retention/rebooking flow — with a mobile-first owner dashboard.

Built from [`AI_Receptionist_HVAC_Technical_Architecture_and_Costing`](https://docs.google.com/document/d/1_x0Kpej6h3hSC7eMmAIjTr7HSyd9WoFWDPZ7JhLDKGs/edit).

## Status

- ✅ **Backend** (`backend/`) — NestJS API, Prisma data model, triage engine, voice/CRM provider abstractions, BullMQ follow-up + emergency-escalation jobs. See [`ARCHITECTURE.md`](ARCHITECTURE.md).
- ⏳ **Dashboard** (owner-facing web app) — not started yet.

## Repo layout

```
backend/          NestJS backend — see backend/README.md
ARCHITECTURE.md    Full design write-up: data model, triage flow, decisions
```

## Quick start

```bash
cd backend
pnpm install
cp .env.example .env
pnpm run start:dev
```

See [`backend/README.md`](backend/README.md) for details.
