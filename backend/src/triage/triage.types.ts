import { TriageCategory } from '@prisma/client';

// The tool/function surface exposed to whichever voice provider is active
// (Retell, Vapi, or a future Gemini Live function-calling session) AND to
// the SMS text-triage pass. Both channels bottom out in the same handlers —
// this is the "identical triage rules" requirement (PRD Feature 1).
export const TRIAGE_TOOL_NAMES = [
  'check_availability',
  'book_appointment',
  'tag_emergency',
  'create_quote',
  'log_out_of_scope',
] as const;

export type TriageToolName = (typeof TRIAGE_TOOL_NAMES)[number];

export interface TriageClassification {
  category: TriageCategory;
  confidence: number; // 0..1
  reasoning: string;
  entities: {
    issueSummary?: string;
    urgencySignals?: string[]; // e.g. "no heat", "active leak", "gas smell"
    address?: string;
    preferredTimeWindow?: string;
  };
}

// Tool schemas registered with the voice provider (Retell/Vapi custom
// functions, or Gemini Live's FunctionDeclaration format — the shapes are
// close enough that one canonical definition adapts to either with a thin
// per-provider mapper in voice/providers/*).
export const TRIAGE_TOOL_SCHEMAS: Record<TriageToolName, object> = {
  check_availability: {
    name: 'check_availability',
    description:
      "Check the business's calendar/CRM for open appointment windows near the caller's preferred time.",
    parameters: {
      type: 'object',
      properties: {
        preferredDate: {
          type: 'string',
          description: 'ISO date the caller wants, if given',
        },
        jobType: {
          type: 'string',
          description: 'e.g. AC repair, drain cleaning',
        },
      },
      required: ['jobType'],
    },
  },
  book_appointment: {
    name: 'book_appointment',
    description:
      'Book a confirmed appointment on the calendar/CRM for a ROUTINE_SCHEDULING interaction.',
    parameters: {
      type: 'object',
      properties: {
        customerName: { type: 'string' },
        customerPhone: { type: 'string' },
        address: { type: 'string' },
        jobType: { type: 'string' },
        scheduledStart: { type: 'string', description: 'ISO 8601 datetime' },
        scheduledEnd: { type: 'string', description: 'ISO 8601 datetime' },
      },
      required: ['customerPhone', 'jobType', 'scheduledStart', 'scheduledEnd'],
    },
  },
  tag_emergency: {
    name: 'tag_emergency',
    description:
      'Flag this call/text as a TRUE emergency (active leak, no heat in freezing conditions, gas smell, electrical hazard) requiring immediate owner notification. Only call this for genuine safety/property-damage risk, not general urgency.',
    parameters: {
      type: 'object',
      properties: {
        reasoning: {
          type: 'string',
          description: 'Why this qualifies as a true emergency',
        },
        urgencySignals: { type: 'array', items: { type: 'string' } },
        address: { type: 'string' },
      },
      required: ['reasoning'],
    },
  },
  create_quote: {
    name: 'create_quote',
    description:
      'Log an open quote for a caller who is price-shopping or asked for an estimate, to enter the follow-up sequence.',
    parameters: {
      type: 'object',
      properties: {
        description: { type: 'string' },
        amountCents: { type: 'number' },
      },
      required: ['description'],
    },
  },
  log_out_of_scope: {
    name: 'log_out_of_scope',
    description:
      'Log a caller/text as out-of-scope or cold (wrong trade, spam, not a real lead).',
    parameters: {
      type: 'object',
      properties: { reasoning: { type: 'string' } },
      required: ['reasoning'],
    },
  },
};

// Voice/SMS tool-call args arrive as `unknown` (LLM-produced JSON) — this
// coerces to a plain string without ever risking a "[object Object]" via a
// bare `String(x)` on something that turned out to be an object.
export function argToString(value: unknown, fallback = ''): string {
  if (value === undefined || value === null) return fallback;
  if (typeof value === 'string') return value;
  if (typeof value === 'number' || typeof value === 'boolean')
    return String(value);
  return JSON.stringify(value);
}
