# App 3 — Parcel Status Dashboard

Source: PDF §3.2.2.2
Users: shift leaders, recipients, any employee · Devices: wall display, desktop, tablet, phone · Mode: read-only

---

## 1. Goal and the invitation

> *"This serves as the central, real-time information hub for all tracked parcels within the plant. Its purpose is to provide supervisors, shift leaders, and employees with a self-service tool to quickly find the status and location of any registered parcel or internal transit item."*

> *"Here, the format for the view is flexible (e.g. mobile dashboard, dedicated search app, etc.). **You should choose the format that best demonstrates your platform's strength.**"*

That last sentence is an explicit invitation to show off, and it is the only place in the entire brief where Bosch asks to be impressed rather than merely satisfied. Apps 1 and 2 are graded on correctness; App 3 is graded on **taste**. Budget accordingly — this app should look like a product someone already pays for.

---

## 2. Hard requirements

From §3.2.2.2 "Core Functional Requirements":

1. **Read-only**, querying `DB_Parcel_Platform.tbl_parcels` **in real time**.
2. Must include data **from other plant logistics systems, e.g. milkruns** — not only what the inbound registration app writes. *"Fictional dummy data is completely sufficient."* (The PDF's *"the inbound registration from App 1"* refers to its own §3.2 numbering — our App 2. See `00-OVERVIEW.md` §2.)
3. A **clear and intuitive** way to filter and search.
4. Minimum filters: **Carrier · Date · Recipient Name · Status** (`STORED`, `IN_TRANSIT`, `DELIVERED`).
5. These fields **clearly visible for each record**: Tracking ID, Carrier, Current Status, Storage Location, Recipient Name, Date.

Everything beyond this is our territory.

---

## 3. Concept — three modes, one surface

A single application with a mode switch, because the same data serves three genuinely different situations in a plant. Demonstrating that one build adapts to a wall display, a desk and a phone *is* the platform-strength argument.

### 3.1 Board mode — the wall display

Dark theme, no chrome, legible from four metres, auto-refreshing. This is what runs on the screen above the goods-receipt desk all day, and it is what should be on the projector during the demo.

```
┌─────────────────────────────────────────────────────────────────────────┐
│  BOSCH  Parcel Status                        Wed 29 Jul · 14:32   ● LIVE │
├─────────────────────────────────────────────────────────────────────────┤
│   127          8            14             2                            │
│   TOTAL TODAY  IN TRANSIT   STORED         AWAITING PICKUP >24H         │
├─────────────────────────────────────────────────────────────────────────┤
│ ┌───────────────────────┐ ┌───────────────────────┐ ┌─────────────────┐ │
│ │ JD0123456789012345    │ │ 1Z999AA10123456784    │ │ MR-2026-07-08…  │ │
│ │ DHL          ● STORED │ │ UPS          ● STORED │ │ Milkrun ◉TRANSIT│ │
│ │ RACK-A-04             │ │ TROLLEY-01            │ │ LINE_B_STAGING  │ │
│ │ John Doe · MOE/LOG-A  │ │ Alice Wonder…         │ │ —               │ │
│ │ 06 Jul 08:12          │ │ 06 Jul 09:30          │ │ 06 Jul 10:05    │ │
│ └───────────────────────┘ └───────────────────────┘ └─────────────────┘ │
└─────────────────────────────────────────────────────────────────────────┘
```

- Auto-fitting card grid (`repeat(auto-fill, minmax(340px, 1fr))`), 24px gutters.
- A newly arriving record slides in at the top with a 1200ms decaying highlight — this is the moment that lands when a parcel is registered on the phone during the demo *(Gate G24)*.
- `● LIVE` indicator with a pulsing dot, driven by the actual SSE connection state. It turns amber and reads `RECONNECTING` if the stream drops — honest status beats a decorative badge.
- Optional slow auto-rotation through pages when the record count exceeds one screen.

### 3.2 Table mode — the analyst view

Light theme, dense, sortable, exportable. Left filter rail (280px), sticky header, virtualised rows, tabular numerals, monospace IDs.

Columns: Tracking ID · Carrier · Status · Location · Recipient · Department · Source · Last Event. Every column sortable; column visibility configurable; **Export CSV** in the toolbar. Row click opens the detail drawer.

### 3.3 Mobile mode — the self-service lookup

This is the *"dedicated search app"* the brief mentions. A single large search field at the top — "Search tracking ID, recipient or location" — filter chips beneath, then stacked cards. Optimised for the one question an employee actually has: *"has my parcel arrived, and where is it?"*

A **"Find my parcels"** shortcut filters to the signed-in user's own name in one tap. Small feature, obviously right, and it is the kind of detail that makes a room nod.

---

## 4. Filtering & search

### 4.1 Required filters

| Filter | Control | Behaviour |
|--------|---------|-----------|
| **Carrier** | Multi-select chips with logos: DHL, UPS, GLS, Amazon, Internal Milkrun | OR within, AND across filters |
| **Date** | Presets (Today · Yesterday · Last 7 days · Last 30 days) + custom range | Applies to `timestamp_last_event`, Europe/Berlin |
| **Recipient Name** | Type-ahead over distinct recipients | Case-insensitive, partial match, "Unassigned" option for NULL |
| **Status** | Segmented control: All · Stored · In Transit · Delivered | Single or multi |

Plus a **free-text search** across tracking ID, recipient, location, department and SAP PO — prefix-matched and fast, because on stage someone will type half a tracking number.

### 4.2 Filter behaviour

- Active filters appear as removable chips above the results with a **Clear all**.
- Result count is always visible: "Showing **14** of 127 parcels".
- Filter state is encoded in the URL — a filtered view is shareable and, importantly, **re-openable mid-demo without re-clicking**.
- Debounced 200ms; queries served from indexed columns.
- Empty result state: "No parcels match these filters" + **Clear filters** — never a blank panel.

---

## 5. Record display

### 5.1 Required fields (§3.2.2.2)

| Field | Presentation |
|-------|--------------|
| Tracking ID (`v_tracking_id`) | Monospace, primary line, tap to copy |
| Carrier (`v_carrier`) | Logo + name; "Internal Milkrun" gets a distinct neutral mark |
| Current Status (`v_status`) | `StatusPill` — green STORED, blue pulsing IN_TRANSIT, grey DELIVERED |
| Storage Location (`v_actual_location`) | Monospace, with a type icon (rack / trolley / staging) |
| Recipient Name (`v_recipient_name`) | Name + department caption; "Unassigned" when NULL |
| Date (`v_timestamp_last_event`) | Relative for recent ("12 min ago"), absolute beyond 24h, full value on hover |

### 5.2 Detail drawer

Opens from the right (desktop) or as a full sheet (mobile):

- Full field set including `sap_po_number`, `proposed_location` vs `actual_location`, and source system.
- **Event timeline** — registered → stored → picked up, with actor and timestamp. Reinforces that this is a platform with history, not a table dump.
- The dispatched notification email, if any, rendered inline.
- For App-2-originated parcels: which cascade priority produced the location, and whether the first location scan matched.

---

## 6. Realtime

Postgres `LISTEN/NOTIFY` on `tbl_parcels` changes → server SSE hub → client `EventSource`.

- New record: prepend with the highlight animation.
- Status change: the pill cross-fades in place; the row briefly outlines.
- Connection lost: badge switches to `RECONNECTING`, exponential backoff, silent recovery, and a one-time toast if the outage exceeds 10s.
- Fallback: if SSE is unavailable, poll every 5s. The demo must not depend on a single transport (risk R8).

Target latency from App 2 finalisation to visible card: **under 2 seconds**.

---

## 7. Seed data — proving it is a unified hub

§3.2.2.2 is explicit that the table *"does not only store the inbound registration from App 1 but also includes data from other plant logistics systems e.g. milkruns"*. If the demo dashboard only ever shows rows our own app created, we have failed the stated intent — and it is the easiest requirement in the entire brief to overlook.

Seed **~120 records** spanning:

- ~70 inbound parcels across all four carriers, statuses distributed across STORED / DELIVERED, timestamps spread over 30 days with realistic clustering in working hours.
- ~35 **internal milkrun** transit items (`MR-2026-MM-DD-NNN`, carrier `Internal Milkrun`), mostly `IN_TRANSIT`, locations like `LINE_B_STAGING`, `LINE_31_STAGING`, `WH-DOCK-3`.
- ~10 internal transfers between departments.
- ~5 deliberately interesting records: one awaiting pickup for 4 days (drives the "Awaiting pickup >24h" KPI), one with a NULL recipient, one on a trolley, one with a completed SAP PO, one delivered same-day.

The three rows given in §3.2.3.1 are seeded **verbatim** so that anything Bosch recognises from their own document is present exactly as written.

A **milkrun simulator** (toggle in the ops console) advances a few transit items every 30s during the demo, so the board is quietly alive even when nobody is scanning. Subtle, and it makes the "real-time" claim self-evident.

---

## 8. Beyond the brief — the showcase layer

Optional, built only after all P0/P1 work is complete. Each is one component and each answers a question a plant manager actually has.

| Feature | Why it earns its place |
|---------|------------------------|
| **Natural-language search** ⭐ | The AI element for the current scope — see [`09-SCOPE-CONFERENCE-DEMO.md`](./09-SCOPE-CONFERENCE-DEMO.md) §6. Plain-language query → validated structured filter object → the same filter path as the manual chips, which visibly populate so the user sees what was understood. Now **in scope, not optional** |
| **KPI strip** — total today, in transit, stored, awaiting pickup >24h | Turns a list into an operational picture |
| **Aging alert** — parcels stored >24h without pickup surface with an amber left rail | The single most common real complaint in goods receipt |
| **Rack occupancy widget** — live view of `tbl_storage_locations`, occupied vs free by department | Uses a table we already maintain; visually striking; anticipates "how do we know where there's space?" |
| **Volume-by-hour sparkline** | Staffing insight from data we already have |
| **Saved views** — "My parcels", "Awaiting pickup", "Milkruns in transit" | Shows the platform has a notion of users and preferences |
| **CSV export** | Every plant person asks for it eventually |
| **Deep-linkable filters** | Enables "send me this view" — a workflow, not a screenshot |

Deliberately **not** built: a plant map visualisation. It is expensive, it invites questions about floorplan accuracy we cannot answer, and it adds nothing to the graded requirements.

---

## 9. Performance targets

| Metric | Target |
|--------|--------|
| First contentful paint (board mode, 120 records) | < 1.0s |
| Filter application to repaint | < 150ms |
| SSE event to visible update | < 500ms |
| Table mode with 10,000 seeded rows | 60fps scrolling (virtualised) |
| Lighthouse performance | ≥ 90 |

The 10,000-row test is not required by the brief. Running it once and being able to say "it handles ten thousand records at sixty frames per second" pre-empts the scalability question before it is asked.

---

## 10. Acceptance criteria

| ID | Criterion |
|----|-----------|
| A3.1 | View is strictly read-only; no mutation endpoint is reachable from this app |
| A3.2 | All six required fields visible for every record without opening a detail view |
| A3.3 | Carrier filter works across all four carriers plus Internal Milkrun |
| A3.4 | Date filter presets and custom range both return correct subsets |
| A3.5 | Recipient filter matches partial and case-insensitive input |
| A3.6 | Status filter correctly isolates STORED / IN_TRANSIT / DELIVERED |
| A3.7 | Combined filters apply with AND semantics and show an accurate result count |
| A3.8 | Free-text search finds a record by partial tracking ID |
| A3.9 | Milkrun and other non-App-2 records are present and visually distinguishable |
| A3.10 | The three sample rows from §3.2.3.1 are present verbatim |
| A3.11 | A parcel registered in App 2 appears within 2 seconds with no manual refresh |
| A3.12 | Status change propagates live to an open board |
| A3.13 | SSE disconnection is surfaced and recovers automatically |
| A3.14 | Board mode is legible at 4m on a 1080p display |
| A3.15 | Mobile mode is fully usable on a 375px viewport |
| A3.16 | Filter state survives a page reload via the URL |
| A3.17 | CSV export matches the visible filtered set |
| A3.18 | Empty and error states are designed, never blank |
