/**
 * Structured filter object for natural-language dashboard search
 * (docs/09-SCOPE-CONFERENCE-DEMO.md §6). The model returns this shape via
 * forced tool use — never SQL, never prose — and it is validated with Zod
 * before touching anything, same as every other API boundary in this app.
 */

import { z } from 'zod';

export const AiSearchFilterSchema = z.object({
  carrier: z.array(z.string()).optional(),
  status: z.array(z.enum(['STORED', 'IN_TRANSIT', 'DELIVERED'])).optional(),
  recipient: z.string().optional(),
  department: z.string().optional(),
  /** ISO-8601. Inclusive start of range. */
  dateFrom: z.string().optional(),
  /** ISO-8601. Inclusive end of range. */
  dateTo: z.string().optional(),
  locationType: z.enum(['RACK', 'TROLLEY', 'STAGING']).optional(),
  explanation: z.string(),
});

export type AiSearchFilter = z.infer<typeof AiSearchFilterSchema>;

/** Mirrors AiSearchFilterSchema exactly — kept as a literal JSON Schema for strict tool use. */
export const AI_SEARCH_TOOL_INPUT_SCHEMA = {
  type: 'object' as const,
  properties: {
    carrier: {
      type: 'array',
      items: { type: 'string' },
      description: 'Carrier names to filter by, e.g. ["DHL", "Internal Milkrun"]. Omit if the query names no carrier.',
    },
    status: {
      type: 'array',
      items: { type: 'string', enum: ['STORED', 'IN_TRANSIT', 'DELIVERED'] },
      description: 'Parcel statuses to filter by. Omit if the query names no status.',
    },
    recipient: { type: 'string', description: 'Partial or full recipient name mentioned in the query.' },
    department: { type: 'string', description: 'Department code, e.g. "MOE/LOG-A".' },
    dateFrom: { type: 'string', description: 'ISO-8601 date or datetime, inclusive start of the range implied by the query.' },
    dateTo: { type: 'string', description: 'ISO-8601 date or datetime, inclusive end of the range implied by the query.' },
    locationType: { type: 'string', enum: ['RACK', 'TROLLEY', 'STAGING'] },
    explanation: {
      type: 'string',
      description: 'One short sentence, plain language, describing exactly what filters were applied.',
    },
  },
  required: ['explanation'],
  additionalProperties: false,
};
