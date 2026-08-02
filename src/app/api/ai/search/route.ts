/**
 * Natural-language dashboard search (docs/09-SCOPE-CONFERENCE-DEMO.md §6).
 *
 * The model receives the tbl_parcels schema context (distinct carriers /
 * departments, today's date) and returns a STRUCTURED FILTER OBJECT via
 * forced tool use — never SQL, never prose. The object is Zod-validated and
 * applied through the exact same filter code path as the manual chips
 * (useDashboardFilters), so the chips visibly populate to show what was
 * understood.
 *
 * Failure handling is the whole point of this endpoint: no API key, a
 * network failure, a timeout, or a response that fails validation must all
 * degrade to "let the client fall back to plain text search" — never an
 * error the operator has to parse. The demo must survive a dead venue
 * network (risk R1/R14).
 */

import { NextResponse } from 'next/server';
import Anthropic from '@anthropic-ai/sdk';
import { getDistinctFilterValues } from '../../../../server/parcels-repo';
import { logOpsEvent } from '../../../../server/ops-events-repo';
import { AiSearchFilterSchema, AI_SEARCH_TOOL_INPUT_SCHEMA } from '../../../../lib/ai-search-schema';

const MODEL = 'claude-haiku-4-5';
const TIMEOUT_MS = 8000;

export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  const query = typeof body?.query === 'string' ? body.query.trim() : '';
  if (!query) return NextResponse.json({ ok: false, reason: 'Empty query' }, { status: 400 });

  if (!process.env.ANTHROPIC_API_KEY) {
    logOpsEvent({
      kind: 'AI_SEARCH',
      decision: 'SKIPPED',
      reason: 'ANTHROPIC_API_KEY not configured — degraded to plain text search',
      payload: { query },
    });
    return NextResponse.json({ ok: false, reason: 'AI search is not configured.' });
  }

  const { carriers, departments } = getDistinctFilterValues();
  const today = new Date().toISOString().slice(0, 10);

  try {
    const client = new Anthropic({ timeout: TIMEOUT_MS });
    const response = await client.messages.create({
      model: MODEL,
      max_tokens: 512,
      system: [
        "You turn a Bosch plant operator's natural-language parcel search into a structured filter.",
        `Today's date is ${today} (ISO-8601).`,
        `Known carriers: ${carriers.join(', ') || '(none seeded yet)'}.`,
        `Known departments: ${departments.join(', ') || '(none seeded yet)'}.`,
        'Internal milkrun transit items use the carrier name "Internal Milkrun".',
        'Only set fields the query actually implies — never invent a carrier, department, or date that was not mentioned or clearly implied.',
      ].join(' '),
      tools: [
        {
          name: 'apply_filter',
          description: "Apply structured filter criteria extracted from the operator's natural-language query.",
          strict: true,
          input_schema: AI_SEARCH_TOOL_INPUT_SCHEMA,
        },
      ],
      tool_choice: { type: 'tool', name: 'apply_filter' },
      messages: [{ role: 'user', content: query }],
    });

    const toolUse = response.content.find(
      (b): b is Anthropic.ToolUseBlock => b.type === 'tool_use',
    );
    if (!toolUse) {
      logOpsEvent({ kind: 'AI_SEARCH', decision: 'SKIPPED', reason: 'Model returned no structured filter', payload: { query } });
      return NextResponse.json({ ok: false, reason: 'The model did not return a structured filter.' });
    }

    const parsed = AiSearchFilterSchema.safeParse(toolUse.input);
    if (!parsed.success) {
      logOpsEvent({ kind: 'AI_SEARCH', decision: 'SKIPPED', reason: 'Model output failed Zod validation', payload: { query } });
      return NextResponse.json({ ok: false, reason: 'The model returned an invalid filter.' });
    }

    logOpsEvent({
      kind: 'AI_SEARCH',
      decision: 'OK',
      reason: parsed.data.explanation,
      payload: { query, filter: parsed.data },
    });

    return NextResponse.json({ ok: true, filter: parsed.data });
  } catch (e) {
    logOpsEvent({
      kind: 'AI_SEARCH',
      decision: 'SKIPPED',
      reason: `AI search unreachable — ${e instanceof Error ? e.message : 'unknown error'}`,
      payload: { query },
    });
    return NextResponse.json({ ok: false, reason: 'AI search is temporarily unavailable.' });
  }
}
