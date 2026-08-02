# Claude Code kickoff prompt

Open this folder in Claude Code and paste everything below the line.

---

I'm building a working demo for Bosch. Read `CLAUDE.md` and `docs/09-SCOPE-CONFERENCE-DEMO.md` first — they define the scope, the stack, and the 16 acceptance gates. Then read `docs/03-APP2-INBOUND.md` and `docs/04-APP3-DASHBOARD.md` for the screen-level specs.

**Context:** this is a live conference demo of Bosch use case §3.2 — an Inbound Registration mobile app and a Parcel Status Dashboard. Bosch will hold up carrier labels and location QR codes we have never seen, so nothing can be hardcoded to a happy path. App 1 (Machine Alarm) is explicitly out of scope; don't build it.

**Already written, don't rewrite:**

- `src/engine/` — the pure rules engine (carrier format matching, location cascade, QR verification, recipient resolution, email trigger). Every business rule from the PDF lives here as a pure function.
- `src/db/seed-data.ts` — all fixtures, with the PDF's rows reproduced verbatim.
- `src/design/tokens.css` — the complete Bosch design token layer.
- `tests/unit/` — Vitest specs covering acceptance gates C1–C14.

These have never been executed. **Your first job is to make them run.**

## Phase 1 — get the engine green

1. Scaffold Next.js 15 with App Router, TypeScript strict, Tailwind v4, into this existing folder. Preserve `src/engine/`, `src/db/seed-data.ts`, `src/design/tokens.css`, `tests/`, `docs/` and `CLAUDE.md` exactly as they are.
2. Install and configure Vitest.
3. Run `npm test`. Fix any compile or import errors in my files — but **do not change asserted behaviour.** If a test fails because the implementation is genuinely wrong, fix the implementation, not the test. If you think a test's expectation is wrong, stop and ask me.
4. Add an ESLint boundary rule: nothing in `src/engine/**` may import from outside `src/engine/`.
5. Report back with the test results before continuing.

Do not write a single component until `npm test` is green.

## Phase 2 — data layer

6. Drizzle schema over SQLite (`better-sqlite3`) for `tbl_parcels`, `tbl_storage_locations`, `parcel_events`, `carrier_formats`, `location_reservations`, `mock_sap_orders`, `mock_directory_users`, `mock_emails`. Column names and types per `docs/05-DATA-MODEL.md` §3, adapted to SQLite (TEXT for enums, INTEGER for booleans, ISO-8601 strings for timestamps).
7. A seed script that loads everything from `src/db/seed-data.ts`, plus `npm run demo:reset` that wipes and reseeds to the exact same state every time. This gets run between every rehearsal — determinism is not optional.
8. Adapters in `src/adapters/` for SAP, Active Directory and SMTP. Real interfaces, mock implementations reading from the mock tables, ~250ms artificial latency so the loading states are real.

## Phase 3 — dashboard first

Build the dashboard before the inbound app. It proves the data layer works and gives us something to look at early.

9. Query API with filters (carrier, date, recipient, status), free-text search, sorting.
10. Table mode: filter rail, sortable columns, all six required fields visible per record.
11. Board mode: dark theme, KPI strip, live card grid, legible from four metres. This is what goes on the projector.
12. SSE endpoint plus client subscription, with a `● LIVE` indicator bound to the real connection state.

## Phase 4 — inbound wizard

Follow `docs/03-APP2-INBOUND.md` screen by screen. Every business decision must call the engine — never re-implement a regex or a cascade step in a route handler or a component.

13. Scanner abstraction: `BarcodeDetector` where available, ZXing-wasm fallback, and a manual-entry fallback on every scanner (the venue lighting will be bad and someone will deny a camera permission).
14. Scan → validate → full-screen red/green wash, using the exact strings exported from the engine.
15. SAP PO path: numeric input, Next disabled until exactly 10 digits, live `7 / 10` counter.
16. Manual path: name entry with type-ahead, an "Unknown" chip, directory lookup.
17. Location proposal screen with a "Why this location?" explainer driven by the cascade trace.
18. Location scan and verification. **The mismatch screen has no override, no skip, no way forward except scanning the right code.** This is the single most important interaction in the demo.
19. Finalisation in one transaction: insert parcel, mark the rack occupied (racks only), write events, dispatch or skip the email. Then the completion screen.
20. An Inbox view rendering dispatched emails, so we can show the mail on the projector seconds after storing the parcel.

## Phase 5 — ops console and AI

21. Ops console: event feed showing every decision **including skips with their reasons**, a health strip, admin screens for carrier patterns and storage locations, and a reset button.
22. Natural-language search on the dashboard per `docs/09-SCOPE-CONFERENCE-DEMO.md` §6 — the model returns a *validated structured filter object*, never SQL, and the filter chips visibly populate to show what it understood. It must degrade to plain text search if the model is unreachable.

## Phase 6 — harden

23. Playwright tests for gates C1–C16.
24. Verify it runs fully offline with no internet.
25. Test on a real phone: camera, scanning, PWA install.

## How I want you to work

- Show me the test results after Phase 1 before moving on.
- Check in after each phase rather than running to the end.
- If a spec is ambiguous or a decision has real trade-offs, ask instead of guessing.
- Every disabled control needs to explain why it's disabled.
- Prefer fewer, better-built screens over more, rougher ones. This gets projected in front of a room.

Start with Phase 1.
