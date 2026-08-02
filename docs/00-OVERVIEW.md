> **⚠ SCOPE NOTE.** Current scope is Bosch use case §3.2 only — see [`09-SCOPE-CONFERENCE-DEMO.md`](./09-SCOPE-CONFERENCE-DEMO.md).
> App 1 material below (gates G1–G10, the rules engine, the XML endpoint) is informational. The stack in §4.2 is superseded: SQLite replaces Postgres/Docker for the conference build. Everything else — the brief analysis, deviations, and risks R3/R4/R5/R9/R12 — still applies.

# Bosch Live Demo — Project Overview & Architecture

**Source:** `Live_Demo_Guideline_Workflow_Bosch.pdf` (Section 3, 13 pages)
**Client:** Robert Bosch GmbH — plant operations (MOE/LOG-A, MOE/ENG-2, MOE/MFG-P)
**Vendor:** Iotivata
**Doc owner:** Ibaa Ibrahim
**Status:** Draft v1.0

---

## 1. What this engagement actually is

This is **not** a design review or a slide deck exercise. It is a **live, adversarial bake-off**. Two facts from the brief define everything:

> *"During the presentation, we will be changing the values within the XML payload live to test the dynamic behaviour of your system."* (§3.1.3.1)

> *"We will provide all required location QR-Codes and carrier labels during the session. There is no need for you to prepare any codes or labels in advance."* (§3.2.2)

Bosch will type new values into an XML body and press send, and they will hold up barcodes we have never seen. **Anything hardcoded to a happy path fails visibly, on stage, in front of the decision makers.** Every branch in the business logic must be genuinely executable.

The counterweight is Section 3's opening, which is unusually generous:

> *"Please consider all these details as one possible solution proposal from our side, not as a rigid specification. We explicitly encourage you to choose a different technical approach if it is smarter, more efficient, or more native to your platform. The critical requirement for us is that the final implementation correctly and completely covers the described use case with all its functional steps and results.*
> *This means: The "What" (business process) is fixed, the "How" (technical implementation) is at your discretion."*

**Interpretation:** Table names, column names, button labels and screen texts in the PDF are *suggestions*. The **decision points, the routing outcomes, and the persisted results** are contractual. We are free — and implicitly rewarded — for a more elegant implementation, provided every branch still resolves to the specified outcome.

**Our stance:** implement the business process exactly, but present it through a materially better interface and a visibly more robust engine than a literal reading would produce. Where we deviate from a suggested detail, we note the deviation and the reason in the spec so it can be defended in the room.

---

## 2. Scope — three applications, two use cases

| # | App | Use case | Primary user | Device | Nature |
|---|-----|----------|--------------|--------|--------|
| **App 1** | AI-Powered Machine Alarm | §3.1 | Technician / Supervisor | Phone (portrait) | Event-driven task workflow |
| **App 2** | Inbound Registration | §3.2.2.1 | Goods-receipt operator | Phone (portrait) | Linear guided wizard |
| **App 3** | Parcel Status Dashboard | §3.2.2.2 | Shift leader / any employee | Tablet + desktop, phone-capable | Read-only data hub |

**A note on numbering.** The PDF numbers the two apps *within* use case §3.2 — Inbound Registration is its "App 1" and the dashboard is its "App 2". Because we are specifying all three applications together, we number them globally: the machine alarm is App 1, Inbound Registration is App 2, the dashboard is App 3. Where these documents quote the PDF, the original numbering is preserved inside the quotation. In writing and speaking to Bosch, **use their numbering** to avoid confusion — say "the inbound app" and "the parcel status dashboard" rather than a number wherever possible.

Apps 1 and 2 are **shop-floor tools**: gloved hands, poor lighting, one-handed operation, high urgency, low patience. App 3 is a **monitoring surface**: dense, scannable, filterable.

They share one platform, one auth model, one design system and one database. Presenting them as one product — not three demos — is itself a selling point.

---

## 3. The graded moments

These are the specific instants where Bosch is watching to see if we are real. Each maps to acceptance tests in `07-DEMO-RUNBOOK.md`.

### App 1

| # | Trigger | Correct behaviour | Failure signature |
|---|---------|-------------------|-------------------|
| G1 | `lineNo` changed 31 → 10 | Notification goes to the Line-10 technicians only; Line-31 phones stay silent | Wrong phone buzzes |
| G2 | `errorNo` changed 50 → 70 | Solution dropdown swaps to belt options; technician may self-close | Barcode options still shown |
| G3 | `errorNo` = 50, actor is Technician | Close button reads **"Request 4-Eyes Release"**, escalates | Task closes without supervisor |
| G4 | `errorNo` = 50, actor is Supervisor | Close button reads **"Close Task"**, closes directly | Pointless self-escalation |
| G5 | `errorType` 1 → 2 | Task priority drops from High to Low, visibly | Priority is cosmetic/static |
| G6 | **`errorState` 0 → 1** | Any live task for that machine **auto-archives in the background** | New task created — "ghost alarm" |
| G7 | **`operationMode` 1 → 3** | Payload accepted, **no task, no notification**, ingest log shows "ignored: manual mode" | A task appears |
| G8 | Both technicians decline every offer round (`maxOfferRounds`, default 3) | Notification resent each round, then **escalated to the Supervisor**, bypassing technicians | Task orphaned or loops forever |
| G9 | AI chat asked an unscripted follow-up | Coherent, grounded answer with a manual page reference | Canned text, obvious mismatch |
| G10 | Task closed | New DB_Shiftbook row visible with operator ID, error code, solution, timestamp, photo, comment, supervisor ID | Nothing persisted |

**G6 and G7 are the two traps.** They exist to catch vendors who wired the demo to always create a task. We must make both *visible* — an ingest console that shows the payload arriving and the engine's decision ("IGNORED — operationMode=3, technician already at machine") turns a silent non-event into a demonstration of intelligence.

### App 2

| # | Trigger | Correct behaviour | Failure signature |
|---|---------|-------------------|-------------------|
| G11 | Unknown / malformed label scanned | Screen turns **red**, "Invalid Format!", blocks, allows rescan | Accepts anything |
| G12 | Valid DHL/UPS/GLS/Amazon label | Screen turns **green**, carrier auto-detected and named | Carrier hardcoded |
| G13 | SAP PO entered, 9 digits | "Next" stays disabled until exactly 10 | Submits early |
| G14 | SAP PO `4500987654` | Returns John Doe / MOE/LOG-A → proposes `RACK-A-05` (dept rack, vacant) | Proposes an occupied rack |
| G15 | No PO, name "Alice Wonderland" | AD lookup → MOE/LOG-A → dept-rack cascade | AD not consulted |
| G16 | No PO, name "Unknown" | No AD query; falls through to general rack → trolley | Crashes or invents a recipient |
| G17 | Department racks all occupied | Falls back to a vacant **general** rack (`assigned_department` NULL) | Proposes an occupied location |
| G18 | General racks occupied too | Proposes `TROLLEY-01` | Dead end |
| G19 | **Wrong QR scanned at the rack** | Screen turns **red**, shows expected vs scanned, **hard-blocks** | Lets it through |
| G20 | Correct QR scanned | Green, "Location verified", proceeds | — |
| G21 | Stored in a RACK, recipient has an email | Email dispatched, visible in the mock inbox | Silent |
| G22 | Stored on a TROLLEY, or no email on file | **No email** — dispatch skipped | Spurious email sent |
| G23 | Completion | `tbl_parcels` INSERT + `tbl_storage_locations.is_occupied = TRUE` | Location stays vacant, next parcel collides |

### App 3

| # | Trigger | Correct behaviour |
|---|---------|-------------------|
| G24 | App 2 completes a registration | The new parcel appears in the dashboard **within seconds, without a manual refresh** |
| G25 | Filter by carrier / date / recipient / status | Correct subset, instantly |
| G26 | Look at the data | Internal milkrun rows (`MR-2026-…`, `IN_TRANSIT`) sit alongside App 2 rows — proving it is a *unified* hub |

The live App 2 → App 3 handoff (G24) is the single strongest moment available to us. Register a parcel on the phone, and have the dashboard on the projector update in front of them. Plan the room setup around it.

---

## 4. Architecture

### 4.1 Principles

1. **One deployable.** Three apps, one Next.js application, three route groups. Reinforces "platform", not "prototype collection".
2. **The rules engine is a pure, testable module.** `evaluate(payload) → Decision`. No I/O, no framework. Unit-tested against every branch. This is the artefact that makes the live-XML test safe.
3. **Every external system is a swappable adapter.** SAP, Active Directory, SMTP, push. Mock implementations behind a real interface — so "how would this connect to our actual SAP?" has a one-sentence answer.
4. **Everything that happens is observable.** An ingest/event console shows raw payload in, decision out, side effects fired. Turns invisible correctness (G6, G7, G22) into visible competence.
5. **Optimistic UI, pessimistic validation.** Instant screen response; the server is still the authority on every gate.

### 4.2 Stack

| Layer | Choice | Rationale |
|-------|--------|-----------|
| Framework | **Next.js 15, App Router, TypeScript strict** | One codebase for mobile PWA + desktop dashboard; API routes give us the XML endpoint natively |
| UI | **Tailwind CSS v4** + custom Bosch token layer | Full control of the brand system; no fighting a third-party theme |
| Primitives | **Radix UI** (headless) | Accessibility and focus management for free; zero visual opinion |
| Motion | **Framer Motion** | Screen transitions, the red/green state flips, task-card choreography |
| Icons | **Lucide** | Consistent 1.5px stroke, industrial feel |
| DB | **PostgreSQL 16** + **Drizzle ORM** | Real SQL, real constraints, real transactions; Drizzle keeps the schema readable on screen |
| Realtime | **Postgres LISTEN/NOTIFY → SSE** | Dashboard live-updates and push simulation without a WebSocket dependency |
| XML | **fast-xml-parser** | Attribute-heavy payload, strict mode, schema-validated |
| Validation | **Zod** | One schema definition drives parsing, API contracts and forms |
| Scanning | **`BarcodeDetector` API**, fallback **ZXing-wasm** | Native on Android Chrome; wasm fallback for iOS Safari |
| AI | **Claude (Anthropic API)** + **pgvector** RAG | Grounded, unscripted answers with manual page citations |
| Mock SMTP | **MailHog** (or in-app inbox view) | Email visible on screen instead of "trust us, it sent" |
| Push | **Web Push (VAPID)** + in-app SSE fallback | Real lock-screen notification on the demo phones |
| Tests | **Vitest** (engine) + **Playwright** (E2E) | Every gate G1–G26 asserted in CI |
| Deploy | **Docker Compose**, single host, plus a Vercel mirror | Must run offline on a laptop + local Wi-Fi if the venue network fails |

### 4.3 Component map

```
                       ┌──────────────────────────────┐
   Bosch's API client ─┼─► POST /api/telegram (XML)   │
   (live payload edit) │                              │
                       │   ┌──────────────────────┐   │
                       │   │  XML Parse + Zod     │   │
                       │   └──────────┬───────────┘   │
                       │              ▼               │
                       │   ┌──────────────────────┐   │
                       │   │   RULES ENGINE       │   │  pure fn, 100% unit-tested
                       │   │  A lineNo            │   │
                       │   │  B statNo/process    │   │
                       │   │  C errorNo           │   │
                       │   │  D errorText         │   │
                       │   │  E errorType         │   │
                       │   │  F errorState  ◄─ G6 │   │
                       │   │  G operationMode ◄G7 │   │
                       │   └──────────┬───────────┘   │
                       │              ▼               │
                       │   Decision: CREATE_TASK |    │
                       │   AUTO_ARCHIVE | IGNORE      │
                       └──────┬───────────────┬───────┘
                              ▼               ▼
                    ┌──────────────┐   ┌──────────────┐
                    │ Task Service │   │ Ingest Log   │──► Ops Console (projector)
                    │ + Assignment │   └──────────────┘
                    │ + Escalation │
                    └──────┬───────┘
                           ▼
              ┌────────────────────────┐
              │  Push / SSE Dispatcher │──► App 1 on technician phones
              └────────────────────────┘

   App 2 (phone) ──► /api/inbound/* ──┐
                                      ├──► PostgreSQL ──► LISTEN/NOTIFY ──► SSE ──► App 3
   Milkrun seed / simulator ──────────┘
                                      └──► Adapters: SAP_ERP · Active Directory · SMTP
```

### 4.4 Repository layout

```
bosch-demo/
├─ docker-compose.yml
├─ src/
│  ├─ app/
│  │  ├─ (alarm)/            App 1 routes
│  │  ├─ (inbound)/          App 2 routes
│  │  ├─ (dashboard)/        App 3 routes
│  │  ├─ (ops)/console/      Ingest & event console (demo control surface)
│  │  └─ api/
│  │     ├─ telegram/        POST XML endpoint
│  │     ├─ tasks/           accept, decline, solve, escalate, approve, close
│  │     ├─ inbound/         validate, sap, ad, propose-location, verify, finalize
│  │     ├─ parcels/         query + SSE stream
│  │     ├─ ai/              chat + RAG retrieval
│  │     └─ events/          SSE hub
│  ├─ engine/                ⭐ pure rules engine — no imports from app/
│  │  ├─ alarm-rules.ts
│  │  ├─ routing.ts
│  │  ├─ escalation.ts
│  │  ├─ location-cascade.ts
│  │  └─ carrier-format.ts
│  ├─ adapters/              sap.ts · directory.ts · smtp.ts · push.ts
│  ├─ db/                    schema.ts · seed.ts · migrations/
│  ├─ design/                tokens.css · components/
│  └─ lib/
├─ tests/
│  ├─ unit/engine/           one file per gate group
│  └─ e2e/                   Playwright, G1–G26
└─ docs/                     this folder
```

---

## 5. Deviations from the PDF's suggested implementation

Each is a deliberate improvement, defensible under the "How is at your discretion" clause. Each is also **reversible** — if Bosch pushes back, we can conform in minutes.

| # | PDF suggests | We do | Why |
|---|--------------|-------|-----|
| D1 | Two flat tables (`DB_Shiftbook`, `tbl_parcels`) | `tbl_parcels` and `tbl_storage_locations` are built as **real tables with the PDF's exact names and columns**. `DB_Shiftbook` is a **SQL view** over a normalised task model. Append-only companions (`task_events`, `parcel_events`, `ingest_log`) carry the audit trail | Full audit trail and idempotency, while `SELECT * FROM "DB_Shiftbook"` and `SELECT * FROM DB_Parcel_Platform.tbl_parcels` on the projector still return literally what the PDF specifies |
| D2 | "Take photo proof" | Photo + auto-stamped metadata (timestamp, error code, operator, station) burned into a corner overlay | Evidence that stands up to an audit; costs nothing |
| D3 | Dropdown of solutions | Same options, presented as large tappable cards; "Other" opens a free-text field which is **persisted** | Gloved hands; and free-text "Other" feeds future AI training — a talking point |
| D4 | AI chat as a modal window | Chat available as a bottom sheet that **retains the task context** and can be reopened at any step | Realistic usage; no lost context |
| D5 | Escalation = "resend once, then supervisor" | Same rule, plus a **visible countdown timer** on the task and a live escalation trail | Makes an otherwise invisible rule watchable on stage |
| D6 | Dashboard format left open | Dual-mode: **live board** (cards, realtime, big-screen) and **data table** (dense, sortable, exportable), one toggle | §3.2.2.2 explicitly invites us to show platform strength |
| D7 | "System sends email to recipient" | Real SMTP call to a local MailHog; an **in-app Inbox view** shows the delivered mail during the demo | Proves it, not just claims it |
| D8 | Manual QR/barcode entry not mentioned | Camera scanning primary, with a **discreet manual-entry fallback** | Venue lighting insurance; never blocks the demo |
| D9 | §3.2.4 D sets `is_occupied = TRUE` unconditionally on storage | Applied to **RACK locations only** | §3.2.3.1 states `TROLLEY-01` is "always available for transit"; the literal reading would break the Priority 3 fallback after one trolley storage. Config flag reverts. Raised as Q23 |

---

## 6. Risk register

| ID | Risk | Impact | Likelihood | Mitigation |
|----|------|--------|-----------|------------|
| R1 | Venue Wi-Fi fails / no internet | Demo dead | Medium | Full offline mode: local Docker on a laptop, own travel router, phones on that SSID. AI falls back to a cached-response mode with a visible "offline" badge. **Rehearse the offline path.** |
| R2 | Bosch sends an XML shape we didn't anticipate (extra attributes, missing fields, different order) | Parse crash on stage | Medium-High | Lenient parse + strict validate. Unknown attributes ignored and logged. Missing optional fields default. Malformed XML returns a clean 400 with a readable reason **displayed in the ops console** — a graceful failure still looks competent |
| R3 | Their carrier label is a format not in the four regexes (e.g. a DPD or FedEx label) | "Invalid format" on a label they consider valid | Medium | Behaviour is *correct* per §3.2.4 — hold the line and say so. Additionally show an admin screen where a **new carrier pattern can be added in 15 seconds**, live. Turns a rejection into a feature demo |
| R4 | Their location QR encodes a value not in `tbl_storage_locations` | Verification can never succeed | Medium | Pre-seed the exact IDs from §3.2.3.1 (`RACK-A-04/05`, `RACK-C-12/13`, `TROLLEY-01`). Plus an admin "register this location" action from the scan-mismatch screen |
| R4b | Their QR is a URL or JSON, not a bare location ID | Mismatch | Medium | Normaliser: trim, uppercase, strip URL prefix, extract a known ID substring before comparison |
| R5 | iOS Safari lacks `BarcodeDetector` | Scanner dead on an iPhone | High if they use iOS | ZXing-wasm fallback bundled and **tested on the actual demo device**. Demo on Android where we control the device |
| R6 | AI produces a wrong or embarrassing answer | Credibility hit | Medium | Tight RAG grounding, low temperature, refuse-when-unsure prompt, mandatory source citation. Pre-test the 20 most likely questions |
| R7 | AI latency > 5s | Dead air | Medium | Stream tokens, show retrieved manual snippets immediately while generating, warm the connection before the session |
| R8 | Push notification doesn't arrive on the demo phone | Kills the opening beat of App 1 | Medium | Dual channel: Web Push **and** an always-open SSE connection driving an in-app banner + sound + vibration. Phones stay awake, screens on, app foregrounded |
| R9 | Camera permission prompt appears mid-demo | Awkward pause | High | Grant permissions during setup; a pre-flight checklist screen verifies camera, notifications, network and DB before the session |
| R10 | Nobody notices the G6/G7 non-events | We look like we ignored the requirement | High | The ops console makes the decision explicit and audible: "IGNORED — operationMode=3". Narrate it deliberately |
| R11 | Duplicate telegrams / double-submit | Duplicate tasks | Low | Idempotency key on `(eventId, lineNo, statNo, errorNo, errorState)`; repeat within a window updates rather than inserts |
| R12 | Demo data drifts across rehearsals | Inconsistent behaviour on the day | High | One-command `pnpm demo:reset` restores the exact seed state. Run it between every rehearsal and immediately before the session |
| R13 | Time zone / timestamp confusion in the shiftbook | Confusing evidence | Low | Store UTC, display Europe/Berlin, label the timezone in the UI |

---

## 7. Success criteria

The demo is a success if, without any operator intervention beyond the scripted taps:

1. Every gate G1–G26 executes correctly on the first attempt.
2. Bosch changes at least three XML values live and the system responds correctly to each, including at least one of the two trap branches.
3. Bosch presents at least one QR code and one carrier label we have never seen, and the system handles both correctly — including a deliberate wrong-location scan.
4. The AI answers at least one unscripted question with a grounded, manual-cited response.
5. A parcel registered on the phone appears on the dashboard within 2 seconds, in front of the room.
6. Every completed transaction is visible as a persisted record in a database view whose columns match the PDF exactly.
7. No crash, no blank screen, no visible error that isn't a deliberate, styled validation state.

---

## 8. Reading order

| Doc | Contents |
|-----|----------|
| `00-OVERVIEW.md` | ← you are here |
| `01-DESIGN-SYSTEM.md` | Bosch brand tokens, component library, interaction & accessibility standards |
| `02-APP1-MACHINE-ALARM.md` | Full functional spec, App 1 |
| `03-APP2-INBOUND.md` | Full functional spec, App 2 |
| `04-APP3-DASHBOARD.md` | Full functional spec, App 3 |
| `05-DATA-MODEL.md` | DDL, views, seed fixtures, mock external systems |
| `06-BUILD-PLAN.md` | The master task list — phases, estimates, dependencies, acceptance criteria |
| `07-DEMO-RUNBOOK.md` | Stage script, payload variants, drills, full test matrix |
| `08-QUESTIONS-FOR-BOSCH.md` | Prioritised clarifications and our default assumptions |
