> **⚠ SUPERSEDED FOR CURRENT SCOPE** by [`09-SCOPE-CONFERENCE-DEMO.md`](./09-SCOPE-CONFERENCE-DEMO.md) §7.
> This plan covers all three apps as a four-week engineering build with Postgres and Docker. The current engagement is §3.2 only, AI-built immediately on SQLite. Phases 3–7 (App 1) and the Postgres infrastructure tasks do not apply.
> Still useful for: the design-system and dashboard task breakdowns, and for scoping App 1 if it returns.

# Master Build Plan

**170 tasks across 13 phases (Phase 0–12).** Estimates in **ideal engineering hours** for one senior full-stack engineer; parallelisable work is marked.

**Priority key** — `P0` demo fails without it · `P1` demo is visibly weaker without it · `P2` differentiator · `P3` nice to have.
**Track key** — `[FE]` frontend · `[BE]` backend · `[ENG]` rules engine · `[DS]` design system · `[DATA]` data/seed · `[AI]` AI · `[OPS]` infra/demo · `[QA]` test.

**Total ≈ 352 ideal hours.** Ideal hours are not calendar hours — apply your own focus factor. At a conventional 60% factor that is roughly **587 calendar hours**, or **four weeks for two engineers** working the parallel tracks below. P0+P1 alone is ≈ 271 ideal hours and lands in about three weeks for two; the fourth week buys P2, rehearsal and hardening.

Per-phase hour figures in the headings are the sum of that phase's line items. If you cut tasks, re-sum — do not trust the headline.

---

## Phase 0 — Foundations (16h)

| # | Task | Pri | Track | Est |
|---|------|-----|-------|-----|
| 0.1 | Init Next.js 15 + TypeScript strict + App Router | P0 | OPS | 1h |
| 0.2 | ESLint, Prettier, import ordering, strict tsconfig | P0 | OPS | 1h |
| 0.3 | Tailwind v4 setup wired to the token layer | P0 | DS | 1h |
| 0.4 | Docker Compose: Postgres 16 + pgvector + MailHog | P0 | OPS | 1.5h |
| 0.5 | Drizzle ORM setup, migration runner, `db:push` script | P0 | BE | 1.5h |
| 0.6 | Env config + Zod-validated runtime config module | P0 | BE | 1h |
| 0.7 | Route group scaffolding: `(alarm)`, `(inbound)`, `(dashboard)`, `(ops)` | P0 | FE | 1h |
| 0.8 | App shell, layouts, theme provider, dark mode toggle | P0 | FE | 2h |
| 0.9 | PWA: manifest, icons, service worker, installability | P1 | FE | 2h |
| 0.10 | Vitest + Playwright + CI workflow | P0 | QA | 2h |
| 0.11 | Lint rule banning raw hex / raw px / raw durations in components | P2 | DS | 1h |
| 0.12 | README with one-command local bring-up | P1 | OPS | 1h |

---

## Phase 1 — Design system (44h) · parallel with Phase 2

| # | Task | Pri | Track | Est |
|---|------|-----|-------|-----|
| 1.1 | `tokens.css` — full colour primitive + semantic scale | P0 | DS | 2h |
| 1.2 | Dark mode token overrides, contrast-verified | P1 | DS | 1.5h |
| 1.3 | Typography scale, font loading (Bosch Sans / Inter), tabular numerals | P0 | DS | 2h |
| 1.4 | Space / radius / elevation / motion tokens | P0 | DS | 1h |
| 1.5 | `Button` — 6 variants, sizes, loading, disabled-with-reason | P0 | DS | 3h |
| 1.6 | `Field` — label, helper, error, counter, numeric mode | P0 | DS | 2.5h |
| 1.7 | `AppBar` + `ProgressStepper` | P0 | DS | 2h |
| 1.8 | `StateWash` — full-screen success/error, icon, haptics, auto-advance | P0 | DS | 3h |
| 1.9 | `ScanFrame` — camera feed, reticle, scan line, manual fallback slot | P0 | DS | 4h |
| 1.10 | `TaskCard` — priority rail, countdown, accept/decline | P0 | DS | 3h |
| 1.11 | `SolutionOption` — selectable cards, "Other" expansion | P0 | DS | 2h |
| 1.12 | `StatusPill` — 3 states, pulsing transit dot | P0 | DS | 1h |
| 1.13 | `BottomSheet` — snap points, drag, scrim | P1 | DS | 2.5h |
| 1.14 | `DataTable` — sticky header, sort, virtualised | P1 | DS | 3h |
| 1.15 | `FilterBar` + filter chips | P1 | DS | 2h |
| 1.16 | `Timeline`, `EmptyState`, `Skeleton`, `Toast`, `KpiTile` | P1 | DS | 3h |
| 1.17 | Motion presets + `prefers-reduced-motion` handling | P1 | DS | 1.5h |
| 1.18 | Storybook build with every component + states | P2 | DS | 3h |
| 1.19 | Accessibility audit pass — focus, roles, live regions, contrast | P1 | DS | 2h |

---

## Phase 2 — Data layer (24h) · parallel with Phase 1

| # | Task | Pri | Track | Est |
|---|------|-----|-------|-----|
| 2.1 | Schema: lines, stations, skills, error_codes | P0 | DATA | 1.5h |
| 2.2 | Schema: users, user_lines, user_skills | P0 | DATA | 1h |
| 2.3 | Schema: tasks, task_offers, task_events, task_photos | P0 | DATA | 2.5h |
| 2.4 | Schema: solution_options | P0 | DATA | 0.5h |
| 2.5 | Schema: ingest_log with rule_trace JSONB | P0 | DATA | 1h |
| 2.6 | Schema: tbl_parcels, parcel_events, tbl_storage_locations | P0 | DATA | 2h |
| 2.7 | Schema: carrier_formats, location_reservations | P0 | DATA | 1h |
| 2.8 | Schema: mock_sap_orders, mock_directory_users, mock_emails | P0 | DATA | 1h |
| 2.9 | Schema: ai_conversations, ai_messages, manual_documents, manual_chunks + pgvector | P1 | DATA | 1.5h |
| 2.10 | View `DB_Shiftbook` matching §3.1.3.2 column-for-column | P0 | DATA | 1h |
| 2.11 | Schema `DB_Parcel_Platform` so the qualified name resolves | P1 | DATA | 0.5h |
| 2.12 | Indexes incl. the partial open-task index and trigram indexes | P0 | DATA | 1h |
| 2.13 | Seed: reference data, users, skills, error codes, solution options | P0 | DATA | 2h |
| 2.14 | Seed: storage locations incl. the deliberately-full ENG-2 racks | P0 | DATA | 1h |
| 2.15 | Seed: shiftbook history (3 verbatim + ~20 generated) | P1 | DATA | 1.5h |
| 2.16 | Seed: ~120 parcels incl. ~35 milkrun rows + the 3 verbatim rows | P0 | DATA | 2.5h |
| 2.17 | Seed: `mock_sap_orders` (3 verbatim + 2 NULL-branch rows) and `mock_directory_users` (4 verbatim + Alice alias) | P0 | DATA | 1h |
| 2.18 | `pnpm demo:reset` — truncate + reseed to an exact known state | P0 | OPS | 1.5h |

---

## Phase 3 — Rules engine (26.5h) · **the highest-value phase**

Pure functions, no I/O, no framework imports. This is the artefact that makes live payload editing safe.

| # | Task | Pri | Track | Est |
|---|------|-----|-------|-----|
| 3.1 | XML parser wrapper (fast-xml-parser), lenient attribute handling | P0 | ENG | 2h |
| 3.2 | Zod telegram schema + coercion + unknown-field preservation | P0 | ENG | 2h |
| 3.3 | Rule G — `operationMode` (1 continue / 3 IGNORE / unknown→1+warn) | P0 | ENG | 1h |
| 3.4 | Rule F — `errorState` (0 continue / 1 AUTO_ARCHIVE) | P0 | ENG | 1.5h |
| 3.5 | Rule A — `lineNo` → candidate pool from `user_lines` | P0 | ENG | 1.5h |
| 3.6 | Rule C — `errorNo` → skill filter + four-eyes policy from `error_codes` | P0 | ENG | 2h |
| 3.7 | Rule E — `errorType` → priority + escalation window | P0 | ENG | 1h |
| 3.8 | Rule D — `errorText` resolution incl. the errorState=1 "acknowledge" case | P0 | ENG | 1h |
| 3.9 | Rule B — station/process display string assembly | P0 | ENG | 0.5h |
| 3.10 | `evaluate()` orchestrator returning the `Decision` union | P0 | ENG | 2h |
| 3.11 | Rule-trace emitter (ordered, human-readable, feeds the Ops Console) | P1 | ENG | 2h |
| 3.12 | Idempotency key derivation + dedup window | P1 | ENG | 1.5h |
| 3.13 | Escalation state machine (rounds, timeouts, supervisor bypass) | P0 | ENG | 3h |
| 3.14 | Location cascade P1→P2→P3, deterministic ordering | P0 | ENG | 2h |
| 3.15 | Carrier format matcher — normalisation + ordered pattern evaluation | P0 | ENG | 2h |
| 3.16 | QR/location value normaliser (URL, JSON, whitespace, case) | P1 | ENG | 1.5h |

---

## Phase 4 — App 1 backend (25h)

| # | Task | Pri | Track | Est |
|---|------|-----|-------|-----|
| 4.1 | `POST /api/telegram` — accept XML, all content types | P0 | BE | 2h |
| 4.2 | Wire engine → decision → response bodies incl. `reason` | P0 | BE | 2h |
| 4.3 | Task creation service + offer records + transaction | P0 | BE | 2.5h |
| 4.4 | Auto-archive service: match open tasks, close, retract notification | P0 | BE | 2.5h |
| 4.5 | Ignore path: log-only, no side effects, explanatory response | P0 | BE | 1h |
| 4.6 | Accept endpoint with race-safe conditional update | P0 | BE | 2h |
| 4.7 | Decline endpoint + round tracking + resend trigger | P0 | BE | 2h |
| 4.8 | Escalation scheduler (timeout job) + supervisor bypass | P0 | BE | 2.5h |
| 4.9 | Safety-ack, solution-select, photo-upload, comment endpoints | P0 | BE | 2.5h |
| 4.10 | Request-release + approve + reject endpoints | P0 | BE | 2h |
| 4.11 | Task close service → shiftbook write in one transaction | P0 | BE | 2h |
| 4.12 | Ingest log writer + rule-trace persistence | P1 | BE | 1h |
| 4.13 | Malformed-input handling: 400/422 with readable reasons | P0 | BE | 1h |

---

## Phase 5 — Notifications & realtime (16h)

| # | Task | Pri | Track | Est |
|---|------|-----|-------|-----|
| 5.1 | SSE hub with per-user channels and heartbeat | P0 | BE | 3h |
| 5.2 | Postgres LISTEN/NOTIFY triggers → hub bridge | P0 | BE | 2.5h |
| 5.3 | Web Push: VAPID keys, subscription storage, send service | P1 | BE | 3h |
| 5.4 | Service worker: notification display + Accept/Decline actions | P1 | FE | 3h |
| 5.5 | In-app fallback banner with sound + vibration | P0 | FE | 2h |
| 5.6 | Notification retraction on auto-archive and on accept-by-other | P1 | BE | 1.5h |
| 5.7 | Client reconnect with backoff + visible connection state | P1 | FE | 1h |

---

## Phase 6 — App 1 frontend (38h)

| # | Task | Pri | Track | Est |
|---|------|-----|-------|-----|
| 6.1 | Role switcher / demo login (Jane · Alice · John · Bob) | P0 | FE | 2h |
| 6.2 | S2 Task Inbox — list, sort, empty state, live updates | P0 | FE | 3h |
| 6.3 | Accept/Decline interaction + optimistic UI + "already taken" state | P0 | FE | 2.5h |
| 6.4 | Escalation countdown ring on offered tasks | P1 | FE | 1.5h |
| 6.5 | S3 Safety checklist — 3 items, gated Continue | P1 | FE | 2h |
| 6.6 | S4 Solutions screen — header, option cards, historical annotations | P0 | FE | 3h |
| 6.7 | "Other" free-text expansion + persistence | P0 | FE | 1h |
| 6.8 | S5 AI chat bottom sheet — streaming, citations, follow-up chips | P0 | FE | 5h |
| 6.9 | Inline manual viewer opening at a cited page | P2 | FE | 3h |
| 6.10 | S7 Photo capture — camera, review, retake, metadata overlay | P0 | FE | 4h |
| 6.11 | S8 Comment screen + conditional close-button logic | P0 | FE | 2.5h |
| 6.12 | S9 Supervisor approval screen — full detail, photo zoom, approve/reject | P0 | FE | 3h |
| 6.13 | S10 Completion wash + link to the shiftbook entry | P1 | FE | 1.5h |
| 6.14 | Live task dissolution UI when `errorState=1` arrives mid-workflow | P1 | FE | 2h |
| 6.15 | Offline/resume: persist wizard state, resume at last step | P2 | FE | 2h |

---

## Phase 7 — AI assistant (24h)

| # | Task | Pri | Track | Est |
|---|------|-----|-------|-----|
| 7.1 | Author 3 fictional machine manuals (~50 pages total, realistic) | P0 | AI | 5h |
| 7.2 | Chunking + embedding pipeline into `manual_chunks` | P0 | AI | 3h |
| 7.3 | Retrieval: hybrid vector + keyword, top-k, per-line filtering | P0 | AI | 3h |
| 7.4 | Context assembler: telegram + manual chunks + shiftbook history + user | P0 | AI | 2.5h |
| 7.5 | System prompt: grounding, citation requirement, refuse-when-unsure | P0 | AI | 2h |
| 7.6 | Streaming chat endpoint + conversation persistence | P0 | AI | 3h |
| 7.7 | Citation extraction → structured `{document, section, page}` chips | P1 | AI | 2h |
| 7.8 | Proactive opening message generated per error | P1 | AI | 1.5h |
| 7.9 | Offline response cache for ~20 anticipated questions + "Offline" badge | P1 | AI | 2h |

---

## Phase 8 — App 2 (34.5h)

| # | Task | Pri | Track | Est |
|---|------|-----|-------|-----|
| 8.1 | Scanner abstraction: `BarcodeDetector` + ZXing-wasm fallback | P0 | FE | 4h |
| 8.2 | S1 start screen — carrier chips, start scanning, manual entry | P0 | FE | 2h |
| 8.3 | Format validation endpoint + red/green wash wiring | P0 | FE/BE | 2.5h |
| 8.4 | Duplicate tracking ID detection + amber wash | P2 | FE/BE | 1.5h |
| 8.5 | S2 PO yes/no screen | P0 | FE | 1h |
| 8.6 | S2a PO input — numeric, 10-digit gate, live counter | P0 | FE | 2h |
| 8.7 | SAP adapter + lookup endpoint + not-found handling | P0 | BE | 2.5h |
| 8.8 | S2b name input — type-ahead, "Unknown" chip, enable-on-text | P0 | FE | 2.5h |
| 8.9 | AD adapter + fuzzy match + explicit "Unknown" skip path | P0 | BE | 2.5h |
| 8.10 | Location cascade endpoint + soft reservation | P0 | BE | 2h |
| 8.11 | S3 proposal screen + "Why this location?" explainer | P0 | FE | 2.5h |
| 8.12 | Location scan + verification + mismatch red wash (expected vs scanned) | P0 | FE/BE | 3h |
| 8.13 | Unknown-location handling + admin "register this location" | P2 | FE/BE | 1.5h |
| 8.14 | Finalisation transaction: insert, occupy, events, release | P0 | BE | 2h |
| 8.15 | S4 completion screen + elapsed time + register-next | P0 | FE | 1.5h |
| 8.16 | Wizard state persistence and resume | P2 | FE | 1.5h |

---

## Phase 9 — Email & adapters (10h)

| # | Task | Pri | Track | Est |
|---|------|-----|-------|-----|
| 9.1 | SMTP adapter → MailHog, with the exact subject/body template | P0 | BE | 2h |
| 9.2 | Trigger logic: RACK **and** email present; skip otherwise, logged | P0 | BE | 1.5h |
| 9.3 | Email resolution from AD on both SAP and non-SAP paths | P0 | BE | 1.5h |
| 9.4 | In-app Inbox view rendering delivered mail | P1 | FE | 3h |
| 9.5 | Adapter latency simulation + loading states | P2 | BE | 1h |
| 9.6 | Adapter interface documentation for real-system swap | P2 | BE | 1h |

---

## Phase 10 — App 3 (42h)

| # | Task | Pri | Track | Est |
|---|------|-----|-------|-----|
| 10.1 | Query API: filters, search, sort, pagination | P0 | BE | 3h |
| 10.2 | SSE stream endpoint for parcel changes | P0 | BE | 2h |
| 10.3 | Mode switcher (Board / Table / Mobile) with persistence | P1 | FE | 2h |
| 10.4 | Board mode — dark theme, KPI strip, auto-fit card grid | P0 | FE | 5h |
| 10.5 | Live-arrival animation + decaying highlight | P0 | FE | 2h |
| 10.6 | `● LIVE` / `RECONNECTING` indicator bound to real stream state | P1 | FE | 1.5h |
| 10.7 | Table mode — filter rail, sortable virtualised table | P0 | FE | 4h |
| 10.8 | Mobile mode — search-first layout, filter sheet, cards | P1 | FE | 3h |
| 10.9 | Four required filters + combined AND semantics + result count | P0 | FE | 3h |
| 10.10 | Free-text search across ID, recipient, location, department, PO | P1 | FE | 2h |
| 10.11 | URL-encoded filter state, shareable and reload-safe | P1 | FE | 1.5h |
| 10.12 | Detail drawer + event timeline + inline email | P1 | FE | 3h |
| 10.13 | "Find my parcels" shortcut | P2 | FE | 1h |
| 10.14 | Aging alert (>24h) + KPI tile | P2 | FE | 1.5h |
| 10.15 | Rack occupancy widget | P2 | FE | 2.5h |
| 10.16 | Saved views | P3 | FE | 2h |
| 10.17 | CSV export matching the filtered set | P2 | FE | 1.5h |
| 10.18 | Milkrun simulator (advances transit items every 30s) | P2 | BE | 1.5h |

---

## Phase 11 — Ops console & demo control (16h)

| # | Task | Pri | Track | Est |
|---|------|-----|-------|-----|
| 11.1 | Live ingest feed with decision pills | P1 | FE | 3h |
| 11.2 | Rule-trace pane, ordered and readable | P1 | FE | 2.5h |
| 11.3 | Raw XML / parsed object / side-effect inspector | P1 | FE | 2h |
| 11.4 | XML payload editor with one-click demo presets | P1 | FE | 3h |
| 11.5 | Health strip: DB, SSE clients, push subs, AI, camera permissions | P1 | FE | 2h |
| 11.6 | Admin: users, shift roster, error codes, carrier patterns, locations | P2 | FE | 3h |
| 11.7 | Reset-demo-data button with confirmation | P0 | FE | 0.5h |

---

## Phase 12 — Test, harden, rehearse (36h)

| # | Task | Pri | Track | Est |
|---|------|-----|-------|-----|
| 12.1 | Unit tests: every engine rule branch, ≥95% coverage | P0 | QA | 5h |
| 12.2 | Unit tests: location cascade, all four traces | P0 | QA | 1.5h |
| 12.3 | Unit tests: carrier regexes incl. the whitespace-normalisation cases | P0 | QA | 1h |
| 12.4 | Unit tests: escalation state machine, every transition | P0 | QA | 2h |
| 12.5 | E2E: gates G1–G10 (App 1) | P0 | QA | 4h |
| 12.6 | E2E: gates G11–G23 (App 2) | P0 | QA | 4h |
| 12.7 | E2E: gates G24–G26 (App 3) | P0 | QA | 1.5h |
| 12.8 | Fuzz the XML endpoint: malformed, truncated, extra fields, wrong types | P1 | QA | 2h |
| 12.9 | Device testing on the actual demo phones (camera, push, scan, PWA) | P0 | QA | 3h |
| 12.10 | Offline mode drill: kill the network, run the full script | P0 | OPS | 2h |
| 12.11 | Performance: 10k-row table, Lighthouse ≥90 | P2 | QA | 2h |
| 12.12 | Accessibility audit: axe clean, keyboard-only pass, reduced motion | P1 | QA | 2h |
| 12.13 | Full dress rehearsal ×3 with `demo:reset` between each | P0 | OPS | 4h |
| 12.14 | Failure drills: unknown carrier, unknown QR, AI down, push fails | P0 | OPS | 2h |

---

## Critical path

```
0.1–0.7 ─► 2.1–2.12 ─► 3.1–3.10 ─► 4.1–4.5 ─► 5.1–5.2 ─► 6.2–6.3 ─► 6.6–6.13
                    └─► 3.14–3.15 ─► 8.1–8.15 ─► 9.1–9.3 ─► 10.1–10.9
                                                          └─► 12.5–12.7 ─► 12.13
```

**Phase 3 is the true critical path.** It is small, it has no dependencies beyond the schema, and everything demo-critical depends on it. Build and fully test it before writing a single screen. If the schedule compresses, protect Phase 3 and Phase 12 and cut from Phase 10's showcase layer.

## Suggested two-engineer split

| Engineer A (backend-leaning) | Engineer B (frontend-leaning) |
|---|---|
| Phase 0 setup, Phase 2, Phase 3, Phase 4, Phase 5, Phase 9, Phase 10 API | Phase 1, Phase 6, Phase 8 UI, Phase 10 UI, Phase 11 |
| Phase 7 AI pipeline | Phase 7 chat UI |
| Phase 12 unit + fuzz | Phase 12 E2E + device + a11y |

Integration checkpoints at end of week 1 (engine + schema green), week 2 (App 1 end-to-end), week 3 (all three apps end-to-end), week 4 (rehearsals).

## Cut list, in order

If time runs short, cut in exactly this order — nothing above the line touches a graded gate.

1. 10.16 Saved views · 6.15 offline resume · 8.16 wizard resume
2. 10.15 Rack occupancy · 10.14 Aging alerts · 10.13 Find my parcels
3. 11.6 Admin screens (keep 11.7 reset) · 6.9 inline manual viewer
4. 1.18 Storybook · 12.11 performance testing
5. 10.8 Mobile mode (Board + Table cover the demo)
6. 5.3–5.4 Web Push — **only if** 5.5 in-app notification is rock solid

**Never cut:** anything in Phase 3, gates G1–G26, `demo:reset`, offline drill, or the three dress rehearsals.
