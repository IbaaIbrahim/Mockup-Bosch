# Bosch Live Demo — Documentation

Client: Robert Bosch GmbH · Vendor: Iotivata · Owner: Ibaa Ibrahim

---

## ⚠ Current scope

**We are building Bosch use case §3.2 only** — Inbound Registration + Parcel Status Dashboard — as a working AI-built mockup for a conference demo.

**App 1 (AI-Powered Machine Alarm, §3.1) is out of scope.**

👉 **[`09-SCOPE-CONFERENCE-DEMO.md`](./09-SCOPE-CONFERENCE-DEMO.md) is the authoritative plan.** Read it first. It supersedes the build plan and demo runbook.

---

## Documents

| Doc | Contents | Status |
|-----|----------|--------|
| [`Live_Demo_Guideline_Workflow_Bosch.pdf`](./Live_Demo_Guideline_Workflow_Bosch.pdf) | **The source requirements** from Bosch (Section 3, 13 pages) | Source of truth |
| [`00-OVERVIEW.md`](./00-OVERVIEW.md) | Brief analysis, architecture, deviations, risk register | Current — App 1 sections now informational |
| [`01-DESIGN-SYSTEM.md`](./01-DESIGN-SYSTEM.md) | Bosch brand tokens, components, interaction & accessibility standards | Current |
| [`02-APP1-MACHINE-ALARM.md`](./02-APP1-MACHINE-ALARM.md) | Machine alarm spec — XML ingestion, 7 business rules, AI chat, Four-Eyes | **Out of current scope** — retained for later phases |
| [`03-APP2-INBOUND.md`](./03-APP2-INBOUND.md) | Inbound Registration spec — carrier regex, SAP/AD lookup, location cascade, QR verification, email | **In scope** |
| [`04-APP3-DASHBOARD.md`](./04-APP3-DASHBOARD.md) | Parcel Status Dashboard spec — filters, three modes, realtime | **In scope** |
| [`05-DATA-MODEL.md`](./05-DATA-MODEL.md) | Schema, views, seed fixtures, mock SAP / AD / SMTP | Current — App 1 tables deferred |
| [`06-BUILD-PLAN.md`](./06-BUILD-PLAN.md) | Full three-app engineering plan, 170 tasks | **Superseded by 09** for current scope |
| [`07-DEMO-RUNBOOK.md`](./07-DEMO-RUNBOOK.md) | Full three-app stage script and test matrix | **Superseded by 09** for current scope |
| [`08-QUESTIONS-FOR-BOSCH.md`](./08-QUESTIONS-FOR-BOSCH.md) | Prioritised clarifications with our default assumptions | Current — see 09 §9 for which still apply |
| [`09-SCOPE-CONFERENCE-DEMO.md`](./09-SCOPE-CONFERENCE-DEMO.md) | **← Authoritative current plan** | Current |

---

## Quick orientation

**What Bosch is testing.** Not a design review — a live, adversarial bake-off. They will hold up carrier labels and location QR codes we have never seen and expect correct behaviour. Nothing may be hardcoded.

**Their grading criterion**, verbatim from §3:

> *"The critical requirement for us is that the final implementation correctly and completely covers the described use case with all its functional steps and results. This means: The 'What' (business process) is fixed, the 'How' (technical implementation) is at your discretion."*

Completeness of the use case is what scores. That is the reasoning behind implementing §3.2 fully rather than both use cases partially.

**The single strongest moment in the demo:** register a parcel on the phone, and the dashboard on the projector updates in front of the room. Build the demo around it.
