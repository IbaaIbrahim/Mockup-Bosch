# Bosch §3.2 Demo — Project Guide

Working demo of Bosch use case §3.2: **Inbound Registration** (mobile) + **Parcel Status Dashboard**. Built for a live conference presentation.

## Read first

- `docs/09-SCOPE-CONFERENCE-DEMO.md` — **the authoritative plan.** Scope, stack, gates, build order, demo script.
- `docs/03-APP2-INBOUND.md` — inbound app spec, screen by screen
- `docs/04-APP3-DASHBOARD.md` — dashboard spec
- `docs/05-DATA-MODEL.md` — schema and seed data
- `docs/01-DESIGN-SYSTEM.md` — design tokens and components
- `docs/Live_Demo_Guideline_Workflow_Bosch.pdf` — the source requirements

**Out of scope:** App 1 / Machine Alarm (`docs/02-APP1-MACHINE-ALARM.md`). Do not build it. Do not add task, alarm, telegram or shiftbook tables.

## What this demo has to survive

Bosch will hold up **carrier labels and location QR codes we have never seen** (§3.2.2). Nothing may be hardcoded to a happy path. Two behaviours are non-negotiable:

1. **A wrong location scan hard-blocks.** No override, no skip, no "continue anyway". §3.2.2.1: *"The process is blocked until the proposed location is scanned."*
2. **An invalid label is rejected and the operator rescans.** §3.2.2.1: *"The operator must scan again until the format is valid."*

Both are *features*. Present them as refusals the system makes on purpose.

## Already built — do not rewrite

| Path | What |
|------|------|
| `src/engine/` | Pure rules engine: carrier matching, location cascade, QR verification, recipient resolution, email trigger. **Fully specified and unit-tested.** |
| `src/db/seed-data.ts` | All fixtures. PDF rows verbatim + deterministic generator for ~120 parcels including milkruns. |
| `src/design/tokens.css` | Complete Bosch token layer, light + dark. |
| `tests/unit/` | Vitest specs mapped to acceptance gates C1–C14. |

**Run `npm test` before writing any UI.** If the engine tests pass, the business logic is correct and every remaining bug is a wiring bug. That distinction saves hours.

## Architecture rules

1. **`src/engine/**` must not import from outside `src/engine/`.** No database, no fetch, no React, no `Date.now()` inside a decision path. Purity is what makes it exhaustively testable, and testability is what makes the live demo safe. There is an ESLint boundary rule — do not disable it.
2. **All business decisions go through the engine.** Never re-implement a regex, a cascade step, or the email condition in a route handler or a component. If a rule feels missing, add it to the engine with a test.
3. **External systems sit behind adapters** in `src/adapters/` (`sap.ts`, `directory.ts`, `smtp.ts`). Mock implementations against a real interface, so "how would this connect to our SAP?" has a one-sentence answer. Give them ~250ms of artificial latency — an instant "SAP lookup" looks fake.
4. **Every decision is observable.** Anything the engine decides — especially a *skip* — writes an event row and surfaces in the ops console. Gates C7 and C14 are "nothing happened" moments; invisible correctness scores zero.
5. **No raw values in components.** No hex, no px in padding/margin/gap, no durations. Tokens only.

## Stack

Next.js 15 (App Router, TypeScript strict) · Tailwind v4 over `tokens.css` · SQLite via `better-sqlite3` + Drizzle · SSE for realtime · `BarcodeDetector` with ZXing-wasm fallback · Vitest + Playwright.

**No Docker, no Postgres, no external services.** It must run with `npm install && npm run dev` on a laptop with no internet. The venue network will fail; plan for it.

## Layout

```
src/
  app/
    (inbound)/          Mobile wizard — scan → identify → propose → verify → store
    (dashboard)/        Board / Table / Mobile views
    (ops)/console/      Event log, health, admin, reset
    api/
      inbound/          validate · sap · directory · propose · verify · finalize
      parcels/          query + SSE stream
      ai/search/        natural-language → structured filter
  engine/               ⭐ pure, tested, do not pollute
  adapters/             sap · directory · smtp
  db/                   schema.ts · seed-data.ts · seed.ts · client.ts
  design/               tokens.css + components
tests/
  unit/                 engine specs
  e2e/                  Playwright, gates C1–C16
docs/                   specs
```

## Commands

```bash
npm run dev          # localhost:3000
npm test             # Vitest — engine specs
npm run test:e2e     # Playwright — acceptance gates
npm run demo:reset   # restore exact seed state — run between every rehearsal
npm run typecheck
npm run lint
```

## Conventions

- TypeScript strict. No `any`. Discriminated unions over boolean flags for state.
- Server Components by default; `"use client"` only where interactivity requires it.
- Zod at every boundary: API input, AI output, form submission.
- Errors are designed states, never a thrown stack trace reaching the user.
- Every disabled control explains *why* it is disabled. Two screens depend on this.
- Strings the PDF specifies are used **verbatim** — they are exported as constants from the engine. Do not reword them.
- Comments explain *why*, and cite the PDF section when a rule looks arbitrary. Most of them are not arbitrary.

## Acceptance gates

16 gates, C1–C16, in `docs/09-SCOPE-CONFERENCE-DEMO.md` §5. Every one needs a passing test before the conference. The two to build the demo around:

- **C10** — wrong QR hard-blocks, showing expected vs scanned
- **C16** — a parcel registered on the phone appears on the dashboard within 2 seconds, no refresh

## Traps to avoid

- **Don't let the dashboard show only app-created rows.** §3.2.2.2 requires data from other plant systems (milkruns). Easiest requirement in the brief to miss.
- **Don't mark trolleys occupied.** Racks only — see `shouldMarkOccupied()` and Q23. Marking trolleys occupied breaks the Priority 3 fallback after one storage.
- **Don't skip whitespace normalisation on scans.** Bosch's own sample tracking IDs contain a space and fail a naive regex.
- **Don't send an email for a trolley storage or an unknown recipient.** Both negative cases are demonstrated on stage.
- **Don't add an override to the location mismatch screen.** It will seem helpful. It defeats the entire use case.
