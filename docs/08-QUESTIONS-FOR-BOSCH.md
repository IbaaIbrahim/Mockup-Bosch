# Questions for Bosch

Every question below has a **default assumption** we will implement if no answer arrives. Nothing here blocks the build — sending this list is partly about getting answers and partly about demonstrating that we read the document closely. That second effect is worth as much as the first.

Suggested handling: send **Tier 1** in a single short email now. Raise **Tier 2** in a call. Keep **Tier 3** in your pocket for the day.

---

## Tier 1 — Send now (materially changes the build)

**Q1 · The document starts at Section 3. Are Sections 1 and 2 available?**
They likely cover the evaluation criteria, timeline, and scoring. If there is a rubric, we would rather optimise for it than guess.
*Default: proceed on Section 3 alone.*

**Q2 · Can we receive your exact XML payload variants in advance — not to hardcode, but to test against?**
Frame it exactly that way. "We want to make sure the parser handles your real telegram shapes, including any attributes not in the sample. We'll still build it fully dynamic." This is the single highest-value answer on the list; it retires risk R2.
*Default: lenient parser, extra attributes ignored, fuzz-tested against malformed input.*

**Q3 · What do your location QR codes actually encode?**
A bare ID like `RACK-A-04`? A URL? JSON? A prefixed value? We normalise for all of these, but knowing removes a live-demo unknown.
*Default: normaliser handles bare ID, URL, and JSON payloads, extracting a known location ID.*

**Q4 · Which carrier labels will you bring?**
Section 3.2.4 names DHL, UPS, GLS and Amazon. If a DPD, FedEx, TNT or Hermes label appears, our system will correctly reject it — which is right per your spec but reads as a failure in the room. We would like to have the pattern ready.
*Default: the four specified patterns, plus a live-add admin screen.*

**Q5 · Do the location QR codes correspond to the IDs in §3.2.3.1?**
We are seeding `RACK-A-04/05`, `RACK-C-12/13`, `TROLLEY-01` exactly. If your printed codes use different IDs, verification can never succeed.
*Default: seed the PDF's IDs; provide a live "register this location" action as a fallback.*

**Q6 · How many offer rounds before escalation — and is there a timeout as well as the decline path?**
Two sub-questions, both from §3.1.2 Step 2 and the §3.1.1 flowchart:
- **Round count.** The prose says *"after the notification has been resend the second time and still no operator accepted"*; the flowchart node says *"Did all operators declined the task for the 3rd time?"*. We read these as consistent — offer, resend, resend, escalate — but we would like it confirmed.
- **Timeout.** The document defines escalation on *decline* but is silent on *non-response*. We think a timeout is necessary; an unanswered notification cannot hold a task forever.

*Default: 3 offer rounds, then supervisor; 120s per round for HIGH, 300s for LOW. Both values configurable in the admin screen and changeable live.*

**Q7 · "Alice Wonder" (§3.1.3.3) and "Alice Wonderland" (§3.2.3.2) — same person?**
Small, but it affects whether an AD lookup resolves.
*Default: treated as one person with both spellings as aliases.*

---

## Tier 2 — Raise on a call (affects polish and framing)

**Q8 · Should the demo be in German or English?**
Shop-floor tools in a German plant are usually German. We are building English-first with an externalised string layer, so a German switch is a translation pass, not a rebuild. If the room prefers German, tell us early enough to do it properly rather than machine-translate.
*Default: English, i18n-ready.*

**Q9 · Who is in the room, and what does each of them need to believe?**
An operations lead cares about cycle time and error-proofing. An IT architect cares about integration and data ownership. A plant manager cares about ROI. We would weight the narrative differently for each.
*Default: balanced, with the Ops Console available to go deep if a technical audience appears.*

**Q10 · How long do we have, and how much of it is Q&A?**
*Default: 25 minutes of demo, 15 minutes of questions.*

**Q11 · Will you use your own device, or ours?**
If yours is an iPhone, the barcode scanning path differs (no native `BarcodeDetector`). We have a wasm fallback, but we would want to test on the exact model.
*Default: our Android devices, with an iOS-tested fallback available.*

**Q12 · What is the real photo-retention requirement?**
Photo evidence of a machine repair may fall under works-council or data-protection rules in a German plant. We are storing photos with burned-in metadata; if there is a retention limit or an anonymisation requirement, it changes the data model.
*Default: stored indefinitely in the demo, with a note that retention is configurable.*

**Q13 · Is `statNo` genuinely static, or will it vary?**
§3.1.4 B says static for the demo. We support it varying, and we would like to demonstrate that if you plan to change it.
*Default: fully dynamic, driven by the payload.*

**Q14 · Is the safety checklist in the flowchart a real requirement?**
It appears in the §3.1.1 diagram ("Person completes safety checklist") but not in the step-by-step text. We have implemented a three-item LOTO acknowledgement. If your real checklist has specific items, we would rather use yours.
*Default: three generic items — safe state, PPE, area secured.*

**Q15 · What should happen if a supervisor rejects the Four-Eyes release?**
Your flowchart has "Is error solved? → No → Supervisor solves error", so we have built both a reject-back-to-technician path and a supervisor-resolves path. Confirming the intended behaviour would be useful.
*Default: reject returns the task to the technician with a required reason; the supervisor may also resolve and close directly.*

---

## Tier 3 — Keep in your pocket (ask only if it comes up)

**Q16 · Which documentation system holds the real machine manuals?**
§3.1.2 Step 3 refers to "the plant's documentation system". Knowing whether that is SharePoint, a DMS, or a file share tells us what the real RAG ingestion looks like. Good question to ask *in the room* — it moves the conversation from demo to deployment.

**Q17 · Is DB_Shiftbook an existing system, or new?**
If it exists, we would be writing to it rather than owning it, which changes the integration story.

**Q18 · Roughly how many alarms per line per shift?**
Shapes the notification design and whether batching matters. Also a good in-room question — it signals we are thinking past the demo.

**Q19 · Are there other error codes beyond 50 and 70?**
Our error codes are data, not code. Adding one is a database insert. Worth mentioning regardless of the answer.

**Q20 · Does the "active supervisor" come from a shift-planning system?**
We model an on-shift flag with a roster screen; real integration would read from wherever the roster actually lives.

**Q21 · What happens to a parcel after storage?**
Your statuses include `DELIVERED`, but no pickup process is described. We seed delivered records and show the transition; we have not built a pickup flow, since it is outside the specified scope.

**Q22 · Should the inbound app handle multi-parcel shipments?**
One tracking ID, several boxes, one rack. Not in scope as written. Worth flagging that we noticed.

**Q23 · Should storing a parcel on a trolley set `is_occupied = TRUE`?**
§3.2.4 D specifies the UPDATE unconditionally, but §3.2.3.1 notes that `TROLLEY-01` is *"always available for transit"*. Applied literally, the first trolley storage would mark it occupied and the Priority 3 fallback would have nothing left to propose. We apply the occupancy flag to racks only; trolleys and staging areas stay available.
*Default: racks only, with a config flag to revert to the literal reading.*

---

## Our open recommendations to Bosch

Points we would raise proactively, because they show we engaged with the process rather than just the specification.

1. **Error 50 requires Four-Eyes; error 70 does not.** We understand the reasoning — a barcode fault is quality-relevant. But it means a belt motor replacement, arguably the higher-risk repair, closes unsupervised. If the intent is quality assurance, the policy may belong on a per-error-code basis rather than the current split. Our implementation stores it per error code, so either policy is a data change.

2. **The `errorState=1` auto-archive is the highest-ROI rule in the document** and the least visible. We would suggest measuring "ghost walks avoided" as a KPI after rollout — it is a number that justifies the project on its own.

3. **DB_Shiftbook is currently write-only in the described process.** We surface historical resolutions on the solution screen ("used 2× on this line, most recently 7 July"). That turns a compliance log into an operational asset for roughly no additional cost, and it improves the AI's grounding at the same time.

4. **The location cascade has no aging or rebalancing logic.** Over time, department racks fill and everything falls through to general racks and trolleys. A pickup-reminder rule would keep the cascade healthy. Related to Q21.

5. **Consider a "could not resolve" path in App 1.** The current flow assumes the technician always succeeds. A structured escalation for an unresolved fault — with the AI transcript and photos attached — would be a natural extension and is a common gap in this kind of workflow.

6. **The safety checklist deserves to be a first-class feature.** It appears once, in a flowchart, but in a plant it is the step with real liability attached. We would recommend making it configurable per error code and per line.
