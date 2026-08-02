> **⚠ OUT OF CURRENT SCOPE.** We are building Bosch use case §3.2 only — see [`09-SCOPE-CONFERENCE-DEMO.md`](./09-SCOPE-CONFERENCE-DEMO.md).
> This specification is complete and remains valid. It is retained for a later phase and to support the "we specced it fully, we chose to implement §3.2 completely" position. See 09 §11 for what adding it would cost.

# App 1 — AI-Powered Machine Alarm

Source: PDF §3.1 (Overview, Step-by-Step, Mock Data, Business Logic)
Users: Technician, Supervisor · Device: phone, portrait · Mode: event-driven

---

## 1. Goal

> *"Inform a technician about a machine error and guide through the troubleshooting, utilizing AI assistance for fast resolution, and additionally enforcing a mandatory supervisor quality-release (Four-Eyes Principle)."* — §3.1.1

Five obligations, all graded:

1. Receive a live XML telegram and route it to exactly the right people.
2. Guide the technician through a structured resolution.
3. Provide genuinely useful AI assistance grounded in real plant context.
4. Enforce the Four-Eyes release **conditionally** — on error 50, for technicians only.
5. Persist a complete, auditable record.

---

## 2. Ingestion — the XML endpoint

### 2.1 Contract

```
POST /api/telegram
Content-Type: application/xml   (also accept text/xml, application/octet-stream)
Auth:  X-API-Key: <demo key>    (documented, but permissive in demo mode)
```

Reference payload (§3.1.3.1, verbatim):

```xml
<?xml version="1.0" encoding="UTF-8"?>
<root>
  <header eventId="12345" version="2.3" eventName="plcError" eventSwitch="-1" contentType="3">
    <location lineNo="31" statNo="20" statIdx="1" fuNo="1" processName="Paste Printer"
              processNo="120" application="IPC" />
  </header>
  <event>
    <plcError typeNo="0123456789" typeVar="0001" errorNo="50" errorText="Barcode not readable"
              errorType="1" errorState="0" operationMode="1" chainNo="999" />
  </event>
  <body/>
</root>
```

### 2.2 Parsing strategy

**Lenient parse, strict validate.** Unknown attributes and unknown elements are preserved into `raw_payload` and ignored by the engine — Bosch may add fields we have not seen (risk R2). Attribute values arrive as strings and are coerced by a Zod schema.

```ts
const TelegramSchema = z.object({
  header: z.object({
    eventId: z.string(),
    version: z.string().optional(),
    eventName: z.string(),                 // "plcError"
    eventSwitch: z.string().optional(),
    contentType: z.string().optional(),
    location: z.object({
      lineNo: z.string(),                  // "31" | "10"
      statNo: z.string(),
      statIdx: z.string().optional(),
      fuNo: z.string().optional(),
      processName: z.string(),             // "Paste Printer"
      processNo: z.string().optional(),
      application: z.string().optional(),
    }),
  }),
  event: z.object({
    plcError: z.object({
      typeNo: z.string().optional(),
      typeVar: z.string().optional(),
      errorNo: z.string(),                 // "50" | "70"
      errorText: z.string(),
      errorType: z.string(),               // "1" | "2"
      errorState: z.string(),              // "0" | "1"
      operationMode: z.string(),           // "1" | "3"
      chainNo: z.string().optional(),
    }),
  }),
});
```

### 2.3 Responses

| Condition | Status | Body |
|-----------|--------|------|
| Accepted, task created | `202` | `{ decision: "CREATE_TASK", taskId, assignedTo: [...], priority, reason }` |
| Accepted, error cleared | `202` | `{ decision: "AUTO_ARCHIVE", archivedTaskIds: [...], reason }` |
| Accepted, manual mode | `202` | `{ decision: "IGNORE", reason: "operationMode=3 — machine in manual mode" }` |
| Accepted, no matching staff | `202` | `{ decision: "ESCALATE_IMMEDIATE", reason: "no eligible technician" }` |
| Malformed XML | `400` | `{ error: "MALFORMED_XML", detail, hint }` |
| Schema violation | `422` | `{ error: "VALIDATION_FAILED", issues: [...] }` |

**Always return a human-readable `reason`.** Bosch's API client shows the response body — a clear explanation of *why nothing happened* is the difference between "it's broken" and "it's smart" on the two trap branches.

### 2.4 Idempotency

Key = `sha256(eventId | lineNo | statNo | errorNo | errorState)`. A repeat within 60s returns the original decision with `"deduplicated": true` rather than creating a second task (risk R11).

### 2.5 Ingest log

Every request — accepted or rejected — writes an `ingest_log` row (raw body, parsed object, decision, reason, latency, resulting task) and pushes an SSE event to the **Ops Console**. The console is the demo's narration device.

---

## 3. Business logic engine

`src/engine/alarm-rules.ts` — a pure function, zero I/O. Every rule below maps to a named unit test.

### 3.1 Evaluation order

Order matters. Suppressive rules run first so we never do work for an event that will be discarded.

```
1. operationMode   → may IGNORE          (§3.1.4 G)
2. errorState      → may AUTO_ARCHIVE    (§3.1.4 F)
3. lineNo          → candidate pool      (§3.1.4 A)
4. errorNo         → filter + closure policy (§3.1.4 C)
5. errorType       → priority            (§3.1.4 E)
6. errorText       → display text        (§3.1.4 D)
7. statNo / processName → display        (§3.1.4 B)
→ Decision
```

### 3.2 Rule G — `operationMode` (evaluated first)

| Value | Meaning | Action |
|-------|---------|--------|
| `1` | Automatic mode | Continue evaluation. Task will be created, notification sent. |
| `3` | Manual mode | **IGNORE.** No task, no notification. A technician is already at the machine. |
| other | Unspecified | Treat as `1`, log a warning. Fail toward creating the task — a spurious task is safer than a missed alarm. |

Ops console line: `IGNORED — operationMode=3, machine in manual mode, technician already present.` *(Gate G7)*

### 3.3 Rule F — `errorState`

| Value | Meaning | Action |
|-------|---------|--------|
| `0` | Error active | Continue. Create task, send push. |
| `1` | Error resolved by the machine itself (e.g. reset) | **AUTO_ARCHIVE.** Find all open tasks matching `(lineNo, statNo, errorNo)` and close them with `closure_reason = 'AUTO_RESOLVED'`. Retract the push notification. Any technician currently viewing the task sees a live "Resolved at the machine — no action needed" state. No new task. |

Rationale from §3.1.4 F: *"to prevent 'ghost alarms' (unnecessary walks to the machine)."*

This is the highest-value branch to make visible. When the technician's phone is mid-workflow and the task **dissolves in front of them** with an explanation, the room understands the value instantly. *(Gate G6)*

### 3.4 Rule A — `lineNo` → routing pool

> *"Identifies the physical location of the machine within the plant and restricts the task distribution to the correct team."*

| `lineNo` | Eligible staff (from §3.1.3.3) |
|----------|-------------------------------|
| `31` | Jane Smith, Alice Wonder (technicians); Bob Builder (supervisor) |
| `10` | John Doe, Jane Smith (technicians); Bob Builder (supervisor) |
| other | No eligible staff → `ESCALATE_IMMEDIATE` to any active supervisor, logged |

Implemented as a data lookup on `users.assigned_lines`, **not** a hardcoded branch. Adding Line 12 in the admin screen must work live. *(Gate G1)*

### 3.5 Rule C — `errorNo` → recipient filter + closure policy

| `errorNo` | Description | Recipient rule (§3.1.4 C) | Closure policy |
|-----------|-------------|---------------------------|----------------|
| `50` | Barcode error | **All active operators on the line** (no skill filter) | **Mandatory Four-Eyes**: a technician must request supervisor release. A supervisor may close directly. |
| `70` | Transport belt error | Only technicians on that line **holding the skill "Transport Belt Maintenance"** | Technician closes directly. |
| other | Unknown code | All active operators on the line; generic solution list + "Other" | Direct close, flagged `UNKNOWN_ERROR_CODE` in the log |

Worked example, Line 31 + error 70: Jane Smith holds only *Barcode Maintenance* → excluded. Alice Wonder holds *Transport Belt Maintenance* → included. This produces a **different recipient set from error 50 on the same line**, which is exactly the kind of thing Bosch will test. *(Gate G2)*

### 3.6 Rule E — `errorType` → priority

| Value | Meaning | Priority | UI |
|-------|---------|----------|-----|
| `1` | Error — stops automatic mode immediately, operator must support directly | **HIGH** | Red rail, "HIGH PRIORITY", high-urgency push, escalation timer 120s |
| `2` | Warning — does not stop automatic mode, operator must come soon | **LOW** | Yellow rail, "LOW PRIORITY", normal push, escalation timer 300s |

Priority must be *visibly* different, not just a database column. *(Gate G5)*

### 3.7 Rule D — `errorText` → display text

Displayed on the task card, the troubleshooting header, the supervisor's approval screen, and injected into the AI context.

| Condition | Text |
|-----------|------|
| `errorState = 0`, `errorNo = 50` | "Barcode not readable" |
| `errorState = 0`, `errorNo = 70` | "Transport belt error" |
| `errorState = 1` | "acknowledge" — per §3.1.4 D, the payload's text updates on resolution |

We use the payload's `errorText` verbatim when present (so a live-edited text appears on screen — a cheap, striking demonstration), falling back to the code→text map when it is empty.

### 3.8 Rule B — `statNo` & `processName` → display

Static for the demo. Parsed and displayed so *"the operator sees the exact machine name"*. Rendered as `Line {lineNo} · Station {statNo} · {processName}`, e.g. **Line 31 · Station 20 · Paste Printer**. Live-editing `processName` in the payload must change what appears on the phone — a one-second, high-impact proof.

### 3.9 Decision object

```ts
type Decision =
  | { kind: "IGNORE";             reason: string }
  | { kind: "AUTO_ARCHIVE";       reason: string; matchKey: MatchKey }
  | { kind: "ESCALATE_IMMEDIATE"; reason: string; supervisorIds: string[] }
  | { kind: "CREATE_TASK";
      reason: string;
      priority: "HIGH" | "LOW";
      recipientIds: string[];
      requiresFourEyes: boolean;
      solutionOptionSetId: string;
      display: { lineNo: string; statNo: string; processName: string; errorText: string };
      escalationTimeoutSec: number };
```

---

## 4. Assignment, decline & escalation

Per §3.1.2 Step 2. Modelled as an explicit state machine — `src/engine/escalation.ts`.

### 4.1 States

```
CREATED ──notify──► OFFERED(round 1)
                      │
        ┌─────────────┼──────────────────┐
        │ accept      │ all decline      │ timeout
        ▼             ▼                  ▼
    ASSIGNED     OFFERED(round 2) ◄──────┘
                      │
        ┌─────────────┼──────────────────┐
        │ accept      │ all decline      │ timeout
        ▼             ▼                  ▼
    ASSIGNED     OFFERED(round 3) ◄──────┘
                      │
        ┌─────────────┼──────────────────┐
        │ accept      │ all decline      │ timeout
        ▼             ▼                  ▼
    ASSIGNED     ESCALATED_TO_SUPERVISOR ◄┘
                      │
                      ▼ accept
                  ASSIGNED (actor = supervisor)

ASSIGNED ──► IN_PROGRESS ──► AWAITING_RELEASE ──► CLOSED
                        └──────────────────────► CLOSED   (direct close path)
Any state ──errorState=1──► AUTO_CLOSED
```

### 4.2 Rules (§3.1.2 Step 2)

- **Accept:** *"The task is instantly assigned to this user, removed from other operators' devices, and the screen transitions to the troubleshooting view."* First accept wins; a second accept arriving late gets a graceful "Already taken by Alice Wonder" screen, not an error. Concurrency is enforced with a conditional DB update (`WHERE status='OFFERED'`), so this is genuinely race-safe.
- **Decline:** the task disappears from that operator's device only.
- **All decline (round 1):** *"the notification is resent to both again."*
- **All decline (round 2):** the notification is resent once more.
- **All decline (round 3):** *"the system bypasses standard technicians and escalates the notification directly to the active Supervisor."*

**On the round count — read carefully.** The prose in Step 2 says *"After the notification has been resend the second time and still no operator accepted the task"*, while the §3.1.1 flowchart node reads *"Did all operators declined the task for the 3rd time?"*. Reconciled: offer 1 → resend (offer 2) → resend (offer 3) → escalate. That is "resent a second time" and "declined for the 3rd time" simultaneously, so it satisfies both readings. **`maxOfferRounds` is a configuration value (default 3)** — if Bosch reads it as two rounds, it is a one-field change in the admin screen, live. Flagged as Q6 in `08-QUESTIONS-FOR-BOSCH.md`.

- **Timeout:** the PDF does not define one. We add it (HIGH 120s / LOW 300s per round) because an unanswered notification must not stall the demo, and a visible countdown makes the rule watchable. Documented as deviation D5; configurable in the admin screen. *(Gate G8)*

### 4.3 "Active" supervisor

§3.1.4 C says *"the active supervisor"*. We model an `is_on_shift` flag on users with a shift-roster screen. If multiple supervisors are on shift for the line, all are notified and first-accept wins. If none is on shift, we notify all supervisors assigned to the line and log `NO_ACTIVE_SUPERVISOR`.

---

## 5. Screens

### S1 · Notification (lock screen / in-app)

> *"Error at Line: ${v_lineNo}, Station: ${v_statNo}, Process: ${v_processName}"* — §3.1.2 Step 1

Title: **Error at Line 31**. Body: `Station 20 · Paste Printer — Barcode not readable`. Actions: **Accept** / **Decline** as notification action buttons. Delivered by Web Push **and** by an in-app SSE banner with sound + vibration (risk R8).

### S2 · Task Inbox

List of `TaskCard`s (design system §6.2), newest first, HIGH before LOW. Empty state: "No open alarms. Line 31 running normally." — a calm empty state is itself a quality signal. A live escalation countdown appears on offered tasks.

### S3 · Task Detail / Safety Checklist

The flowchart places *"Person completes safety checklist"* immediately after acceptance — before the solution view — and it is not described in the step-by-step text. We implement it as a short, mandatory LOTO-style acknowledgement:

- ☐ Machine is in a safe state / stopped
- ☐ PPE worn
- ☐ Area secured, no other personnel in the danger zone

Three 56px checkboxes; **Continue** stays disabled until all three are checked, with a helper line explaining why. Timestamped into the task event log. This is small, cheap, unmistakably industrial, and shows we read the flowchart and not just the prose.

### S4 · Possible Solutions + AI Assist

The flowchart has *"Person views possible solutions for error"* before the decision to use AI. Header shows the error, the machine identity, and the priority. Body shows:

1. **Known solutions** — the `SolutionOption` cards for this `errorNo`, each annotated with how often it worked historically from `DB_Shiftbook` (e.g. *"Used 2× on this line — most recent 07 Jul"*). This turns the shiftbook from a write-only log into a visible asset, and it is a genuine product idea, not decoration.
2. **Ask the AI Assistant** — the `ai` variant button, always visible.

Per §3.1.2 Step 3, the "Select Solution" screen is *already open* when the assignee reaches the machine — so S4 is the resume point if the app is reopened.

**Solution option sets:**

| `errorNo` = 50 (Barcode Error) | `errorNo` = 70 (Transport Belt Error) |
|---|---|
| Cleaned sensor lens / camera | Removed physical obstruction from belt |
| Replaced barcode scanner hardware | Replaced transport belt motor |
| Adjusted scanner position / angle | Adjusted belt tension |
| Other | Other |

Driven from `solution_options` in the DB, keyed by `error_no`. Adding a third error code is a data insert, not a code change — demonstrable live if asked. Selecting "Other" reveals a required free-text field. **Next** is disabled until a selection exists.

### S5 · AI Chat (bottom sheet)

> *"The AI is fed automatically with contextual data (the parsed XML error metadata, relevant machine manuals from the plant's documentation system and historical resolution logs from DB_Shiftbook). Based on this context, the AI provides step-by-step troubleshooting guidance. The operator can ask follow-up questions, request detailed work steps, or ask for direct links to the exact page of the machine manual."*

**Context injected on open (no user action needed):**

- Parsed telegram: line, station, process, error no/text/type/state, operation mode, timestamp.
- Retrieved manual chunks (RAG, top-k by embedding similarity over the seeded manual corpus), each carrying `{document, section, page}`.
- The last N `DB_Shiftbook` entries for the same `(line_no, error_no)` with their solutions and comments.
- The technician's name, role and skills.

**Opening message is generated, not canned** — the assistant proactively offers a step-by-step procedure for *this* error before being asked. That is the moment that sells the feature.

**Grounding contract:**
- Every factual claim cites a source chip: `📄 SMT-Line-31 Manual · §4.2 · p.87`. Tapping it opens the manual at that page in an inline viewer.
- If retrieval returns nothing relevant, the assistant says so and offers to escalate — it never invents a procedure. Prompt-enforced and tested.
- Temperature 0.2. Max ~500 tokens per turn. Streamed.
- Suggested follow-up chips: "Show me the exact steps", "Open the manual page", "What did others do last time?", "This didn't work — what else?"

**Seeded manual corpus** (fictional but realistic, ~40–60 pages total, chunked and embedded):
- `SMT-Line-31_PastePrinter_Manual.pdf` — includes §4.2 *Barcode Scanner Maintenance*
- `TransportBelt_TB-200_ServiceGuide.pdf` — includes §7.1 *Belt Tension Adjustment*, §7.4 *Motor Replacement*
- `Plant_Safety_LOTO_Procedures.pdf`

Offline fallback (risk R1): a pre-computed response cache for the top ~20 anticipated questions, served with a visible "Offline mode" badge. Honest, and better than a spinner.

### S6 · Select Solution → Next

Selection is persisted immediately on tap (survives an app kill). **Next** proceeds to evidence.

### S7 · Photo Proof

> *"A camera interface prompting the operator to take a live photo of the repaired machine part."* — §3.1.2 Step 4

Live camera, capture button, review screen with **Retake** / **Use photo**. Metadata overlay burned into the lower-left corner: timestamp, `Line 31 · Stat 20`, `ERR 50`, operator name (deviation D2). Stored as a blob with a DB reference. Multiple photos allowed (max 3) — the PDF says one; more is strictly better for an audit and costs nothing.

### S8 · Comment (optional) + Conditional Close Button

> *"Add a comment (optional)"* with a button below whose label depends on state.

**Button label logic — §3.1.2 Step 4, implemented exactly:**

| `errorNo` | Current user role | Button label | Effect |
|-----------|-------------------|--------------|--------|
| `70` | any | **Close Task** | Finalises and closes → Step 6 |
| `50` | Supervisor | **Close Task** | Finalises and closes → Step 6 |
| `50` | Technician | **Request 4-Eyes Release** | Escalates to the active supervisor → Step 5 |

Note the flowchart's phrasing — *"Did supervisor already do the troubleshooting?"* — confirms the intent: if a supervisor performed the work, self-release is permitted; the second pair of eyes already exists. *(Gates G3, G4)*

The button label changing when a supervisor is logged in is a subtle, high-signal detail. Demo it explicitly.

### S9 · Supervisor Approval

> *"The supervisor receives the notification with following details: Error Details: ${v_errorNo} | ${v_errorText} | ${v_lineNo} | ${v_statNo}; Operator's Input: Selected Solution, Live Photo Proof, and Optional Comments. After the supervisor verified the resolution, the button 'Approve & Close' needs to be tapped."*

Layout: error details block (mono codes) → operator identity and timestamp → selected solution → photo (tap to full-screen, pinch to zoom) → comment → actions.

Primary: **Approve & Close** (`success` variant). The flowchart also has *"Is error solved? → No → Supervisor solves error"*, so we provide a secondary **Reject — not resolved** action returning the task to the technician with a required reason, plus the supervisor's own path to redo the troubleshooting and close. That branch exists in their diagram; covering it is part of "completely covers the described use case".

### S10 · Completion

Full-screen success wash: "Task closed. Record saved to shiftbook." Shows the generated `log_id`. Secondary link: **View shiftbook entry** → opens the persisted record. Closing the loop on screen is worth more than asserting it.

---

## 6. Storing the finalised record (§3.1.2 Step 6)

> *"the platform compiles all transaction details: operator ID, error code, solution selected, precision timestamp, photo proof, operator comment, and supervisor ID (if escalated). This finalized record is saved as a new row in the DB_Shiftbook database."*

Written in a single transaction. Exposed as the view `DB_Shiftbook` with exactly the PDF's columns (`log_id`, `timestamp_resolved`, `line_no`, `error_no`, `resolved_by_user_id`, `solution_selected`, `operator_comment`, `supervisor_user_id`) so a live `SELECT *` on the projector matches §3.1.3.2 literally — while the underlying tables carry photos, the full event trail, AI transcript reference and closure reason. See `05-DATA-MODEL.md`.

`supervisor_user_id` is `NULL` when no Four-Eyes release occurred — matching row 5501 of their sample data.

---

## 7. Ops Console (demo control surface)

Not requested by Bosch. Included because it converts the two invisible branches into the most persuasive moments available.

Left pane — **live ingest feed**: each telegram as a row (timestamp, eventId, line/stat, errorNo, and the decision as a coloured pill: `TASK CREATED` / `AUTO-ARCHIVED` / `IGNORED` / `REJECTED`), expandable to raw XML, parsed object, rule-by-rule trace, and side effects fired.

Right pane — **rule trace** for the selected event:

```
✓ operationMode = 1        → automatic mode, continue
✓ errorState   = 0        → error active, continue
✓ lineNo       = 31       → pool: Jane Smith, Alice Wonder
✓ errorNo      = 50       → all line operators; FOUR-EYES REQUIRED
✓ errorType    = 1        → priority HIGH, escalation 120s
→ CREATE_TASK #T-1042 · notified 2 devices · 41 ms
```

Also: an XML payload editor with one-click presets for every demo variant, a "reset demo data" button, and a health strip (DB, SSE clients, push subscriptions, AI reachability, camera permissions).

Runs on the projector next to the phone mirror. Narrate from it.

---

## 8. Acceptance criteria

| ID | Criterion |
|----|-----------|
| A1.1 | `POST /api/telegram` accepts the reference payload and returns 202 with a decision |
| A1.2 | `lineNo` 31 notifies only Jane + Alice; `lineNo` 10 notifies only John + Jane |
| A1.3 | `errorNo` 70 on line 31 notifies only Alice (skill filter); error 50 notifies both |
| A1.4 | `errorType` 2 produces a visibly LOW-priority task with a longer escalation window |
| A1.5 | `errorState` 1 auto-archives matching open tasks, retracts the push, and creates no task |
| A1.6 | `operationMode` 3 creates no task and returns an explanatory reason |
| A1.7 | Accept removes the task from all other devices within 2s |
| A1.8 | Declines exhaust `maxOfferRounds` (default 3) → supervisor escalation; each earlier round resends |
| A1.9 | Safety checklist blocks progress until all items are acknowledged |
| A1.10 | Solution list content changes with `errorNo`, sourced from the DB |
| A1.11 | AI chat opens pre-loaded with error context and produces a grounded first message with a citation |
| A1.12 | AI answers an unscripted follow-up correctly and cites a manual page |
| A1.13 | Photo capture works on the demo device and persists with metadata |
| A1.14 | Close button label follows the errorNo × role matrix exactly |
| A1.15 | Four-Eyes release notifies the supervisor with all required fields |
| A1.16 | Approve & Close closes the task and writes the shiftbook row |
| A1.17 | `SELECT * FROM DB_Shiftbook` returns the PDF's exact column set |
| A1.18 | Malformed XML returns 400 with a readable reason and no crash |
| A1.19 | Duplicate telegram within 60s does not create a second task |
| A1.20 | Every rule branch has a passing unit test; engine coverage ≥ 95% |
