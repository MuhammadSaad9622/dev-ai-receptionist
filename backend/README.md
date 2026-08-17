# AI Receptionist — Backend

NestJS (TypeScript) API + background-job orchestration for the AI Receptionist for HVAC & Plumbing Businesses product. See [`../ARCHITECTURE.md`](../ARCHITECTURE.md) for the full design write-up (data model, triage flow, voice-provider strategy, emergency escalation, follow-up sequencing).

Built from [`AI_Receptionist_HVAC_Technical_Architecture_and_Costing`](https://docs.google.com/document/d/1_x0Kpej6h3hSC7eMmAIjTr7HSyd9WoFWDPZ7JhLDKGs/edit) — the tech/cost addendum to the product PRD.

## Stack

- **Framework:** NestJS 11 / TypeScript, Node 22
- **DB:** PostgreSQL via Prisma 6 (Supabase Postgres or Amazon RDS in prod)
- **Jobs:** BullMQ + Redis (quote follow-ups, retention sweeps, emergency escalation)
- **Auth:** Supabase Auth (JWT verified in `src/auth`)
- **Voice:** Retell AI / Vapi (Option B, pilot default) behind a provider-agnostic interface; Gemini Live + Twilio bridge (Option A) is a documented Phase 2 stub
- **SMS/Voice telephony:** Twilio
- **Text triage:** Gemini (REST, function-calling)

## Getting started

```bash
pnpm install
cp .env.example .env   # fill in DATABASE_URL, REDIS_URL, and provider keys as you wire each one up
npx prisma migrate dev --name init   # once DATABASE_URL points at a real Postgres instance
pnpm run start:dev
```

Requires a running Postgres (`DATABASE_URL`) and Redis (`REDIS_URL`) — `docker compose up` a local pair, or point at Supabase/Railway instances, before `start:dev` will boot cleanly (env validation in `src/config/env.validation.ts` fails fast if either is missing).

## Layout

```
src/
  auth/            Supabase JWT verification, role guard, org-scoping
  organizations/    users/            customers/         # dashboard CRUD (JWT-guarded)
  interactions/      quotes/           appointments/      # dashboard CRUD (JWT-guarded)
  triage/           Shared triage taxonomy + prompt + tool-call handler (voice + SMS converge here)
  voice/            Provider-agnostic voice interface + Retell/Vapi/Gemini Live adapters
  calendar-crm/     CRM/calendar adapter interface + ServiceTitan/Housecall Pro/Jobber/Google adapters
  follow-up/        BullMQ-scheduled quote follow-up (day 2/5/10) + retention sequences
  alerts/           Emergency escalation: push → SMS → outbound call, with ack tracking
  messaging/        Twilio SMS send + TCPA/STOP consent enforcement
  notifications/    FCM push (stub — wire firebase-admin)
  webhooks/         Public, signature-verified Twilio/Retell/Vapi callbacks + TwiML
  prisma/           PrismaService/Module
  common/crypto/    AES-256-GCM encryption for stored CRM credentials
prisma/schema.prisma  Full data model
```

## Commands

- `pnpm run start:dev` — watch mode
- `pnpm run build` — compile to `dist/`
- `pnpm run lint` — ESLint (flat config, `--fix`)
- `npx prisma studio` — inspect the DB
- `npx prisma migrate dev` — apply schema changes locally

## What's stubbed vs. real

Real: data model, auth/RBAC, triage engine + shared tool-call handling, BullMQ follow-up/retention/escalation scheduling, TCPA opt-out enforcement, webhook signature verification scaffolding, dashboard REST API.

Stubbed (deliberately — needs live credentials/partner access to finish): the four CRM adapters' actual HTTP calls, Retell/Vapi agent-config sync, FCM push send, the Gemini Live + Twilio Media Streams bridge (Option A, Phase 2). Each stub says exactly what it's waiting on.
