# App 2 — Inbound Registration

Source: PDF §3.2.2.1 (Step-by-Step), §3.2.3 (Mock Data), §3.2.4 (Business Logic)
User: goods-receipt operator · Device: phone, portrait · Mode: linear guided wizard

---

## 1. Goal

> *"digitize and error-proof the goods receipt process"* — §3.2.1

"Error-proof" is the operative word. This app's value is that it **refuses to let the operator do the wrong thing**: it rejects malformed labels, it forbids a short PO number, and it hard-blocks storage in the wrong location. Every one of those refusals is a demo moment. Design them to look intentional and confident, never like a failure.

> *"We will provide all required location QR-Codes and carrier labels during the session. There is no need for you to prepare any codes or labels in advance."* — §3.2.2

Everything scanned on stage will be unfamiliar. Nothing may be hardcoded.

---

## 2. Flow map

```
S1 Scan tracking number
     ├─ invalid format ──► RED wash ──► rescan (loop, blocking)
     └─ valid ──────────► GREEN wash ──► Next
S2 SAP PO exists?
     ├─ Yes ──► S2a enter 10-digit PO ──► SAP_ERP lookup ──┐
     └─ No  ──► S2b enter recipient name (or "Unknown")     │
                    ├─ known name ──► Active Directory lookup ─┤
                    └─ "Unknown"  ──► no lookup ───────────────┤
                                                              ▼
                                             LOCATION CASCADE (§3.2.4 B.2)
                                                              ▼
S3 Show recipient / department / Go To Location  ──► Scan Location
     ├─ mismatch ──► RED wash (expected vs scanned) ──► rescan (blocking)
     └─ match ────► GREEN wash "Location verified" ──► Next
S4 Store parcel ──► INSERT tbl_parcels + UPDATE is_occupied=TRUE
                 ──► email IF location contains "RACK" AND email exists
                 ──► completion screen "Close App"
```

Wizard progress is shown as a 4-segment stepper in the app bar. A **back** action is available on every screen except the completion screen; going back re-opens the previous step with its value pre-filled.

---

## 3. Step 1 — Tracking number scan & format validation

### 3.1 Start screen (§3.2.2.1 Step 1)

- Header: **"Please scan the tracking number"**
- Supported carriers listed as logo chips: **DHL · UPS · GLS · Amazon**
- Primary action: **Start scanning** (opens `ScanFrame`)
- Discreet ghost action: **Enter manually** (risk R5/R9 insurance)

### 3.2 Format validation (§3.2.4 A) — exact expressions

| Carrier | Regex | Meaning |
|---------|-------|---------|
| DHL | `^JD[0-9]{16}$` | `JD` + 16 digits |
| UPS | `^1Z[A-Z0-9]{16}$` | `1Z` + 16 alphanumeric |
| GLS | `^[0-9]{12}$` | exactly 12 digits |
| Amazon | `^TBA[0-9]{12}$` | `TBA` + 12 digits |

Stored as **data**, in `carrier_formats (carrier, pattern, priority, active)` — not compiled into the source. An admin screen allows a new pattern to be added live in about fifteen seconds, which converts risk R3 (they hold up a DPD label) from an embarrassment into a feature demonstration.

**Normalisation before matching:** trim, strip whitespace and non-printing characters, uppercase. Do **not** strip a `JD`/`TBA` prefix or alter digits.

Evaluation is ordered by `priority` and the first match wins. Note that the four specified patterns are all fully anchored (`^…$`) and mutually exclusive by length and prefix, so **ordering is irrelevant for these four** — a 12-digit numeric string can only ever match GLS. The `priority` column exists for the patterns we may add live under risk R3: an unanchored or broader pattern added on stage must not be able to shadow a specified one, so newly added patterns are assigned a lower priority by default. A CI test asserts that no two active patterns match any of the sample IDs.

Note the sample data in §3.2.3.1 contains `JD012345678 9012345` (with a rendering space) and `1Z999AA1012 3456784`. After whitespace stripping these become `JD0123456789012345` (JD + 16 digits ✓) and `1Z999AA10123456784` (1Z + 16 alphanumeric ✓). Our normaliser handles this; a naive implementation would reject both. Worth verifying explicitly in tests.

### 3.3 Outcomes

**Invalid** — §3.2.2.1: *"The screen turns red and displays the error message: 'Invalid Format! Please scan a valid carrier label.' The operator must scan again until the format is valid."*

Full-screen red wash. 96px alert icon. Headline **"Invalid Format!"**. Detail: "Please scan a valid carrier label." Below, in mono and dimmed, the scanned value so the operator can see *what* was read — a small addition that makes the block feel diagnostic rather than obstructive. Single action: **Scan again**. No skip, no override. Blocking is the requirement.

**Valid** — *"The screen turns green and displays a confirmation: '${v_tracking_id} from ${v_carrier} has been successfully registered'."*

Full-screen green wash. Check icon. Headline is the tracking ID in `--text-mono-lg`, selectable. Detail: "from **DHL** — successfully registered." Carrier logo shown. Action: **Next**. Auto-advances after 1400ms.

**Duplicate handling** (not in the PDF, but plausible on stage): if the tracking ID already exists with status `STORED`, show an amber wash — "Already registered on 06 Jul at RACK-A-04" — with **View parcel** and **Register anyway** actions. Handling a repeat scan gracefully is exactly the robustness a plant buyer looks for.

---

## 4. Step 2 — Recipient identification

### 4.1 The question

Full screen, one question: **"Does an active SAP PO number exist?"** Two equal 64px buttons: **Yes** / **No**. One of only two screens in the system with equally weighted actions (`01-DESIGN-SYSTEM.md` §1, principle 1) — the system has no preferred answer, so neither button leads.

### 4.2 Path A — Yes (§3.2.2.1 Step 2)

- Numeric input, `inputmode="numeric"`, label "SAP PO number".
- *"The operator can only submit the number by tapping 'Next', if 10 digits has been entered."* → **Next** is disabled until `length === 10`; a live counter shows `7 / 10` so the disabled state explains itself.
- On submit, query the `SAP_ERP` adapter.

| Result | Behaviour |
|--------|-----------|
| Found | Take `recipient_name` and `department` from SAP. Proceed to the cascade. |
| Not found | Amber inline error: "PO number not found in SAP." Actions: **Try again** / **Continue without PO** (falls to Path B). Not specified in the PDF; needed because Bosch may type an arbitrary number. |
| `order_status = COMPLETED` | Accept but show an informational chip "Order completed 4500111222" — the PDF's sample data deliberately includes one completed order, so it is likely to be tried. |

SAP mock data (§3.2.3.2 System A):

| sap_po_number | recipient_name | department | order_status |
|---|---|---|---|
| 4500987654 | John Doe | MOE/LOG-A | ACTIVE |
| 4500987655 | Bob Builder | MOE/ENG-2 | ACTIVE |
| 4500111222 | Sarah Connor | MOE/MFG-P | COMPLETED |

Per §3.2.4 B.1, the SAP recipient *"could be a person, a department, or NULL"* and the department *"could be NULL"* — the cascade must handle all of these, so the seed data includes at least one PO with a NULL department to prove the fallback.

### 4.3 Path B — No (§3.2.2.1 Step 2)

- Text field: **"Enter recipient's full name from package label"**.
- *"If no name is visible on the package, they must enter 'Unknown'."*
- *"The 'Next' button is only enabled after text is entered."*
- Assistive addition: a type-ahead over the Active Directory names, plus a one-tap **"Unknown"** chip. Both reduce keyboard time in gloves and neither changes the specified behaviour.

Then, per §3.2.4 B.1: query `Bosch_Active_Directory` by name to obtain the department.

| Result | `v_recipient_name` | `v_department` | AD queried? |
|--------|--------------------|----------------|-------------|
| Name found in AD | as entered / canonical | AD department | yes |
| Name entered, not in AD | as entered | NULL | yes, no hit |
| Name = "Unknown" | NULL | NULL | **no — explicitly skipped** |

> *"If the recipient's name is unknown, the system sets ${v_recipient_name} and ${v_department} to NULL and no query to the Bosch_Active_Directory is needed."*

The "Unknown" case skipping the lookup entirely is a specific instruction; it should be observable in the ops console. *(Gate G16)*

Active Directory mock data (§3.2.3.2 System B):

| nt_user_id | recipient_name | email_address | department |
|---|---|---|---|
| DOE2AN | John Doe | john.doe@bosch.com | MOE/LOG-A |
| BUI4AN | Bob Builder | bob.builder@bosch.com | MOE/ENG-2 |
| CON1AN | Sarah Connor | sarah.connor@bosch.com | MOE/MFG-P |
| WON5AN | Alice Wonderland | alice.w@bosch.com | MOE/LOG-A |

Matching is case-insensitive on a normalised full name, with a fuzzy fallback (trigram similarity ≥ 0.8) offering a "Did you mean Alice Wonderland?" confirmation rather than silently guessing. Note the source document uses "Alice Wonder" in the App 1 staff table and "Alice Wonderland" in the AD table — see `08-QUESTIONS-FOR-BOSCH.md` Q7; we seed both as aliases of one person so either spelling resolves.

---

## 5. Location proposal cascade (§3.2.4 B.2)

`src/engine/location-cascade.ts` — pure function, fully unit-tested. Applies identically to the SAP and non-SAP paths.

```
INPUT: v_department (may be NULL)

Priority 1 — Department rack
  IF v_department IS NOT NULL:
     SELECT location_id FROM tbl_storage_locations
     WHERE location_type = 'RACK'
       AND assigned_department = v_department
       AND is_occupied = FALSE
     ORDER BY location_id LIMIT 1
  → if found, return it

Priority 2 — General rack (fallback)
  SELECT location_id FROM tbl_storage_locations
  WHERE location_type = 'RACK'
    AND assigned_department IS NULL
    AND is_occupied = FALSE
  ORDER BY location_id LIMIT 1
  → if found, return it

Priority 3 — Transit trolley (final fallback)
  SELECT location_id FROM tbl_storage_locations
  WHERE location_type = 'TROLLEY'
  ORDER BY location_id LIMIT 1
  → always returns a result: trolleys are eligible regardless of is_occupied,
    because a trolley holds many items in transit (§3.2.3.1 marks TROLLEY-01
    "Always available for transit")

→ v_proposed_location = first hit
```

*"The first location found in this sequence is set as ${v_proposed_location}."*

Reference state from §3.2.3.1 Table B:

| location_id | type | assigned_department | is_occupied |
|---|---|---|---|
| RACK-A-04 | RACK | MOE/LOG-A | TRUE |
| RACK-A-05 | RACK | MOE/LOG-A | FALSE *(vacant, ready to be proposed)* |
| RACK-C-12 | RACK | NULL | TRUE |
| RACK-C-13 | RACK | NULL | FALSE *(vacant general rack)* |
| TROLLEY-01 | TROLLEY | NULL | FALSE *(always available for transit)* |

Worked traces:

| Input | Result | Why |
|-------|--------|-----|
| PO 4500987654 → John Doe, MOE/LOG-A | **RACK-A-05** | A-04 occupied, A-05 vacant dept rack |
| PO 4500987655 → Bob Builder, MOE/ENG-2 | **RACK-C-13** | no vacant ENG-2 rack → general fallback |
| Name "Unknown" → dept NULL | **RACK-C-13** | skips P1 → general rack |
| All racks occupied | **TROLLEY-01** | final fallback |

The ordering is `ORDER BY location_id` so the outcome is deterministic and repeatable across rehearsals — important, because a non-deterministic proposal makes the wrong-QR drill impossible to script.

**Reservation:** the proposed location is soft-reserved for the session (5-minute TTL) so two concurrent operators cannot be sent to the same rack. Not in the PDF; correct behaviour, and worth one sentence on stage.

### 5.1 Proposal screen (§3.2.2.1 Step 2)

```
Recipient    John Doe
Department   MOE/LOG-A
Go To        ┌──────────────────┐
             │   RACK-A-05      │   ← --text-display, mono, tabular
             └──────────────────┘
             Rack · Aisle A · Level 05

          [       Scan Location       ]
```

`Recipient` renders "N/A" when NULL (the PDF explicitly allows `"N/A"`); `Department` renders "—" when blank. A small "Why this location?" link expands the cascade reasoning in plain language — "MOE/LOG-A rack A-04 is occupied, so A-05 was chosen." Transparency reads as sophistication and costs one component.

---

## 6. Step 3 — Location verification (§3.2.2.1 Step 3, §3.2.4 C)

The operator walks to the location, taps **Scan Location**, and scans the QR on the physical rack or trolley.

**QR value normalisation** before comparison (risk R4b): trim, uppercase, strip a URL prefix if present, and extract a known-location-ID substring if the payload is JSON or a URL. Then compare exactly.

| Condition | Behaviour |
|-----------|-----------|
| `v_actual_location == v_proposed_location` | **Green wash.** *"Location verified! You can now place the parcel in RACK-A-05."* Action: **Next**. |
| `v_actual_location != v_proposed_location` | **Red wash.** *"Wrong location! Expected: RACK-A-05. Scanned: RACK-C-12. Please scan the correct QR-Code."* Both values in mono, expected on top, stacked and clearly labelled. Single action: **Scan again**. **Process is blocked** — no override, no skip. |
| Scanned value matches no known location | Red wash: "Unknown location code." Plus, in demo mode only, an admin affordance **"Register this location"** (risk R4). |

*"The process is blocked until the proposed location is scanned."* — implement literally. The operator cannot proceed, cannot go back and change the recipient to force a different proposal, and cannot close the app to skip. This deliberate rigidity is the entire point of "error-proof", and the wrong-scan drill should be performed on stage. *(Gate G19)*

---

## 7. Step 4 — Storing & completion (§3.2.2.1 Step 4, §3.2.4 D)

The operator physically places the parcel, then the app finalises in one transaction:

1. **INSERT** into `tbl_parcels`: `tracking_id`, `carrier`, `sap_po_number`, `recipient_name`, `proposed_location`, `actual_location`, `status = 'STORED'`, `timestamp_last_event = now()`.
2. **UPDATE** `tbl_storage_locations SET is_occupied = TRUE WHERE location_id = v_proposed_location`.

   §3.2.4 D states this unconditionally. Applied literally it would also mark a trolley occupied, which contradicts §3.2.3.1's note that `TROLLEY-01` is *"always available for transit"* and would break the Priority 3 fallback after a single trolley storage. **We apply the UPDATE to `location_type = 'RACK'` only**; trolleys and staging areas remain available. This is deviation D9 — the smallest change that keeps both statements in the PDF true. Raised as Q23 in `08-QUESTIONS-FOR-BOSCH.md`; a config flag reverts to the literal behaviour if Bosch prefers it.
3. Release the soft reservation.
4. Evaluate the email trigger.
5. Emit a realtime event → App 3 updates live *(Gate G24)*.

### 7.1 Email trigger (§3.2.4 D)

```
IF (v_proposed_location CONTAINS "RACK") AND (v_recipient_email IS NOT NULL):
    send mail
ELSE:
    skip
```

- **Subject:** `Your parcel is ready for pickup at Goods Receipt`
- **Body:** `Your parcel with the tracking ID ${v_tracking_id} from carrier ${v_carrier} has been safely stored and is ready for pickup. Pickup Location: ${v_actual_location}`

`v_recipient_email` comes from `Bosch_Active_Directory` — including on the SAP path, where SAP gives the name and AD resolves it to an address.

Both negative cases must be demonstrated: a **TROLLEY** storage sends nothing, and a **NULL/unknown recipient** sends nothing. The ops console logs the skip with its reason so the non-event is visible. *(Gate G22)*

Delivery goes to a local SMTP sink (MailHog). An **Inbox** view inside the demo app renders received mail so the email can be shown on the projector seconds after the parcel is stored — far stronger than asserting it was sent (deviation D7).

### 7.2 Completion screen

> *"Process completed successfully. You can now close the app."* with a **Close App** button.

We show the tracking ID, the final location, the email status ("Notification sent to john.doe@bosch.com" or "No notification — stored on a transit trolley"), and two actions: **Register next parcel** (primary — it is what actually happens next in the real workflow) and **Close App** (secondary, as specified). Elapsed time for the whole registration is shown as a small caption; on a good run it is under 30 seconds, and that number is a selling point worth putting on screen.

---

## 8. Edge cases & resilience

| Case | Behaviour |
|------|-----------|
| App closed mid-flow | Session is persisted server-side; reopening resumes at the last completed step |
| Camera permission denied | Manual entry becomes the primary path, with a banner explaining how to re-grant |
| Network drop mid-flow | Steps queue locally; a banner shows "Offline — will sync"; finalisation retries |
| Same tracking ID registered twice | Amber duplicate wash with View / Register anyway |
| Proposed rack occupied by someone else between proposal and scan | Re-run the cascade, show "Location changed to RACK-C-13" before the scan step |
| Extremely long recipient name | Truncated with an ellipsis in the header, full value in the detail row |
| Location scanned that exists but is occupied | Blocked with "That location is already in use" |

---

## 9. Acceptance criteria

| ID | Criterion |
|----|-----------|
| A2.1 | All four carrier regexes validate correctly, including the sample IDs from §3.2.3.1 after whitespace normalisation |
| A2.2 | An unknown label format produces the red wash and blocks; rescanning a valid label proceeds |
| A2.3 | Carrier is auto-detected and named on the green wash |
| A2.4 | Carrier patterns are stored as data and a new one can be added live from the admin screen |
| A2.5 | SAP PO field enables **Next** only at exactly 10 digits, with a live counter |
| A2.6 | PO `4500987654` returns John Doe / MOE/LOG-A and proposes `RACK-A-05` |
| A2.7 | Name "Alice Wonderland" resolves via AD to MOE/LOG-A |
| A2.8 | Name "Unknown" performs **no** AD query and sets recipient and department to NULL |
| A2.9 | Cascade P1 → P2 → P3 verified with all three outcomes |
| A2.10 | Cascade never proposes an occupied rack |
| A2.11 | Wrong QR shows expected vs scanned and hard-blocks |
| A2.12 | Correct QR shows the green verified wash and proceeds |
| A2.13 | An unknown QR value is rejected with a clear message |
| A2.14 | Finalisation inserts into `tbl_parcels` and sets `is_occupied = TRUE` atomically for RACK locations; trolleys stay available |
| A2.15 | RACK + email present → mail visible in the inbox with the exact subject and body |
| A2.16 | TROLLEY → no mail; ops console logs the skip reason |
| A2.17 | Unknown recipient → no mail |
| A2.18 | New parcel appears in the dashboard within 2 seconds without a refresh |
| A2.19 | Full flow completes in under 45 seconds with camera scanning |
| A2.20 | Manual entry fallback completes the identical flow |
