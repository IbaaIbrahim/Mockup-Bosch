> **⚠ SUPERSEDED FOR CURRENT SCOPE** by [`09-SCOPE-CONFERENCE-DEMO.md`](./09-SCOPE-CONFERENCE-DEMO.md) §5 and §8.
> This runbook scripts a 22–28 minute three-app client demo with four phones. The current engagement is a 12–15 minute §3.2 conference demo with one phone and a projector. Gates G1–G10 and the XML payload presets do not apply; G11–G26 map onto C1–C16 in doc 09.
> Still useful for: the room-setup checklist, the failure drills, and the rehearsal schedule — all of which carry over.

# Demo Runbook & Test Matrix

The build is only half the work. This document is the other half: what happens in the room.

---

## 1. Room setup

### 1.1 Hardware

| Item | Purpose | Notes |
|------|---------|-------|
| Laptop (host) | Runs Docker: app, Postgres, MailHog | Ethernet **and** own travel router; never depend on venue Wi-Fi |
| Travel router | Private SSID for the phones | Pre-paired, pre-tested, brought fully charged |
| Phone A — Technician | App 1 as **Jane Smith** | Screen-mirrored to the projector |
| Phone B — Technician | App 1 as **Alice Wonder** | Shows the "removed from other device" behaviour |
| Phone C — Supervisor | App 1 as **Bob Builder** | Four-Eyes release |
| Phone D — Operator | App 2 | Camera scanning |
| Projector / large screen | Split: phone mirror + Ops Console + App 3 board | The Ops Console is the narration device |
| Spare phone, charged | Insurance | Pre-configured, logged in, permissions granted |
| Printed backup labels & QR codes | Insurance if their labels fail | Have them, do not use them unless needed |

All phones: screens on, auto-lock off, do-not-disturb off, notifications granted, camera granted, app foregrounded, brightness high, battery >80%.

### 1.2 Pre-flight checklist (run 30 minutes before)

- [ ] `pnpm demo:reset` — data restored to the exact known state
- [ ] Ops Console health strip all green: DB, SSE clients (4), push subscriptions, AI reachable, MailHog up
- [ ] Send one test telegram, confirm a task on Phone A, then reset again
- [ ] Scan one test label and one test QR on Phone D, confirm the flow, then reset again
- [ ] App 3 board mode on the projector, `● LIVE` indicator green
- [ ] AI warmed: one throwaway question so the first real response is fast
- [ ] Offline drill verified: unplug the internet, confirm the app still runs and the AI shows the offline badge, plug back in
- [ ] MailHog inbox emptied
- [ ] Final `pnpm demo:reset`

**Do not skip the final reset.** Every rehearsal artefact must be gone (risk R12).

---

## 2. Demo script

Total 22–28 minutes. Written as beats, not as a word-for-word script — the point is knowing which moments to slow down for.

### Act 1 — App 1: the alarm (10 min)

**Beat 1 · Set the scene (1 min).** Ops Console on screen, empty feed. "This is our ingest console. Every telegram from the plant arrives here. Nothing is hardcoded — send us a payload and watch the engine decide."

**Beat 2 · The reference payload (2 min).** Invite Bosch to send it from their own API client. Task appears on Phones A and B. Point at the console: `lineNo 31 → pool: Jane Smith, Alice Wonder`. Jane accepts. **Alice's phone clears — hold on that for a moment.** It is a small thing and it lands.

**Beat 3 · Safety and solutions (1 min).** Safety checklist, then the solution screen. Note the annotation: "Cleaned sensor lens — used 2× on this line, most recent 7 July." "That comes from your shiftbook. The log stops being write-only."

**Beat 4 · AI (3 min).** Open the assistant. It has already produced a step-by-step procedure for *this* error, citing the manual. **Ask Bosch to ask it something.** Whatever they ask, the answer must be grounded and cited. Tap a citation, the manual opens at the page. This is the beat most likely to be remembered — do not rush it, and do not fill silence while it streams.

**Beat 5 · Four-Eyes (2 min).** Photo, comment, then the button: **"Request 4-Eyes Release"**. Point it out explicitly. Bob's phone buzzes; he sees the error details, the solution, the photo, the comment; he taps **Approve & Close**. Then: log in as Bob on the same error and show the button now reads **"Close Task"**. That contrast is the whole rule, demonstrated in ten seconds.

**Beat 6 · The record (1 min).** `SELECT * FROM "DB_Shiftbook"` on screen. "These are your column names from page 5 of your document."

### Act 2 — the live payload edits (5 min) · **the part they came for**

Hand the keyboard over. Ask them to change values. Be ready for all of these:

| They change | What to say before they send | What happens |
|---|---|---|
| `lineNo` 31 → 10 | "Different line, different team." | Phone A (Jane, on both lines) buzzes; Alice does not. Console shows the pool. |
| `errorNo` 50 → 70 | "Different fault, different skill, different closure rule." | Only Alice is notified on line 31 (belt skill). Solution list is now belt options. Close button reads "Close Task" — no four-eyes. |
| `errorType` 1 → 2 | "Warning instead of error." | Task is yellow, LOW priority, longer escalation window. |
| `processName` → anything | "Type whatever you like." | The new string appears on the phone within a second. Cheap, and very convincing. |
| **`errorState` 0 → 1** | "This one's important — the machine fixed itself." | **Nothing is created. The open task on the phone dissolves** with "Resolved at the machine — no action needed." Console: `AUTO-ARCHIVED`. Say the words *ghost alarm*. |
| **`operationMode` 1 → 3** | "Machine is in manual mode — someone's already standing at it." | **No task, no notification.** Console: `IGNORED — machine in manual mode, technician already present.` |
| Malformed XML | If they try to break it | Clean 400, readable reason in the console, nothing crashes. A graceful failure is still a win. |

**The two traps are the highest-scoring moments available.** Narrate them deliberately: "Nothing happened — and that's the correct behaviour. Here's why." Then point at the console.

**Optional flex:** if they ask about a third error code, add one in the admin screen live — new code, new solution options, new skill requirement — and send a payload using it. Roughly 40 seconds, and it converts "does it scale?" from a promise into a demonstration.

### Act 3 — App 2 + App 3: the parcel (8 min)

App 3 board mode stays on the projector for the whole act, so the audience watches the hub while the operator works.

**Beat 1 · Bad label first (1 min).** Ask for a label that is *not* DHL/UPS/GLS/Amazon, or scan something arbitrary. Red wash. "Invalid Format." "It refuses. That's the feature." If they hold up a real carrier we do not support, open the admin screen and add the pattern in fifteen seconds, then rescan.

**Beat 2 · Good label (1 min).** Their DHL or UPS label. Green wash, carrier auto-detected, tracking ID on screen.

**Beat 3 · SAP path (1.5 min).** "Yes." Type `450098765` — Next stays disabled, counter reads 9/10. Type the tenth digit, it enables. Submit. John Doe, MOE/LOG-A, **RACK-A-05**. Tap "Why this location?": "A-04 is occupied, so A-05." 

**Beat 4 · Wrong location (1.5 min) — do this deliberately.** Scan a *different* rack QR. Red wash, expected vs scanned, both in mono, blocked. "There is no override. The parcel cannot be booked into the wrong rack." Then scan the correct one. Green. This is App 2's best moment; make sure it is the one they see.

**Beat 5 · The handoff (1 min) — the strongest moment in the demo.** Complete the storage. **Look at the projector.** The parcel slides into the top of the board with a highlight. Say nothing for two seconds and let them see it.

**Beat 6 · Email (1 min).** Open the Inbox view. The mail is there, exact subject, exact body, correct pickup location.

**Beat 7 · The negative case (1 min).** Register a second parcel with recipient "Unknown". Console shows no AD query. Cascade lands on a general rack or trolley. If it lands on a trolley: **no email**, and the console says why.

**Beat 8 · The hub (1.5 min).** Filter the board by carrier, by status, by recipient. Point at the milkrun rows: "These never touched the app you just saw — they come from the milkrun system. This is a hub, not a log."

### Close (2 min)

One slide or one sentence: what was mocked (SAP, AD, SMTP, push transport), what was real (every rule, every branch, every record), and what a production integration looks like. Offer the adapter interface as the concrete answer.

---

## 3. XML payload variants

Keep all of these as one-click presets in the Ops Console editor, and also in a text file the Bosch operator can copy from.

```xml
<!-- P1 · Reference (§3.1.3.1) — line 31, barcode error, active, automatic -->
<?xml version="1.0" encoding="UTF-8"?>
<root>
  <header eventId="12345" version="2.3" eventName="plcError" eventSwitch="-1" contentType="3">
    <location lineNo="31" statNo="20" statIdx="1" fuNo="1" processName="Paste Printer" processNo="120" application="IPC" />
  </header>
  <event>
    <plcError typeNo="0123456789" typeVar="0001" errorNo="50" errorText="Barcode not readable"
              errorType="1" errorState="0" operationMode="1" chainNo="999" />
  </event>
  <body/>
</root>
```

| Preset | Change from P1 | Expected decision |
|--------|----------------|-------------------|
| **P2 · Line 10** | `lineNo="10"` | CREATE_TASK → John Doe, Jane Smith |
| **P3 · Belt error** | `errorNo="70"` `errorText="Transport belt error"` | CREATE_TASK → Alice only (skill filter), no four-eyes |
| **P4 · Warning** | `errorType="2"` | CREATE_TASK, priority LOW |
| **P5 · Cleared** ⚠ | `errorState="1"` `errorText="acknowledge"` | **AUTO_ARCHIVE** — no task |
| **P6 · Manual mode** ⚠ | `operationMode="3"` | **IGNORE** — no task |
| **P7 · Belt on line 10** | `lineNo="10"` `errorNo="70"` | CREATE_TASK → John Doe only (only line-10 tech with belt skill) |
| **P8 · Unknown line** | `lineNo="99"` | ESCALATE_IMMEDIATE, logged, no crash |
| **P9 · Unknown error code** | `errorNo="88"` | CREATE_TASK, generic options, flagged |
| **P10 · Custom process name** | `processName="Reflow Oven"` | Text appears on the phone |
| **P11 · Malformed** | broken closing tag | 400 with a readable reason |
| **P12 · Extra attributes** | add `foo="bar"` throughout | Accepted, unknown fields ignored and logged |
| **P13 · Duplicate** | resend P1 within 60s | Deduplicated, no second task |

---

## 4. Test matrix — gates G1–G26

Each gate has a Playwright E2E test and appears in the CI report. **The demo does not proceed to rehearsal until this table is fully green.**

### App 1

| Gate | Test | Method | Pass condition |
|------|------|--------|----------------|
| G1 | Line routing | POST P1, then P2 | 31 → Jane+Alice; 10 → John+Jane; no cross-notification |
| G2 | Error code routing + options | POST P3 | Alice only; belt solution set rendered |
| G3 | Four-eyes for technician | Close as Jane on error 50 | Button reads "Request 4-Eyes Release"; task → AWAITING_RELEASE |
| G4 | Direct close for supervisor | Close as Bob on error 50 | Button reads "Close Task"; task → CLOSED |
| G5 | Priority | POST P4 | Task rail yellow, label LOW, escalation window 300s |
| G6 | **Auto-archive** | Create via P1, then POST P5 | Open task → AUTO_CLOSED; no new task; push retracted; UI dissolves |
| G7 | **Manual mode ignore** | POST P6 | Zero tasks; response reason mentions manual mode; console shows IGNORED |
| G8 | Escalation | Decline on both phones for every offer round (default 3) | Resend each round, then ESCALATED to Bob |
| G9 | AI unscripted answer | Ask "the scanner is clean but still failing" | Grounded answer with a valid citation; no fabricated procedure |
| G10 | Shiftbook write | Close a task | New `DB_Shiftbook` row with all fields; supervisor NULL when not escalated |

### App 2

| Gate | Test | Method | Pass condition |
|------|------|--------|----------------|
| G11 | Invalid format | Enter `XYZ123` | Red wash, blocked, rescan available |
| G12 | Valid formats | All four sample IDs | Green wash, correct carrier named, each pattern |
| G13 | PO length gate | Type 9 digits | Next disabled, counter 9/10; enables at 10 |
| G14 | SAP → cascade P1 | PO 4500987654 | Proposes RACK-A-05 |
| G15 | AD lookup | Name "Alice Wonderland" | Department MOE/LOG-A resolved |
| G16 | Unknown skips AD | Name "Unknown" | No AD query in the log; recipient and department NULL |
| G17 | Cascade P2 | PO 4500987655 (ENG-2, racks full) | Proposes RACK-C-13 |
| G18 | Cascade P3 | Occupy all racks, then register | Proposes TROLLEY-01 |
| G19 | **Wrong QR blocks** | Scan RACK-C-12 when A-05 proposed | Red wash with both values; no way forward |
| G20 | Correct QR | Scan RACK-A-05 | Green wash, proceeds |
| G21 | Email sent | Complete a RACK storage for John Doe | Mail in inbox, exact subject and body, correct location |
| G22 | Email skipped | Complete a TROLLEY storage; and an Unknown recipient | No mail; console logs the skip reason for both |
| G23 | DB integrity | Complete a RACK storage, then a TROLLEY storage | Rack: `tbl_parcels` row inserted **and** `is_occupied = TRUE`, atomically. Trolley: row inserted, trolley remains available |

### App 3

| Gate | Test | Method | Pass condition |
|------|------|--------|----------------|
| G24 | Live handoff | Complete App 2 with the board open | Card appears < 2s, highlighted, no refresh |
| G25 | Filters | Each of the four required filters, then combined | Correct subsets, accurate result count |
| G26 | Unified hub | Inspect the seeded data | Milkrun rows present, visually distinct, the 3 PDF rows verbatim |

---

## 5. Failure drills

Rehearse each at least once. Knowing the recovery is what keeps you calm on stage.

| Failure | Recovery | Recovery time |
|---------|----------|---------------|
| Venue internet drops | Everything is local; AI switches to offline cache with a visible badge. Say so plainly — "we're running fully offline right now" is itself a selling point | 0s |
| Push notification doesn't arrive | In-app SSE banner fires regardless; if both fail, pull-to-refresh the inbox | < 5s |
| Camera won't open | Tap "Enter manually", type the code | < 10s |
| Their carrier isn't supported | Admin → add pattern → rescan | < 20s |
| Their QR isn't a known location | Admin → register location → rescan | < 20s |
| AI is slow or unreachable | Offline cache serves the answer with the badge; move on, come back to it | < 5s |
| A phone dies | Spare phone, already configured and logged in | < 30s |
| Data is in a weird state | Ops Console → Reset demo data | < 10s |
| Something genuinely breaks | Reset, re-run the beat, say "let's run that again" without apologising twice | < 60s |

**Rule for the room:** never apologise more than once for the same thing, never debug live, never say "it worked this morning". Reset, re-run, move on.

---

## 6. Rehearsal schedule

| Rehearsal | Focus | Reset before | Pass bar |
|-----------|-------|--------------|----------|
| R1 | Full script, no audience, take notes | ✓ | Complete without consulting the doc |
| R2 | Full script + someone playing Bosch, sending unexpected payloads | ✓ | Handle three unrehearsed payloads correctly |
| R3 | Full script with two injected failures (network drop, unknown label) | ✓ | Recover within the times above, without visible stress |
| R4 (day-of) | Timing and pacing only | ✓ | Under 28 minutes with room for questions |

---

## 7. What to say when asked "is this real?"

Be direct — the honesty is disarming and the answer is strong.

> "The business logic, the database, the routing, the validation and the AI are all real and running here. Four things are simulated because they're your systems, not ours: SAP, Active Directory, the SMTP gateway, and the push transport. Each sits behind an adapter interface — connecting the real ones is a configuration change and an implementation of one interface, not a rewrite. That's exactly why we built it this way."
