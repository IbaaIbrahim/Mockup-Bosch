# Flow reference — what each step means and where it lives

A companion to [`flow.md`](flow.md). For every numbered step there, this explains **what it's actually testing** and **exactly where that behaviour is implemented** — file and line. Use it when a step in `flow.md` doesn't do what you expected and you want to go straight to the code, or when you want to understand *why* a step exists before demoing it.

Citations point to source files (`file:line`) and to the spec docs that require the behaviour (`docs/0X-...md`, or `§` section numbers from the source PDF, `docs/Live_Demo_Guideline_Workflow_Bosch.pdf`).

---

## Setup

`npm run demo:reset` truncates every table and reloads the exact seed fixtures — same data, every time, regardless of what previous runs left behind.

- **What it means:** the acceptance gates (below) depend on specific rows existing in specific states (e.g. `RACK-A-04` occupied, `RACK-A-05` vacant) — if the data has drifted from a previous test run, a flow can silently propose a different rack than the one described.
- **Reference:**
  - `src/db/reset.ts` — the CLI script `npm run demo:reset` runs
  - `src/db/seed.ts:20` (`seedDatabase`) — truncates tables in FK-safe order, then inserts fixtures
  - `src/db/seed-data.ts` — the fixtures themselves (`STORAGE_LOCATIONS:30`, `SAP_ORDERS:133`, `DIRECTORY_USERS:173`, `VERBATIM_PARCELS:212`)
  - `docs/05-DATA-MODEL.md` §6 — the seed data spec this file implements, including *why* `RACK-B-01`/`RACK-B-02` are both seeded occupied (so gate C8 is reachable without contriving anything)

---

## Quick reference — test data

Each row in that table is a specific branch of engine logic. Worth knowing which one before you use it:

| Row | What it exercises | Reference |
|---|---|---|
| Fresh DHL/UPS/GLS/Amazon labels | The four carrier regexes, applied in priority order | `src/engine/carrier-format.ts:30` (`DEFAULT_CARRIER_FORMATS`), `:118` (`matchCarrier`) |
| Invalid label | No pattern matches → rejection | `src/engine/carrier-format.ts:57` (`INVALID_FORMAT_MESSAGE`, the exact PDF string) |
| Already-registered IDs | Duplicate detection against `tbl_parcels` | `src/server/inbound-service.ts:60` (`validateTrackingScan`) — checks `getParcelByTrackingId` before returning valid |
| SAP PO → John Doe (`4500987654`) | SAP order lookup + department-rack cascade | `src/engine/recipient-resolution.ts:90` (`resolveFromSap`), `src/engine/location-cascade.ts:64` (`proposeLocation`, Priority 1) |
| SAP PO → Bob Builder (`4500987655`) | Dept racks full → general-rack fallback | `src/engine/location-cascade.ts:108` (Priority 2) — reachable because `seed-data.ts:81,88` seed both `RACK-B-01`/`RACK-B-02` as occupied |
| SAP PO → Sarah Connor (`4500111222`), COMPLETED | The order-completed informational chip | `src/app/inbound/screens/SapEntryScreen.tsx:64` computes `completedPoNumber`; rendered on the *next* screen at `src/app/inbound/screens/ProposalScreen.tsx:41` (see the note on Flow 2 step 6 below for why it isn't shown on the SAP entry screen itself) |
| SAP PO → Alice Wonderland, no department (`4500222333`) | AD lookup fills a department SAP didn't provide | `src/engine/recipient-resolution.ts:90-107` — `if (!department) department = user.department` |
| SAP PO → no recipient (`4500333444`) | Cascade must still resolve with a null recipient | `src/engine/location-cascade.ts:64` — `department` param is nullable by design |
| SAP PO not found (`9999999999`) | SAP lookup miss, not an error | `src/server/inbound-service.ts:121` (`lookupSapOrder`) — returns `{found: false}`, never throws |
| Known AD name / alias | Name → Active Directory resolution, including the "Alice Wonder"/"Alice Wonderland" alias | `src/engine/recipient-resolution.ts:129` (`resolveFromName`), alias list at `src/db/seed-data.ts:201` |
| `Unknown` | The literal skip — no AD query at all | `src/engine/recipient-resolution.ts:38,40` (`UNKNOWN_RECIPIENT`, `isUnknownRecipient`); enforced by ordering in `src/server/inbound-service.ts:157` (`resolveManualRecipient`) — the AD adapter call happens *after* the Unknown check, not before |
| New carrier pattern (admin) | Carrier patterns are data, not code | `src/server/carrier-formats-repo.ts:39` (`addCarrierPattern`), guarded by `src/engine/carrier-format.ts:174` (`validateNewPattern`) |
| New location (admin) | Live location registration | `src/server/locations-repo.ts:97` (`registerLocation`) |

---

## Flow 1 — look around the dashboard first

**1. `/board`.** Dark theme, KPI strip, live card grid, `● LIVE` badge.
- **What it means:** this is the wall-display mode — no chrome, legible from across a room, dark by default (not a user toggle).
- **Reference:** `src/app/(dashboard)/board/BoardClient.tsx` — `data-theme="dark"` wrapper (dark tokens cascade automatically, no per-component branching); KPI strip reads `src/server/parcels-repo.ts:244` (`getDashboardKpis`); the live grid subscribes via `src/hooks/useParcelStream.ts:19`; the badge itself is `src/design/components/LiveBadge.tsx`.

**2. `/table`.** Filter rail, sortable table, Export CSV, detail drawer on row click.
- **What it means:** the analyst view — every filter is a real query parameter, not client-side-only filtering, so it's shareable and reloadable.
- **Reference:** `src/app/(dashboard)/table/TableClient.tsx`; filters flow through `src/hooks/useDashboardFilters.ts` into the query API `src/app/api/parcels/route.ts`, which is answered by `src/server/parcels-repo.ts:112` (`queryParcels`); the drawer fetches `src/app/api/parcels/[trackingId]/route.ts`, backed by `src/server/parcels-repo.ts:163` (`getParcelDetail`).

**3. `/mobile`.** Search-first, "Find my parcels" quick-chips, stacked cards.
- **What it means:** there's no login system in this demo, so "find my parcels" is a one-tap recipient shortcut instead of a session lookup — same UX outcome without inventing an auth layer.
- **Reference:** `src/app/(dashboard)/mobile/MobileClient.tsx:26` (`QUICK_PEOPLE` — the four seeded names).

**4. Click filter chips in `/table`, watch the URL, reload.**
- **What it means:** filter state lives entirely in the URL — there's no separate client state to go stale or desync (gate A3.16 in the acceptance table).
- **Reference:** `src/hooks/useDashboardFilters.ts:23` (`useSearchParams`) reads state, `:56` (`router.replace`) writes it — the URL *is* the state, nothing is mirrored into `useState`.

**5. Find `MR-2026-07-08-001` — a milkrun row.**
- **What it means:** §3.2.2.2 of the source PDF requires the dashboard to show parcels from other plant systems, not just what the phone app writes — the single easiest requirement in the whole brief to accidentally miss.
- **Reference:** the row itself is seeded verbatim at `src/db/seed-data.ts:212` (`VERBATIM_PARCELS`); the visual distinction (grey dot, "Milkrun" label) is `src/design/components/ParcelCard.tsx` checking `sourceSystem !== 'INBOUND_APP'`; the bulk of generated milkrun rows come from `src/db/seed-data.ts:404` in `generateParcels`.

---

## Flow 2 — the happy path (SAP PO), start to finish

**Step 2 — invalid label → red wash (gate C1).**
- **What it means:** an unrecognised label is a normal, expected outcome that the operator recovers from by rescanning — never a thrown error reaching the screen.
- **Reference:** gate defined at `docs/09-SCOPE-CONFERENCE-DEMO.md:131`. Regex rejection: `src/engine/carrier-format.ts:118` (`matchCarrier`) returns `{valid: false}`; exact string at `:57` (`INVALID_FORMAT_MESSAGE`). Wired through `src/app/api/inbound/validate/route.ts` → `src/server/inbound-service.ts:60` (`validateTrackingScan`), which also logs the rejection reason via `logOpsEvent` (visible in Flow 7). Rendered by `src/app/inbound/screens/ScanScreen.tsx:94` (`tone="error"`).

**Step 3 — valid DHL label → green wash (gate C2).**
- **What it means:** the PDF's own sample IDs render with embedded whitespace (a rendering artifact, not a formatting choice) — a naive parser would reject Bosch's own examples. Normalisation strips that whitespace before matching.
- **Reference:** gate at `docs/09-SCOPE-CONFERENCE-DEMO.md:132`. Normalisation: `src/engine/carrier-format.ts:107` (`normaliseTrackingId`) — strips ordinary and zero-width whitespace, BOMs, and control characters via a single character-class regex (see the comment there about why the ranges must be inside `[...]`). Success string built at `:64` (`successMessage`). Rendered at `src/app/inbound/screens/ScanScreen.tsx:79` (`tone="success"`).

**Step 5 — SAP PO 9/10 digit counter (gate C4).**
- **What it means:** the disabled Next button explains itself with a live counter rather than being silently unclickable.
- **Reference:** gate at `docs/09-SCOPE-CONFERENCE-DEMO.md:134`. Length constant `src/engine/recipient-resolution.ts:21` (`SAP_PO_LENGTH`). Client-side gating: `src/app/inbound/screens/SapEntryScreen.tsx:47` (`isComplete`), `:102-103` (`disabled` + `disabledReason` showing `X / 10`). Server re-validates independently at `src/app/api/inbound/sap/route.ts` (a client-only check is never trusted alone).

**Step 6 — proposal: John Doe / MOE/LOG-A / RACK-A-05 (gate C5).**
- **What it means:** SAP supplies the recipient and department; the cascade then picks the first vacant rack assigned to that department, in `location_id` order (deterministic, not "whichever rack the DB happens to return first").
- **Reference:** gate at `docs/09-SCOPE-CONFERENCE-DEMO.md:135`. SAP resolution: `src/engine/recipient-resolution.ts:90` (`resolveFromSap`). Cascade Priority 1: `src/engine/location-cascade.ts:71` (department-rack branch), sorted by `byId` a few lines above. Orchestration: `src/server/inbound-service.ts:176` (`proposeStorageLocation`). Screen: `src/app/inbound/screens/ProposalScreen.tsx:73` (`GO TO`), `:98` ("Why this location?" — literally renders the cascade's own trace array, not a separate explanation).
- **The "Order completed" chip**, if you use PO `4500111222` instead: it's computed in `SapEntryScreen.tsx:64` but *rendered on this screen*, not the SAP entry screen — because the SAP entry screen navigates away in the same tick `onResolved` fires, so a chip shown there would flash and vanish before anyone could read it. See `ProposalScreen.tsx:41` (`orderCompletedPoNumber`) and `InboundWizard.tsx` where `sapOrderCompleted` is threaded from one screen's `onResolved` callback into the next screen's props.

**Step 7 — wrong location → hard block (gate C10, the most important one).**
- **What it means:** there is no override, skip, or "continue anyway" anywhere in this code path — not a missing feature, a deliberate absence. The mismatch screen has exactly one button.
- **Reference:** gate at `docs/09-SCOPE-CONFERENCE-DEMO.md:140`, and the comment block at `docs/09-SCOPE-CONFERENCE-DEMO.md:219` (Beat 4 of the demo script) explaining why this is staged deliberately. Engine: `src/engine/location-verify.ts:160` (`status: 'MISMATCH'`) — literal string comparison, no fuzzy matching, no "close enough". `canProceed` at `:169` returns `false` for anything but `MATCH`. Screen: `src/app/inbound/screens/LocationScanScreen.tsx:71` (`if (result?.status === 'MISMATCH')`) — renders `StateWash` with only a `primaryAction` ("Scan again"), no `secondaryAction`, and the Back button is explicitly suppressed while a mismatch is showing via `onMismatchActive` (`:41-43`), consumed in `InboundWizard.tsx`'s `canGoBack` check.

**Step 8 — correct location → green wash (gate C11).**
- **Reference:** gate at `docs/09-SCOPE-CONFERENCE-DEMO.md:141`. `src/engine/location-verify.ts:140` (`status: 'MATCH'`), exact string built inline (`Location verified! You can now place the parcel in ${expectedNorm}.`). Screen: `LocationScanScreen.tsx:60`.

**Step 9 — completion screen (gates C13, C15).**
- **Reference:** gates at `docs/09-SCOPE-CONFERENCE-DEMO.md:143,145`. Atomic write: `src/server/inbound-service.ts:234` (`finalizeRegistration`) wraps insert-parcel + occupy-rack + write-event + release-reservation in a single `better-sqlite3` transaction (`rawDb.transaction(...)`, a few lines below the function start) — see the comment there for why a native transaction is used instead of threading a `tx` handle through every repo function. Occupancy rule (racks only, never trolleys): `src/engine/location-cascade.ts:186` (`shouldMarkOccupied`). Screen: `src/app/inbound/screens/CompletionScreen.tsx:64`.

**Step 10 — Inbox shows the exact email (gate C13).**
- **What it means:** subject and body are quoted verbatim from the source PDF — not paraphrased, not "close to" the spec text.
- **Reference:** `src/engine/recipient-resolution.ts:188` (`decideEmail`) — both the subject string and the body template literal are marked "verbatim from PDF §3.2.4 D. Do not reword." in the comment directly above. Mock SMTP sink: `src/adapters/smtp.ts`. Inbox page: `src/app/inbound/inbox/InboxClient.tsx`, reading `src/app/api/inbox/route.ts`.

**Step 11 — board updates live within 2 seconds (gate C16).**
- **What it means:** the phone and the projector are two different browser tabs with no shared client state — the only connection between them is the server. This proves the architecture is a real platform, not a demo trick.
- **Reference:** gate at `docs/09-SCOPE-CONFERENCE-DEMO.md:146`, called out as one of the two gates to build the whole demo around (`:150`). Emission: `src/server/inbound-service.ts:234`, `eventHub.emitParcelChange(...)` right after the transaction commits. Hub: `src/server/events-hub.ts:29` (`emitParcelChange`). Transport: `src/app/api/parcels/stream/route.ts` (SSE). Client: `src/hooks/useParcelStream.ts:19`, consumed in `BoardClient.tsx:32`. The decaying highlight on arrival: `HIGHLIGHT_MS` at `BoardClient.tsx:23`, CSS animation `.row-arrive` in `src/design/tokens.css:352`.

---

## Flow 3 — the negative case (Unknown recipient, no email)

**Step 3 — "Unknown" chip, no AD query, no pause (gate C7).**
- **What it means:** typing "Unknown" isn't just *treated* the same as a name AD doesn't recognise — the Active Directory adapter is never called at all. That's the difference between "logically ignored" and "literally never queried," and it's why there's no ~250ms delay.
- **Reference:** gate at `docs/09-SCOPE-CONFERENCE-DEMO.md:137`. The order-of-operations proof: `src/server/inbound-service.ts:157` (`resolveManualRecipient`) — `isUnknownRecipient` is checked **before** `directoryAdapter.all()` is ever called, not after. Adapter latency (what you'd see if it *were* called): `src/adapters/latency.ts` (`DEFAULT_ADAPTER_LATENCY_MS = 250`). Chip: `src/app/inbound/screens/NameEntryScreen.tsx:81`.

**Step 4 — falls to the general rack (no department to match).**
- **Reference:** `src/engine/location-cascade.ts:108` (Priority 2 branch) — `department` is `null`, so Priority 1 is skipped entirely (see the `trace` note "Skipped — no department known for this recipient" built a few lines above).

**Step 5 — no email sent (gate C14).**
- **Reference:** gate at `docs/09-SCOPE-CONFERENCE-DEMO.md:144`. `src/engine/recipient-resolution.ts:188` (`decideEmail`) — the `!recipientEmail` branch, returns `{send: false, reason: 'No notification — no email address on file for this recipient.'}`. Rendered at `CompletionScreen.tsx:84`.

**Step 6 — the skip is visible in the ops console.**
- **What it means:** CLAUDE.md's architecture rule 4 — "every decision is observable... especially a skip" — a `SKIPPED` decision writes a row exactly like an `OK` one does.
- **Reference:** `src/server/inbound-service.ts:157` logs the `RECIPIENT_RESOLVED`/`SKIPPED` row inline; the finalize path logs `EMAIL_DECISION`/`SKIPPED` at `:234`. Both go through `src/server/ops-events-repo.ts:38` (`logOpsEvent`), which also pushes to the live feed via `eventHub.emitOpsEvent` (`:37` in `events-hub.ts`). Read by `src/app/api/ops/events/route.ts` and streamed by `src/app/api/ops/events/stream/route.ts`.

---

## Flow 4 — filling every rack (gate C9)

- **What it means:** once every department and general rack is occupied, the cascade doesn't fail — it falls through to the transit trolley, which is always available because trolleys are explicitly exempted from the occupancy flag.
- **Reference:** gate at `docs/09-SCOPE-CONFERENCE-DEMO.md:139`. Priority 3 branch: `src/engine/location-cascade.ts:142`. The exemption: `:186` (`shouldMarkOccupied`) returns `false` for `TROLLEY` type unconditionally (there's a `literalMode` escape hatch for the literal PDF reading, documented in `docs/08-QUESTIONS-FOR-BOSCH.md` Q23, defaulted off). This is also why the "don't mark trolleys occupied" trap is called out explicitly in this project's `CLAUDE.md` — getting it backwards breaks the Priority 3 fallback after exactly one storage.

---

## Flow 5 — duplicate scan

- **What it means:** a real carrier could hand you a re-scanned label (a sticker peeled and reapplied, a phone shown the same shipping confirmation twice). The correct response is a designed amber state, not a database constraint error leaking to the screen.
- **Reference:** `src/server/inbound-service.ts:60` (`validateTrackingScan`) — `getParcelByTrackingId` check, `existing.status === 'STORED'` branch, returns a `duplicate` field instead of failing. Screen: `src/app/inbound/screens/ScanScreen.tsx:56` (`if (result?.valid && result.duplicate)`), `tone="warning"` at `:59`. "Register anyway" is present as an affordance but intentionally produces a friendly in-place error (`registerAnywayError` at `:34`) rather than actually re-registering — the tracking ID is a real primary key (`src/db/schema.ts`), and silently allowing a second row would corrupt the one-tracking-ID-one-parcel invariant the whole schema depends on.

---

## Flow 6 — unknown location code + live admin registration (gate C12)

- **What it means:** an operator can teach the system about a location it's never seen (a new rack installed since the last data sync) without that registration secretly overriding the current, unrelated mismatch. The two are separate decisions.
- **Reference:** gate at `docs/09-SCOPE-CONFERENCE-DEMO.md:142`. Detection: `src/engine/location-verify.ts:152` (`status: 'UNKNOWN_LOCATION'`) — the scanned value doesn't match any ID in `knownIds`. Screen: `src/app/inbound/screens/LocationScanScreen.tsx:82`, with the registration sub-form at `:158` (`RegisterLocationForm`). Registration itself: `src/server/locations-repo.ts:97` (`registerLocation`), exposed at `src/app/api/admin/locations/route.ts` (`POST`). **The re-verify after registering** (`LocationScanScreen.tsx`'s "Register & verify" button) calls `verify(registerForm.locationId)` again against the *same original* `proposedLocationId` — since the newly-registered code is (almost always) a different physical location than what was proposed, this correctly re-resolves to `MISMATCH`, not `MATCH`. That's not a bug; it's the same hard-block guarantee from gate C10 applying here too.

---

## Flow 7 — the ops console

**Step 2 — live event feed.**
- **Reference:** `src/app/ops/OpsConsoleClient.tsx:84` (`new EventSource('/api/ops/events/stream')`) for the live tail, plus an initial fetch of `src/app/api/ops/events/route.ts` for history. Both read the same underlying log: `src/server/ops-events-repo.ts:38` (write) / `:67` (`listOpsEvents`, read).

**Step 3 — add a carrier pattern live (gate C3).**
- **What it means:** carrier patterns are rows in a table, not constants compiled into the app — adding one is an admin action with a database write, not a deploy.
- **Reference:** gate at `docs/09-SCOPE-CONFERENCE-DEMO.md:133`. UI: `OpsConsoleClient.tsx:96` (`addCarrierPattern`). Server: `src/server/carrier-formats-repo.ts:39` (`addCarrierPattern`), guarded by `src/engine/carrier-format.ts:174` (`validateNewPattern`) *before* the insert. New patterns default to priority `100+` (a few lines into `carrier-formats-repo.ts:39`) specifically so they can never shadow one of the four original, already-specified patterns.

**Step 4 — a shadowing pattern is rejected.**
- **Reference:** `src/engine/carrier-format.ts:174` (`validateNewPattern`) — tests the candidate pattern against a fixed set of probe strings (one per existing carrier) and rejects if it matches one that already belongs to someone else. The check re-runs against the *current* live pattern set (`getAllCarrierFormats()` in `carrier-formats-repo.ts:22`), not just the original four — so a pattern added five minutes ago on stage is also protected against.

**Step 5 — register a location live.**
- **Reference:** same code path as Flow 6's admin registration: `src/server/locations-repo.ts:97`, `OpsConsoleClient.tsx:113` (`addLocation`).

**Step 6 — reset demo data.**
- **Reference:** `src/app/api/admin/reset/route.ts` calls `src/db/seed.ts:20` (`seedDatabase`) directly against the live connection — the exact same function `npm run demo:reset` (Setup, above) invokes from the CLI, so the button and the command are guaranteed to produce identical results.

---

## Flow 8 — natural-language search

- **What it means:** the model never touches the database directly — it returns a structured, Zod-validated filter object via forced tool use, which is then applied through the *exact same* `update()` function the manual filter chips call. If the model is unreachable, misconfigured, or returns something invalid, the query falls back to plain-text search — quietly, not as an error.
- **Reference:** `docs/09-SCOPE-CONFERENCE-DEMO.md` §6 (natural-language search spec). Schema: `src/lib/ai-search-schema.ts` (`AiSearchFilterSchema`, `AI_SEARCH_TOOL_INPUT_SCHEMA`). Route: `src/app/api/ai/search/route.ts` — note the very first check is `if (!process.env.ANTHROPIC_API_KEY)` (immediate, quiet fallback, no network attempt at all), and the whole model call is wrapped in a `try/catch` that produces the same quiet-fallback shape on any failure. Client: `src/design/components/NlSearchBar.tsx:31` — `onApply` (passed in as `update` from `useDashboardFilters`) is called identically whether the AI succeeded (`:51`) or fell back to raw text search (`:65`/`:69`).

---

## Flow 9 — confirm it survives a dead network

- **What it means:** every piece of runtime state — the database, the carrier patterns, the location table, the mock SAP/AD/SMTP systems — is a local SQLite file and local adapters. There is nothing in the request path to any of the core flows that reaches outside `localhost`, so a dead venue network can't touch it.
- **Reference:** `src/db/client.ts` (SQLite file, no network); `src/adapters/sap.ts`, `src/adapters/directory.ts`, `src/adapters/smtp.ts` (all read/write local tables, only *simulating* latency via `src/adapters/latency.ts`, never making a real network call). The one genuinely external dependency in the whole app is the optional AI search call in Flow 8, which is exactly why that route's fallback behaviour (above) matters — it's the sole place the offline guarantee has to be actively engineered rather than falling out of the architecture for free.

---

## Flow 10 — PWA install & a real phone

- **What it means:** installability requires a web app manifest (name, icons, `start_url`, `display: standalone`) and an active service worker — both were built specifically to make this flow possible; nothing here is "just a browser default."
- **Reference:** manifest: `public/manifest.webmanifest:5` (`start_url: "/inbound"` — the phone wizard, not the dashboard, is the installable surface). Linked in `src/app/layout.tsx:9` (`manifest: "/manifest.webmanifest"`). Service worker: `public/sw.js` (deliberately a pure network passthrough — see the comment there on why this demo doesn't need offline *caching*, only offline *operation*, which it already has per Flow 9). Registration: `src/app/ServiceWorkerRegistration.tsx:8-9`, mounted once in the root layout. Icons are placeholder solid-red PNGs (`public/icon-192.png`, `public/icon-512.png`, `public/apple-touch-icon.png`) generated by a throwaway script — replace with real artwork before the conference.
- **The camera/HTTPS caveat** (why `flow.md` recommends USB port-forwarding over a bare LAN IP): `getUserMedia`/`BarcodeDetector`, used by `src/design/components/Scanner.tsx`, are only permitted by browsers in a secure context — `localhost` is exempted, a plain `http://<lan-ip>` is not. This isn't a bug in this codebase; it's a browser platform restriction that any camera-scanning PWA runs into identically.

---

## Troubleshooting

- **"The board doesn't seem live"** → check `src/design/components/LiveBadge.tsx:6` (`RECONNECTING` state) — driven by `src/hooks/useParcelStream.ts:49` (`es.onerror`), which retries with exponential backoff automatically; nothing to do but wait a few seconds.
- **Regression check command** (`npm test && npm run typecheck && npm run lint && npm run test:e2e`) → the e2e suite is `tests/e2e/*.spec.ts`, configured in `playwright.config.ts`; it re-runs every flow in this document as a scripted assertion (`tests/e2e/fixtures.ts` provides the shared `registerScan` helper the specs use to skip the repetitive early steps).
