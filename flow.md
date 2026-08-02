# Manual test flows

How to click through the real app yourself and see every acceptance gate (C1–C16) work. This is the manual counterpart to `tests/e2e/` — use it to rehearse the demo, sanity-check a change, or show someone the app for the first time.

## Setup

```bash
npm install
npm run demo:reset   # wipes and reseeds to the exact baseline — run this before every pass through these flows
npm run dev          # localhost:3000
```

Open **<http://localhost:3000>** — it's a hub page linking to every screen below. Keep two tabs open side by side for the best experience: **Board** in one (the projector view) and **Inbound** in the other (the phone view). That pairing is the whole demo.

Run `npm run demo:reset` again any time the data feels stale or a flow below doesn't match what's described (every flow assumes the exact seeded baseline: 125 parcels, 13 locations, 5 SAP orders, 4 AD users, 70 seeded emails).

---

## Quick reference — test data

Use these when a flow says "scan" or "type" — they're chosen to be fresh (not already in the seed data) unless the flow specifically wants a collision.

| Purpose                                               | Value                                           | Notes                                    |
| ----------------------------------------------------- | ----------------------------------------------- | ---------------------------------------- |
| Fresh valid DHL label                                 | `JD1234567890123456`                          | `JD` + 16 digits                       |
| Fresh valid UPS label                                 | `1Z1234567890ABCDEF`                          | `1Z` + 16 alphanumeric                 |
| Fresh valid GLS label                                 | `123456789012`                                | exactly 12 digits                        |
| Fresh valid Amazon label                              | `TBA123456789012`                             | `TBA` + 12 digits                      |
| Invalid label                                         | `XYZ123`                                      | matches no carrier                       |
| Already-registered DHL (seeded verbatim)              | `JD0123456789012345`                          | triggers the duplicate/amber wash        |
| Already-registered UPS (seeded verbatim)              | `1Z999AA10123456784`                          | triggers the duplicate/amber wash        |
| SAP PO → John Doe, MOE/LOG-A, active                 | `4500987654`                                  | proposes`RACK-A-05`                    |
| SAP PO → Bob Builder, MOE/ENG-2, active              | `4500987655`                                  | dept racks full → proposes`RACK-C-13` |
| SAP PO → Sarah Connor, MOE/MFG-P,**completed** | `4500111222`                                  | shows the "Order completed" chip         |
| SAP PO → Alice Wonderland,**no department**    | `4500222333`                                  | AD lookup fills the department           |
| SAP PO →**no recipient**, MOE/LOG-A            | `4500333444`                                  | recipient renders N/A                    |
| SAP PO not in SAP at all                              | `9999999999`                                  | "PO number not found in SAP."            |
| Known AD name                                         | `Alice Wonderland` (or `Alice Wonder`)      | resolves to MOE/LOG-A                    |
| Known AD name                                         | `John Doe`, `Bob Builder`, `Sarah Connor` | also resolve                             |
| Name not in AD                                        | `Random Person`                               | resolves with no department/email        |
| Explicit skip                                         | `Unknown` (the chip, or typed)                | **no AD query at all**             |
| New carrier pattern (admin)                           | carrier`DPD`, pattern `^05[0-9]{12}$`       | then scan`05123456789012`              |
| New location (admin)                                  | e.g.`RACK-D-01`, type `RACK`                |                                          |

---

## Flow 1 — look around the dashboard first

1. Go to **/board**. Dark theme, KPI strip (Total today / In transit / Stored / Awaiting pickup >24h), a live card grid, `● LIVE` badge top right. This is what's on the projector.
2. Go to **/table**. Filter rail on the left (Carrier, Status, Date, Recipient, Department, Location type), a dense sortable table, **Export CSV**. Click a row → a detail drawer slides in from the right with the full field set and an event timeline.
3. Go to **/mobile** (or just shrink your browser to ~390px wide). Search-first layout, "Find my parcels" quick-chips for the four seeded people, then stacked cards.
4. In **/table**, click a couple of carrier/status chips and watch the URL grow query params and the result count update ("Showing X of Y parcels"). Reload the page — the filters survive (A3.16).
5. Look for `MR-2026-07-08-001` (search for it) — that's a milkrun row, visually distinct (grey dot, "Milkrun" label), proving the dashboard shows more than just what the inbound app writes (§3.2.2.2's whole point).

---

## Flow 2 — the happy path (SAP PO), start to finish

This is Beats 2–6 of the demo script.

1. Go to **/inbound**.
2. Under "Enter manually", type `XYZ123` and press **Go**. → full-screen **red** wash, "Invalid Format!", the scanned value shown in mono. Only one button: **Scan again**. *(gate C1)*
3. Click **Scan again**, then type `JD1234567890123456` and press **Go**. → full-screen **green** wash with the tracking ID and "from DHL — successfully registered." *(gate C2)* Click **Next** (or wait ~1.4s for it to auto-advance).
4. "Does an active SAP PO number exist?" → tap **Yes**.
5. Type the SAP PO field one digit at a time: at 9 digits, **Next** stays disabled and a `9 / 10` counter shows why; at the 10th digit it enables. *(gate C4)* Enter `4500987654`.
6. Tap **Next**. → Proposal screen: Recipient **John Doe**, Department **MOE/LOG-A**, Go To **RACK-A-05**. *(gate C5)* Tap **"Why this location?"** — it explains the cascade in plain language.
7. Tap **Scan Location**. Under the manual field, type the **wrong** code, e.g. `RACK-C-12`, and press **Go**. → full-screen **red** wash, "Wrong location!", **Expected: RACK-A-05 / Scanned: RACK-C-12** stacked in mono. The only button is **Scan again** — there is no way around this. *(gate C10 — the most important moment in the whole demo)*
8. Click **Scan again**, this time type the **correct** code `RACK-A-05` and press **Go**. → **green** wash, "Location verified! You can now place the parcel in RACK-A-05." *(gate C11)* Tap **Next**.
9. Completion screen: tracking ID, `RACK-A-05`, "Sent to <john.doe@bosch.com>", elapsed time. *(gates C13, C15)*
10. Go to **/inbound/inbox** — the exact email is there: subject "Your parcel is ready for pickup at Goods Receipt", body naming the tracking ID and `RACK-A-05`. *(gate C13, verbatim strings)*
11. Switch to your **/board** tab (don't reload) — the parcel you just registered has already slid in at the top, highlighted. If you timed it, well under 2 seconds after step 8. *(gate C16 — the demo's other key moment)*

---

## Flow 3 — the negative case (Unknown recipient, no email)

Beat 7 of the demo script — the "nothing happened, and that's correct" moment.

1. **/inbound** → scan `1Z1234567890ABCDEF` (fresh UPS label) → Next.
2. "Does an active SAP PO number exist?" → tap **No**.
3. Tap the **Unknown** chip (don't type a name) → tap **Next** immediately. Notice there's no pause here — a known name would take ~250ms for the Active Directory lookup; skipping to Unknown is instant. *(gate C7)*
4. Proposal screen shows Recipient **N/A**, Department **—**, and (on a fresh baseline) **RACK-C-13** — the cascade skipped straight to the general rack because there's no department to match. *(gate C8's sibling — no-department fallback)*
5. Scan the correct location, finalize. Completion screen says **"No notification — stored on a transit trolley, or recipient unknown."** *(gate C14)*
6. Go to **/ops** and look at the event feed — you'll see a `RECIPIENT_RESOLVED` row with decision `SKIPPED` and the reason `Recipient entered as "Unknown" — Active Directory not queried (§3.2.4 B.1)`, plus an `EMAIL_DECISION` row with decision `SKIPPED`. The skip is genuinely visible, not just silently correct.

---

## Flow 4 — filling every rack (gate C9, trolley fallback)

The baseline only has a handful of racks, so it's quick to exhaust them by hand if you want to see it live:

1. Repeat Flow 2 (or Flow 3) several times with fresh tracking IDs, always taking whatever rack gets proposed, until the proposal screen starts showing **TROLLEY-01** instead of a `RACK-*` location.
2. Finalize onto the trolley. Go to **/ops** → **Storage locations** — trolleys never show `(occupied)` even after storing onto them (deviation D9: trolleys hold many items in transit, so the fallback stays available for the next parcel). Racks you filled do show `(occupied)`.

---

## Flow 5 — duplicate scan

1. **/inbound** → scan the seeded verbatim ID `JD0123456789012345` (already `STORED` in the baseline).
2. → **amber** wash, "Already registered", showing where and when it was stored, with **Scan again** and **Register anyway**. This is a designed state, not a crash — a real carrier could hand you a re-scanned label.

---

## Flow 6 — unknown location code + live admin registration

1. Get to the **Scan Location** screen any way you like (Flow 2, steps 1–7).
2. Type a code that doesn't exist anywhere, e.g. `SHELF-DOES-NOT-EXIST`, and press **Go**. → red wash, "Unknown location code", the value shown in mono, plus a secondary action **"Register this location (demo)"**.
3. Tap it. Pick a type (RACK / TROLLEY / STAGING), tap **Register & verify**.
4. Notice it does **not** silently let you through — it still shows **"Wrong location!"**, because the code you scanned genuinely isn't the one that was proposed. Registering a location teaches the system about it for *future* proposals; it never overrides the current mismatch. Scan the actually-correct location to proceed.

---

## Flow 7 — the ops console

1. Go to **/ops**. Health strip across the top: parcel/location/email/event counts, adapter latency (250ms), live board-viewer count.
2. **Event feed** — leave this tab open and, in another tab, run any flow above. Watch decisions stream in live (no refresh): `SCAN_VALIDATED`, `RECIPIENT_RESOLVED`, `LOCATION_PROPOSED`, `LOCATION_VERIFIED`, `FINALIZED`, `EMAIL_DECISION` — each with a decision (`OK` / `SKIPPED` / `REJECTED` / `BLOCKED`) and a plain-language reason.
3. **Add a carrier pattern live** — under Carrier patterns, enter carrier `DPD`, pattern `^05[0-9]{12}$`, tap **Add pattern**. Go to **/inbound**, scan `05123456789012` → green wash, "from DPD". Start to finish, well under 20 seconds. *(gate C3)*
4. Try adding a pattern that would shadow an existing carrier, e.g. pattern `^[A-Z0-9]{18}$` — it's rejected with a reason mentioning which carrier it collides with. The guard runs even for patterns added earlier in the same session, not just the original four.
5. **Register a location live** — under Storage locations, enter e.g. `RACK-D-01`, pick `RACK`, tap **Register location**. It appears in the chip list immediately (not occupied).
6. **Reset demo data** — top right, confirm — wipes everything back to the exact seeded baseline. Useful between rehearsals (and exactly what `npm run demo:reset` does from the CLI).

---

## Flow 8 — natural-language search

On **/table**, there's a purple-bordered "✦ Ask in plain language" field above the regular search box.

- **Without an `ANTHROPIC_API_KEY` set:** type anything and tap **Ask** — it degrades quietly: a caption says AI search isn't configured, and your query runs through the plain free-text search box instead. Nothing breaks.
- **With `ANTHROPIC_API_KEY` set** (`export ANTHROPIC_API_KEY=...` before `npm run dev`): try the demo's rehearsed queries —

  - *"anything from DHL this week"*
  - *"parcels for MOE/LOG-A still waiting for pickup"*
  - *"John Doe's parcels"*
  - *"what's still in transit from the milkrun"*

  The filter chips on the left populate to match what the model understood, and a one-line explanation appears under the search box. You can then adjust any chip by hand — the AI never bypasses the normal filter path, it just fills it in.

**Note:** this feature was built and its fallback path verified, but never round-tripped against a live Claude call in this environment (no API key was available). Rehearse it once with a real key before relying on it live.

---

## Flow 9 — confirm it survives a dead network

The whole point of the SQLite/local-adapter architecture is that the venue network can die and the demo keeps working.

1. Turn off Wi-Fi / unplug ethernet on the machine running `npm run dev` (or just disconnect from the internet — everything runs on `localhost`, so LAN/internet isn't needed at all).
2. Click through Flow 2 end to end. Everything still works — scanning, the cascade, location verification, finalization, the dashboard, the ops console.
3. Try Flow 8's AI search — it degrades to text search with a quiet notice, exactly as it does with no API key configured.

---

## Flow 10 — PWA install & a real phone

**On this machine (desktop Chrome):** open **/inbound**, open DevTools → Application tab → Manifest — you should see the app name, icons, and `start_url: /inbound`. Under Service Workers, confirm one is registered and **activated**.

**On a real phone**, two options:

- **USB + port forwarding (recommended — works around the HTTPS requirement):** plug an Android phone into this machine, enable USB debugging, open `chrome://inspect` on desktop Chrome, and set up port forwarding for `localhost:3000`. Then open `http://localhost:3000/inbound` **on the phone's Chrome** — because the phone treats it as `localhost`, camera access (`BarcodeDetector`/`getUserMedia`) is allowed even without HTTPS. From the phone's Chrome menu, **Add to Home screen** should offer to install it.
- **Same Wi-Fi, plain LAN IP:** find this machine's LAN IP (`ip addr` / `ifconfig`) and open `http://<that-ip>:3000/inbound` from the phone. The UI will load, manual entry will work, but **the camera will likely be blocked** — browsers only allow camera access on `localhost` or over HTTPS, and a bare LAN IP over HTTP is neither. If you need camera testing this way, put a reverse proxy with a real or self-signed HTTPS certificate in front of it (e.g. `ngrok http 3000` gives you an HTTPS URL for free with no setup).

Either way, once on the phone: grant camera permission, try scanning a real barcode/QR code, and confirm the manual-entry fallback still works if you deny permission or the label doesn't scan. This is the one part of the demo that could not be verified in this environment — there was no camera or physical device available — so it's worth doing at least once before the actual conference.

---

## Troubleshooting

- **Data looks wrong / a flow doesn't match:** run `npm run demo:reset` — the flows above assume the exact seeded baseline.
- **A registration you already did is "in the way" of a flow:** every flow above uses fresh tracking IDs precisely so you don't need to reset between them, but repeated full passes will eventually occupy every rack (see Flow 4) — reset if you want a clean slate.
- **The board doesn't seem "live":** check the `● LIVE` badge — if it's amber and says `RECONNECTING`, the SSE connection dropped; it retries automatically with backoff.
- **Something looks broken after a code change:** `npm test && npm run typecheck && npm run lint && npm run test:e2e` — the first three take seconds, the Playwright suite takes about a minute and re-proves all 16 gates against the real running app.
