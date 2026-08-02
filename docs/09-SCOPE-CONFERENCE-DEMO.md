# Current Scope — §3.2 Conference Demo

**Authoritative plan.** Supersedes `06-BUILD-PLAN.md` and `07-DEMO-RUNBOOK.md` for the current engagement.

| | |
|---|---|
| **Scope** | Bosch use case **§3.2 in full** — Inbound Registration + Parcel Status Dashboard |
| **Out of scope** | §3.1 AI-Powered Machine Alarm (App 1) |
| **Build method** | AI-built working mockup, immediately |
| **Purpose** | Live demo at a conference |
| **Positioning** | Complete §3.2, stated openly |
| **AI element** | Natural-language search on the dashboard |

---

## 1. Can these two be one demo? Yes — they already are.

Worth being precise about this, because it is the whole justification for the scope decision.

In Bosch's document, **Inbound Registration and Parcel Status are not two use cases.** They are §3.2, one use case, described as *"App 1"* and *"App 2/Dashboard"* under a single heading:

> *"The goal is to digitize and error-proof the goods receipt process (App 1) and monitor the parcel status in real-time (App 2/Dashboard)."* — §3.2.1

They are joined at the data layer by Bosch's own design. §3.2.2.2 requires the dashboard to query `DB_Parcel_Platform.tbl_parcels` — the exact table the registration app writes to. One is the write path, the other is the read path, over one table.

So this is not "two demos we're running back to back". It is **one continuous operator story**: a parcel arrives, gets registered, gets stored, and appears on the tracking hub — with the room watching both screens at once.

**Dropping App 1 costs us nothing structurally.** The machine alarm shares no data, no user, and no screen with §3.2. It is genuinely separable, which is why this scope cut is clean rather than lossy.

### What we actually gain

| Before (3 apps) | Now (§3.2 complete) |
|---|---|
| 22–28 min demo | **12–15 min** — fits a conference slot |
| 4 phones, 4 personas, role-switching | **1 phone + 1 projector** |
| Two unrelated narratives | **One story, start to finish** |
| Attention split across use cases | All polish concentrated where §3.2.2.2 invites it |

The shorter runtime matters more at a conference than in a client room. A tight 13-minute demo that never stumbles beats a 27-minute one that covers more ground.

---

## 2. The honest cost of dropping App 1

Three things go away. Two do not matter; one needs a deliberate answer.

**Gone, doesn't matter:** the XML telegram endpoint and the seven-rule business engine. These were §3.1's showpiece, but §3.2 has its own adversarial test — **Bosch's unfamiliar carrier labels and QR codes** (§3.2.2). The "prove it isn't hardcoded" moment survives intact, just in a different form. Arguably a stronger form: a physical object held up in the room is more visceral than an edited XML attribute.

**Gone, doesn't matter:** the Four-Eyes supervisor workflow. Interesting, but §3.2 has its own hard-block — the wrong-location scan — which demonstrates the same "the system refuses to let you do the wrong thing" value in five seconds instead of two minutes.

**Gone, needs an answer: the AI story.** §3.1 is titled *"AI-powered Machine Alarm"* and is the only place in the brief where AI appears. Ship §3.2 alone and the engagement reads as workflow digitisation with no AI content at all.

**Our answer: natural-language search on the dashboard.** §3.2.2.2 explicitly invites it —

> *"the format for the view is flexible… You should choose the format that best demonstrates your platform's strength."*

An LLM that turns *"which MOE/LOG-A parcels haven't been picked up since Monday?"* into a structured filter query is a genuine platform-strength demonstration, sits exactly where Bosch asked for one, and is roughly one endpoint of work. Detail in §6.

---

## 3. Stack — rebuilt for "immediately"

The earlier plan specified Postgres + Docker + pgvector, sized for a four-week engineering build. That is the wrong shape for an AI-built mockup that must run at a conference this week. Revised:

| Layer | Was | **Now** | Why |
|-------|-----|---------|-----|
| Framework | Next.js 15 | **Next.js 15, App Router, TypeScript** | Unchanged — right choice |
| Database | Postgres 16 + Docker | **SQLite via `better-sqlite3`**, single file | Zero infra. `npm install && npm run dev` and it runs. Nothing to start, nothing to fail on venue hardware |
| ORM | Drizzle | **Drizzle (SQLite driver)** | Same schema readability, no migration ceremony |
| Realtime | LISTEN/NOTIFY → SSE | **In-process event emitter → SSE** | Same behaviour, no database dependency |
| Styling | Tailwind v4 + tokens | **Unchanged** | The design system carries over exactly |
| Scanning | BarcodeDetector + ZXing | **Unchanged** | Still needed for real labels |
| Email | MailHog container | **In-app Inbox view, DB-backed** | Better for demo anyway — the mail is visible on the projector |
| AI | Claude + pgvector RAG | **Claude, structured-output only, no RAG** | NL search needs schema awareness, not document retrieval. Much simpler |
| Deploy | Docker Compose | **`npm run dev` on a laptop, or Vercel** | Runs offline on the laptop; Vercel mirror as backup |

**Everything that must be correct stays real.** Real regex validation against real scanned input. Real cascade logic against real occupancy state. Real transaction on finalisation. Real filtering over real seeded data. SQLite is a genuine relational database — this is a simplification of *infrastructure*, not of *logic*.

The one thing we lose is horizontal scalability, which is irrelevant for a demo and honest to say if asked: *"SQLite for the demo so it runs anywhere with no setup; the data layer is behind Drizzle, so Postgres is a connection-string change."*

`05-DATA-MODEL.md` stays valid — same tables, same columns, same seed data. Only the engine underneath changes.

---

## 4. What gets built

Everything below is in scope. Nothing in this list is optional.

### 4.1 Inbound Registration (mobile PWA)

Per `03-APP2-INBOUND.md`, complete:

- Carrier label scanning with the four §3.2.4 A regexes, stored as data
- Full-screen red/green state washes with the PDF's exact strings
- SAP PO path — 10-digit gate with live counter, SAP_ERP lookup
- Non-SAP path — name entry, Active Directory lookup, explicit "Unknown" skip
- Three-tier location cascade (department rack → general rack → transit trolley)
- Location QR verification with **hard block** on mismatch, showing expected vs scanned
- Atomic finalisation: insert parcel, mark rack occupied, log events
- Conditional email dispatch — RACK **and** email present only
- Manual-entry fallback on every scanner

### 4.2 Parcel Status Dashboard

Per `04-APP3-DASHBOARD.md`:

- **Board mode** — dark, KPI strip, live card grid, for the projector
- **Table mode** — dense, sortable, filter rail
- **Mobile mode** — search-first self-service lookup
- All four required filters (carrier, date, recipient, status) + free-text search
- All six required fields visible per record
- Live SSE updates — new parcel appears within 2 seconds
- ~120 seeded records **including ~35 internal milkrun rows** (§3.2.2.2 requires non-app data)
- Detail drawer with event timeline and the dispatched email

### 4.3 Supporting

- **Mock SAP_ERP + Active Directory** behind adapter interfaces, seeded per §3.2.3.2
- **Inbox view** — dispatched emails visible on screen
- **Ops console** (slim) — event log showing decisions and skip reasons, health strip, admin for carrier patterns and locations, reset-demo-data
- **Natural-language search** — §6

---

## 5. Acceptance gates — the graded moments

Renumbered from `00-OVERVIEW.md` §3. **All 16 must pass before the conference.**

| # | Trigger | Correct behaviour |
|---|---------|-------------------|
| **C1** | Unknown / malformed label scanned | Red wash, *"Invalid Format! Please scan a valid carrier label."*, blocks, allows rescan |
| **C2** | Valid DHL / UPS / GLS / Amazon label | Green wash, carrier auto-detected and named |
| **C3** | An unsupported carrier appears live | Admin → add pattern → rescan works, under 20 seconds |
| **C4** | SAP PO entered, 9 digits | Next disabled, counter reads 9/10; enables at 10 |
| **C5** | PO `4500987654` | John Doe / MOE/LOG-A → proposes `RACK-A-05` |
| **C6** | No PO, name "Alice Wonderland" | AD lookup → MOE/LOG-A → dept-rack cascade |
| **C7** | No PO, name "Unknown" | **No AD query**; recipient and department NULL; falls through cascade |
| **C8** | Department racks all occupied (PO `4500987655`) | Falls back to vacant general rack `RACK-C-13` |
| **C9** | All racks occupied | Proposes `TROLLEY-01` |
| **C10** | **Wrong QR scanned at the rack** | Red wash, expected vs scanned in mono, **hard block, no override** |
| **C11** | Correct QR scanned | Green wash, *"Location verified!"*, proceeds |
| **C12** | Unknown QR value | Clear rejection; admin can register the location live |
| **C13** | Stored in a RACK, recipient has email | Email dispatched, visible in Inbox, exact subject and body |
| **C14** | Stored on a TROLLEY, or recipient unknown | **No email**; ops console logs the skip reason |
| **C15** | Registration completes | Parcel row inserted **and** rack `is_occupied = TRUE`, atomically |
| **C16** | Registration completes | **Parcel appears on the dashboard within 2 seconds, no refresh** |

Plus the dashboard set: all four filters correct, milkrun rows present and visually distinct, the three §3.2.3.1 sample rows seeded verbatim.

**C10 and C16 are the two moments to build the demo around.** C10 proves error-proofing; C16 proves it is a platform.

---

## 6. Natural-language search

The AI element, sitting where §3.2.2.2 invites it.

**How it works.** A search field above the dashboard accepts plain language. The model receives the `tbl_parcels` schema, the distinct values for carrier / status / department, and today's date, and returns a **structured filter object** — not prose, not SQL:

```ts
{ carrier?: string[], status?: ParcelStatus[], recipient?: string,
  department?: string, dateFrom?: string, dateTo?: string,
  locationType?: "RACK" | "TROLLEY", sort?: string, explanation: string }
```

The object is validated with Zod and applied through the **same filter code path as the manual chips**. The chips visibly populate to match, so the user sees exactly what was understood and can adjust it by hand.

**Why structured output rather than generated SQL:** no injection surface, no possibility of a malformed query, deterministic failure mode, and the result is inspectable. If the model misunderstands, the user sees wrong chips and fixes them in one tap — rather than an error or, worse, silently wrong data. Worth saying out loud in the demo; it is a real engineering argument.

**Demo queries to rehearse:**
- *"parcels for MOE/LOG-A still waiting for pickup"*
- *"anything from DHL this week"*
- *"what's still in transit from the milkrun"*
- *"John Doe's parcels"*

**Failure handling.** If the model is unreachable or returns something unparseable, the field falls back to plain text search with a quiet notice. The dashboard never breaks because the AI is unavailable — which also means the whole demo survives a dead venue network.

---

## 7. Build order

Sequenced so there is a demonstrable artefact early and the graded gates land before the polish.

| Step | What | Gates unlocked |
|------|------|----------------|
| **1** | Next.js + Tailwind + design tokens + SQLite schema | — |
| **2** | Seed data: locations, SAP, AD, ~120 parcels incl. milkruns | C5–C9 data ready |
| **3** | **Core engine** — carrier matcher, location cascade, QR normaliser. Pure functions, unit-tested first | C1–C2, C5–C9 |
| **4** | Dashboard, table mode — proves the data is real and queryable | filters |
| **5** | Inbound wizard: scan → validate → washes | C1, C2 |
| **6** | Recipient identification: SAP + AD paths | C4, C6, C7 |
| **7** | Cascade + proposal screen | C5, C8, C9 |
| **8** | Location verification + hard block | **C10**, C11, C12 |
| **9** | Finalisation + email + Inbox | C13, C14, C15 |
| **10** | SSE realtime + dashboard board mode | **C16** |
| **11** | Natural-language search | — |
| **12** | Mobile mode, detail drawer, KPI strip, showcase layer | — |
| **13** | Admin (carrier patterns, locations), ops console, `demo:reset` | C3, C12 |
| **14** | Device test, rehearse, offline drill | all |

**Step 3 is the critical path**, exactly as before. The cascade and the carrier matcher are small, pure, and everything correctness-related depends on them. They get built and tested before any screen.

**If time compresses**, cut in this order: step 12 showcase items → mobile mode → NL search → admin screens. Never cut steps 3, 8, 9, 10 or 14.

---

## 8. Conference demo script (12–15 min)

Setup: **one phone** (screen-mirrored) + **projector showing the dashboard in board mode**, both visible throughout. That dual view is the demo.

**Open (1 min).** Dashboard on screen, already populated. "This is the parcel hub for the plant — inbound shipments and internal milkruns in one view. Watch this screen while I register a parcel on the phone."

**Beat 1 — refuse a bad label (1.5 min).** Scan something unsupported. Red. *"Invalid Format."* — "It refuses. That's the feature, not a bug. Goods receipt is where errors get expensive." *(C1)* If someone offers a real carrier we don't support: admin, add the pattern, rescan, fifteen seconds. *(C3)*

**Beat 2 — good label (1 min).** Green wash, carrier detected, tracking ID on screen. *(C2)*

**Beat 3 — the PO (1.5 min).** "Yes." Type nine digits — Next stays dead, counter shows 9/10. Tenth digit, it wakes up. Submit → John Doe, MOE/LOG-A, **RACK-A-05**. Tap *"Why this location?"*: "A-04 is occupied, so A-05." *(C4, C5)*

**Beat 4 — the wrong rack (2 min). Do this deliberately.** Scan a different rack's QR. Red. Expected vs scanned, side by side. Blocked. "There is no override button. The parcel cannot be booked into the wrong location." Then scan the right one. Green. *(C10, C11)*

**Beat 5 — the handoff (1 min). The best moment in the demo.** Complete the storage. **Turn to the projector.** The parcel slides onto the board with a highlight. Say nothing for two seconds. *(C16)*

**Beat 6 — the email (1 min).** Open the Inbox. There it is — exact subject, exact pickup location. *(C13)*

**Beat 7 — the negative case (1.5 min).** Register a second parcel, recipient "Unknown". No AD lookup happens — the ops console shows it. Cascade lands on a trolley. **No email is sent**, and the console says why. "Nothing happened there, and that's correct." *(C7, C9, C14)*

**Beat 8 — the hub (2 min).** Filter by carrier, status, recipient. Then type a sentence: *"parcels for MOE/LOG-A still waiting for pickup"* — the filter chips populate themselves. "The model doesn't write the query, it fills in the filters — so you can see exactly what it understood, and correct it." Point at the milkrun rows: "These never touched the app you just watched. Different source system. This is a hub, not a log." *(filters, NL search)*

**Close (1.5 min).** What's simulated (SAP, Active Directory, the mail gateway — all behind adapter interfaces), what's real (every rule, every validation, every record). Then §3.1: "We also specced the machine alarm use case in full. We chose to implement this one completely rather than both partially — your document asks for complete coverage of the use case, so that's what we optimised for."

---

## 9. Which Bosch questions still apply

From `08-QUESTIONS-FOR-BOSCH.md`:

**Still live and important:** Q3 (what the QR codes encode), Q4 (which carrier labels), Q5 (do the QR codes match the §3.2.3.1 IDs), Q7 (Alice Wonder / Wonderland), Q8 (German or English), Q11 (their device or ours), Q23 (trolley occupancy).

**No longer relevant:** Q2 (XML variants), Q6 (escalation rounds), Q13 (statNo), Q14 (safety checklist), Q15 (four-eyes rejection), Q16–Q20 (all §3.1).

**New for this scope:**

**Q24 · Is this an internal conference, a customer event, or a Bosch-attended session?**
It changes how much we lean on Bosch branding and how directly we address the §3.1 omission.

**Q25 · Will anyone in the room hand us a label or QR code, or are we scanning our own?**
If it is a general conference audience rather than Bosch, we can bring known codes — which removes risks R3 and R4 entirely and lets us rehearse to the second. Worth knowing, because it determines how much of the admin/live-add machinery is actually needed.

---

## 10. Risks — revised

Most of the earlier register was App 1's. What remains:

| ID | Risk | Mitigation |
|----|------|------------|
| **R1** | Venue network fails | Runs entirely local — SQLite, no containers, no services. NL search degrades to text search with a notice. **The demo survives with zero internet.** Rehearse it that way once. |
| **R3** | An unsupported carrier label appears | Correct behaviour per §3.2.4, plus live pattern-add in the admin screen. Turns a rejection into a feature. |
| **R4** | Their QR encodes an unexpected value | Normaliser handles bare ID, URL and JSON; plus live location registration. |
| **R5** | iOS Safari lacks `BarcodeDetector` | ZXing-wasm fallback, plus manual entry on every scanner. Test on the actual demo device. |
| **R9** | Camera permission prompt mid-demo | Grant during setup; pre-flight screen verifies camera, storage and network before the session. |
| **R12** | Data drift across rehearsals | `npm run demo:reset` restores exact state. Run it between every rehearsal and immediately before going on. |
| **R14** *(new)* | NL search returns something odd on stage | Structured output + Zod validation means it can only ever produce valid filters or fall back. Rehearse the four scripted queries; do not improvise a fifth on stage. |

---

## 11. If Bosch later wants App 1

`02-APP1-MACHINE-ALARM.md` is a complete specification and remains valid — nothing in this rescope contradicts it. Adding it means: the XML endpoint, the seven-rule engine (already fully specified and small), the task lifecycle tables from `05-DATA-MODEL.md` §2, and the alarm screens. Roughly 140 ideal hours on top of this foundation, since the design system, data layer, realtime plumbing and adapters are already built and shared.

Worth saying in the room if the question comes up — it reframes the omission as sequencing rather than a gap.
