# Design System — "Bosch Shopfloor"

Version 1.0 · Applies to Apps 1, 2, 3 and the Ops Console.

The brief specifies no visual requirements at all. That is the opportunity: everything on screen is judged on craft, and craft is the cheapest differentiator in a bake-off. This document is the single source of truth. **No component ships with a hardcoded hex value, pixel size or duration — tokens only.**

---

## 1. Design principles

1. **One glance, one action.** A shop-floor screen has a single primary action. Everything else is subordinate, smaller, quieter. Two equally weighted buttons are a design smell — permitted only where the choice is genuinely symmetric and the system has no preferred answer. Exactly two screens qualify: Accept/Decline on a task offer, and the SAP PO Yes/No question. Everywhere else, one button leads.
2. **State is loud.** Success is green and unmistakable. Failure is red and unmistakable. The brief itself demands *"the screen turns red / turns green"* — we take that literally and make the whole surface respond, not a small toast.
3. **Built for gloves.** Minimum 56px touch targets, 64px for primary actions, 12px minimum spacing between adjacent targets. Nothing important lives in a screen corner.
4. **Readable at arm's length, under bad light.** Base body size 17px, primary numbers 32px+, minimum contrast 7:1 for text (AAA), 4.5:1 for large text and icons.
5. **Motion explains, never decorates.** Every animation communicates causality or continuity. Nothing loops. Nothing bounces for fun.
6. **Never a dead end.** Every error state carries a recovery action. Every blocking state explains what would unblock it.
7. **Density where density helps.** App 3 is the inverse of Apps 1 and 2: information-dense, scannable, built for a person who is comparing rows, not performing a task.

---

## 2. Brand foundation

Bosch's identity is disciplined: a single strong red against near-neutral greys, generous whitespace, and a humanist sans. We honour that and extend it with the state and depth scales an application needs.

### 2.1 Colour — primitives

```css
/* Brand */
--bosch-red-50:   #FFF1F2;
--bosch-red-100:  #FFE1E4;
--bosch-red-200:  #FFC8CE;
--bosch-red-300:  #FF9BA6;
--bosch-red-400:  #FA5A6E;
--bosch-red-500:  #E20015;  /* ★ Bosch Red — primary brand */
--bosch-red-600:  #C4000F;
--bosch-red-700:  #A00009;
--bosch-red-800:  #7A0007;
--bosch-red-900:  #520005;

/* Bosch secondary palette */
--bosch-blue-500:   #007BC0;   /* information, links, AI */
--bosch-blue-600:   #00629A;
--bosch-turquoise:  #18837E;   /* success / verified */
--bosch-green-500:  #00884A;   /* success primary */
--bosch-green-600:  #006B3A;
--bosch-yellow-500: #FFCF00;   /* warning / low priority */
--bosch-purple-500: #9E2896;   /* AI accent, secondary */

/* Neutrals — cool grey, Bosch-aligned */
--grey-0:   #FFFFFF;
--grey-25:  #FAFBFC;
--grey-50:  #F4F6F8;
--grey-100: #E9ECEF;
--grey-200: #DBE0E5;
--grey-300: #C1C7CD;
--grey-400: #9AA3AC;
--grey-500: #71787E;
--grey-600: #545B62;
--grey-700: #3D4348;
--grey-800: #282D31;
--grey-900: #171A1C;
--grey-950: #0D0F10;
```

### 2.2 Colour — semantic tokens

Components reference **only** these.

```css
:root {
  /* Surfaces */
  --surface-page:        var(--grey-50);
  --surface-raised:      var(--grey-0);
  --surface-sunken:      var(--grey-100);
  --surface-overlay:     var(--grey-0);
  --surface-inverse:     var(--grey-900);
  --surface-scrim:       rgb(13 15 16 / 0.55);

  /* Content */
  --content-primary:     var(--grey-900);
  --content-secondary:   var(--grey-600);
  --content-tertiary:    var(--grey-400);
  --content-inverse:     var(--grey-0);
  --content-brand:       var(--bosch-red-500);
  --content-link:        var(--bosch-blue-600);

  /* Borders */
  --border-subtle:       var(--grey-200);
  --border-default:      var(--grey-300);
  --border-strong:       var(--grey-500);
  --border-focus:        var(--bosch-blue-500);

  /* Actions */
  --action-primary-bg:          var(--bosch-red-500);
  --action-primary-bg-hover:    var(--bosch-red-600);
  --action-primary-bg-active:   var(--bosch-red-700);
  --action-primary-fg:          var(--grey-0);
  --action-secondary-bg:        var(--grey-0);
  --action-secondary-border:    var(--grey-300);
  --action-secondary-fg:        var(--grey-900);
  --action-disabled-bg:         var(--grey-200);
  --action-disabled-fg:         var(--grey-400);

  /* Status — the demo lives and dies here */
  --status-success-bg:      var(--bosch-green-500);
  --status-success-surface: #E6F4EC;
  --status-success-fg:      var(--bosch-green-600);
  --status-success-border:  #9FD5B8;

  --status-error-bg:        var(--bosch-red-500);
  --status-error-surface:   var(--bosch-red-50);
  --status-error-fg:        var(--bosch-red-700);
  --status-error-border:    var(--bosch-red-200);

  --status-warning-bg:      var(--bosch-yellow-500);
  --status-warning-surface: #FFF8DB;
  --status-warning-fg:      #6B5200;
  --status-warning-border:  #F2DE8A;

  --status-info-bg:         var(--bosch-blue-500);
  --status-info-surface:    #E5F2F9;
  --status-info-fg:         var(--bosch-blue-600);
  --status-info-border:     #A8D3E9;

  --status-neutral-surface: var(--grey-100);
  --status-neutral-fg:      var(--grey-600);

  /* Domain-specific */
  --priority-high:      var(--bosch-red-500);
  --priority-low:       var(--bosch-yellow-500);
  --ai-accent:          var(--bosch-purple-500);
  --ai-surface:         #F6EAF5;
  --parcel-stored:      var(--bosch-green-500);
  --parcel-transit:     var(--bosch-blue-500);
  --parcel-delivered:   var(--grey-500);
}
```

### 2.3 Dark mode

Apps 1 and 2 support dark mode — genuinely useful on a night shift and a visible sign of product maturity. App 3 is dark by default when in **Board mode** on a wall display.

```css
[data-theme="dark"] {
  --surface-page:      var(--grey-950);
  --surface-raised:    var(--grey-900);
  --surface-sunken:    var(--grey-800);
  --surface-overlay:   var(--grey-800);
  --content-primary:   var(--grey-50);
  --content-secondary: var(--grey-400);
  --content-tertiary:  var(--grey-500);
  --border-subtle:     var(--grey-800);
  --border-default:    var(--grey-700);
  --content-brand:     var(--bosch-red-400);   /* lifted for contrast on dark */
  --status-success-surface: #0C2A1B;
  --status-error-surface:   #2E0509;
  --status-warning-surface: #2B2205;
  --status-info-surface:    #06222F;
}
```

### 2.4 Full-screen state washes

The brief's *"screen turns red / green"* is implemented as a **full-viewport state layer**, not a banner. This is one of the most memorable visual moments in the demo — treat it as a designed set piece.

```css
.state-wash {
  position: fixed; inset: 0; z-index: 60;
  display: grid; place-items: center;
  padding: var(--space-8);
  animation: wash-in var(--duration-moderate) var(--ease-out) both;
}
.state-wash--success { background: var(--status-success-bg); color: var(--grey-0); }
.state-wash--error   { background: var(--status-error-bg);   color: var(--grey-0); }

@keyframes wash-in {
  from { opacity: 0; transform: scale(1.03); }
  to   { opacity: 1; transform: scale(1); }
}
```

Composition, top to bottom: 96px icon (check or alert) → 28px headline → 17px detail line → primary action. Success washes auto-advance after 1400ms *and* offer a Next button. Error washes never auto-advance; they require an explicit "Scan again".

Accompanied by haptics: `navigator.vibrate(40)` on success, `navigator.vibrate([80,60,80])` on error. Optional short audio cue, defaulted **off** (a room full of executives does not want a beep, but a shop floor does — make it a setting and mention that you did).

---

## 3. Typography

**Primary:** `Bosch Sans` where licensing permits. **Fallback:** `Inter` — near-identical humanist proportions, variable, free.

```css
--font-sans: "Bosch Sans", "Inter var", Inter, -apple-system, "Segoe UI", Roboto, sans-serif;
--font-mono: "JetBrains Mono", "SF Mono", ui-monospace, monospace;
```

Monospace is used deliberately for machine-generated identifiers — tracking IDs, SAP POs, location IDs, error codes, XML. It signals "this is data from a system" and makes character-level comparison possible, which matters when the operator is checking `RACK-A-04` against `RACK-A-05`.

### 3.1 Scale

| Token | Size / Line height | Weight | Tracking | Use |
|-------|-------------------|--------|----------|-----|
| `--text-display` | 40 / 44 | 700 | -0.02em | Wash headlines, dashboard KPI numbers |
| `--text-h1` | 30 / 36 | 700 | -0.015em | Screen titles |
| `--text-h2` | 24 / 30 | 600 | -0.01em | Section headers |
| `--text-h3` | 20 / 26 | 600 | 0 | Card titles |
| `--text-body-lg` | 19 / 28 | 400 | 0 | Primary instruction text |
| `--text-body` | 17 / 26 | 400 | 0 | Default body |
| `--text-body-sm` | 15 / 22 | 400 | 0 | Supporting text |
| `--text-label` | 15 / 20 | 600 | 0 | Field labels, buttons |
| `--text-caption` | 13 / 18 | 500 | 0.01em | Metadata, timestamps |
| `--text-overline` | 12 / 16 | 700 | 0.08em | Uppercase eyebrow labels |
| `--text-mono-lg` | 22 / 30 | 500 | 0.02em | Tracking IDs, location IDs on wash screens |
| `--text-mono` | 15 / 22 | 500 | 0.02em | Codes in tables and cards |

**Rules.** Max 72 characters per line. Never centre a paragraph longer than two lines. Never rely on italics for emphasis at body size — use weight. Numerals are tabular (`font-variant-numeric: tabular-nums`) everywhere in tables and timers.

---

## 4. Space, radius, elevation

### 4.1 Spacing — 4px base

```css
--space-0:0; --space-1:4px;  --space-2:8px;  --space-3:12px; --space-4:16px;
--space-5:20px; --space-6:24px; --space-8:32px; --space-10:40px;
--space-12:48px; --space-16:64px; --space-20:80px; --space-24:96px;
```

Screen gutter: 20px mobile, 32px tablet, 40px desktop. Vertical rhythm between blocks: 24px. Between sections: 40px.

### 4.2 Radius

```css
--radius-sm:6px; --radius-md:10px; --radius-lg:14px;
--radius-xl:20px; --radius-2xl:28px; --radius-full:9999px;
```

Cards `lg`. Buttons `md`. Bottom sheets `2xl` on top corners only. Inputs `md`. Badges `full`.

### 4.3 Elevation

Soft, layered, low-contrast — never a hard drop shadow.

```css
--shadow-xs: 0 1px 2px rgb(13 15 16 / .05);
--shadow-sm: 0 1px 3px rgb(13 15 16 / .07), 0 1px 2px rgb(13 15 16 / .04);
--shadow-md: 0 4px 12px rgb(13 15 16 / .08), 0 2px 4px rgb(13 15 16 / .04);
--shadow-lg: 0 12px 28px rgb(13 15 16 / .10), 0 4px 8px rgb(13 15 16 / .05);
--shadow-xl: 0 24px 48px rgb(13 15 16 / .14), 0 8px 16px rgb(13 15 16 / .06);
--shadow-focus: 0 0 0 3px rgb(0 123 192 / .35);
```

In dark mode, shadows are replaced by a 1px `--border-default` hairline plus a subtle surface lift — shadows are invisible on near-black.

---

## 5. Motion

```css
--duration-instant:  90ms;
--duration-fast:    150ms;
--duration-moderate:250ms;
--duration-slow:    400ms;
--duration-deliberate: 600ms;

--ease-out:    cubic-bezier(0.16, 1, 0.3, 1);      /* entrances */
--ease-in:     cubic-bezier(0.7, 0, 0.84, 0);      /* exits */
--ease-in-out: cubic-bezier(0.65, 0, 0.35, 1);     /* moves */
--ease-spring: cubic-bezier(0.34, 1.56, 0.64, 1);  /* accepting a task, confirmations */
```

| Interaction | Motion |
|-------------|--------|
| Screen → screen (wizard) | Slide 24px + fade, `moderate`, `ease-out` |
| Bottom sheet | Translate from 100% + scrim fade, `moderate` |
| State wash appearing | Scale 1.03 → 1 + fade, `moderate` |
| Task card accepted | Card lifts, others collapse into the gap, `slow`, `ease-spring` |
| Button press | `scale(0.97)`, `instant` |
| New dashboard row | Height 0 → auto + fade + 1200ms tinted highlight that decays |
| Escalation countdown | 1s linear ring sweep — never eases |
| AI response | Token streaming, no spinner once the first token lands |

**`prefers-reduced-motion: reduce` collapses everything to opacity-only crossfades at `--duration-fast`.** Non-negotiable; someone in the room will have it enabled.

---

## 6. Core components

### 6.1 Button

| Variant | Use | Height | Style |
|---------|-----|--------|-------|
| `primary` | The one action on the screen | 56 (mobile 64 when full-width) | Bosch red fill, white text, `--shadow-sm` |
| `secondary` | Alternative path | 56 | White fill, 1.5px `--border-default` |
| `ghost` | Tertiary / dismiss | 48 | Transparent, text only |
| `danger` | Decline, block, destructive | 56 | `--bosch-red-600` fill |
| `success` | Approve & Close | 56 | `--bosch-green-500` fill |
| `ai` | Open AI chat | 56 | `--ai-accent` outline, sparkle icon, subtle gradient sheen |

Full-width on mobile. Loading state replaces the label with a 20px spinner and locks width to prevent layout shift. Disabled state uses `--action-disabled-*` with `cursor: not-allowed` and — critically — a **tooltip or helper line explaining why**, because §3.2.2.1 has two disabled-until-valid buttons and a silent disabled button is a demo dead end.

### 6.2 TaskCard (App 1)

```
┌──────────────────────────────────────────────┐
│ ▌ ● HIGH PRIORITY          ⏱ 02:14 to escalate│  ← 4px left rail in priority colour
│                                               │
│ Barcode not readable                          │  ← --text-h3
│ ERROR 50                                      │  ← mono badge
│                                               │
│ ⚲ Line 31 · Station 20 · Paste Printer        │  ← --text-body-sm, --content-secondary
│ ⏱ Triggered 14:32:07                          │
│                                               │
│ ┌──────────────┐ ┌──────────────────────────┐ │
│ │   Decline    │ │        Accept            │ │  ← 64px, Accept is primary
│ └──────────────┘ └──────────────────────────┘ │
└──────────────────────────────────────────────┘
```

The left rail is the priority carrier: `--priority-high` (red) or `--priority-low` (yellow). The countdown is only visible when an escalation timer is armed and turns red under 30s. When a task is escalated to the supervisor, a `SUPERVISOR` chip is added and the rail thickens to 6px.

### 6.3 SolutionOption (App 1, replaces the suggested dropdown)

Large selectable cards, 72px min height, radio semantics, single-select, one column. Selected state: 2px `--bosch-red-500` border, `--bosch-red-50` fill, filled check on the right. "Other" expands inline to a textarea when selected. The list content is driven entirely by `errorNo` — see `02-APP1-MACHINE-ALARM.md` §5.

### 6.4 ScanFrame (Apps 1 & 2)

Full-bleed camera feed, dimmed outside a centred reticle. Reticle: 280×280 for QR, 300×180 for 1D barcodes, with four 32px corner brackets in `--grey-0` and a sweeping scan line in `--bosch-red-500` at 1.8s per pass. Instruction text sits below the reticle on a scrim. A "Enter manually" ghost button sits at the bottom — small, always available, never in the way (risk R5/R9 insurance).

On detection: reticle snaps green, haptic fires, feed freezes for 200ms, then the state wash takes over.

### 6.5 StatusPill (App 3)

| Status | Surface | Text | Dot |
|--------|---------|------|-----|
| `STORED` | `--status-success-surface` | `--bosch-green-600` | solid |
| `IN_TRANSIT` | `--status-info-surface` | `--bosch-blue-600` | pulsing |
| `DELIVERED` | `--status-neutral-surface` | `--grey-600` | hollow |

Full radius, 24px height, 8px dot, 12px uppercase label, tabular. The pulsing dot on `IN_TRANSIT` is the only looping animation permitted in the system — it earns it by encoding "still moving".

### 6.6 Field

Label above (never a placeholder-as-label). 56px input height, 17px text. Helper text below in `--content-secondary`. Error state: 1.5px `--status-error-bg` border, error text replaces helper, alert icon inline. Numeric fields use `inputmode="numeric"` and show a live character counter when a fixed length is required — the 10-digit SAP PO field shows `7 / 10` as you type, which makes the disabled Next button self-explaining.

### 6.7 Other components

`AppBar` (56px, title + back + contextual action) · `ProgressStepper` (thin segmented bar, one segment per wizard step, current segment in Bosch red) · `BottomSheet` (drag handle, snap points 50%/90%, scrim) · `Timeline` (event trail for task and parcel history) · `EmptyState` (illustration + one line + one action — never a bare "No data") · `Skeleton` (shimmerless, opacity-pulsed) · `Toast` (top-anchored on mobile, bottom-right desktop, 4s, dismissible) · `DataTable` (App 3: sticky header, zebra off, 1px row separators, sortable, virtualised) · `FilterBar` (chips that show active values, one-tap clear-all) · `KpiTile` (large tabular number, label, delta).

---

## 7. Layout

### 7.1 Mobile (Apps 1, 2) — 360–430px design target

Single column. Fixed 56px AppBar. Content scrolls. **Primary action pinned to the bottom** in a 88px safe-area-aware footer with a top hairline and a `--surface-raised` background — the thumb never travels. Respect `env(safe-area-inset-bottom)`.

### 7.2 Dashboard (App 3)

- **Board mode** (≥1280px, dark, for a wall display): 4-column KPI strip, then an auto-fitting card grid, 24px gutters, no chrome. Designed to be legible from 4 metres.
- **Table mode** (≥1024px): left filter rail 280px, main table fills. Collapses to a top filter sheet under 1024px.
- **Mobile** (<768px): stacked cards, sticky search, filter sheet from the bottom.

Breakpoints: `sm 640 · md 768 · lg 1024 · xl 1280 · 2xl 1536`.

---

## 8. Accessibility — WCAG 2.2 AA, AAA on text contrast

- Every interactive element reachable by keyboard, visible focus ring (`--shadow-focus`), logical order.
- **Colour is never the only signal.** The red/green washes always carry an icon *and* a text label. Status pills carry a dot shape *and* a word. Priority carries a rail colour *and* the word "HIGH"/"LOW".
- Live regions (`aria-live="assertive"`) announce scan results, task assignment and escalation.
- All camera views have a functional non-camera equivalent (manual entry). This is both an accessibility requirement and demo insurance.
- Form errors are programmatically associated (`aria-describedby`) and announced.
- Target sizes exceed the 44px WCAG 2.2 minimum everywhere; 56px minimum by house rule.
- Dark mode maintains the same contrast ratios — verified, not assumed.
- Language: `lang="en"`, with the string layer structured for a German switch (see `08-QUESTIONS-FOR-BOSCH.md` Q8).

---

## 9. Content & voice

Short, imperative, human. Never expose internal jargon in the operator UI.

**Where the PDF specifies an exact string, use it verbatim** — the error and confirmation texts in §3.2.2.1 are quoted directly in `03-APP2-INBOUND.md` and are not ours to improve. The guidance below applies to every string the PDF does *not* specify.

| Situation | Write | Don't write |
|-----------|-------|-------------|
| Scan prompt | "Scan the tracking number" | "Please proceed to scan the tracking identifier" |
| Format error | "Invalid Format! Please scan a valid carrier label." | "Validation error: regex mismatch on field v_tracking_id" |
| Wrong location | "Wrong location! Expected: RACK-A-05. Scanned: RACK-C-12." | "Location mismatch detected" |
| Task escalated | "No response from Line 31. Sent to Bob Builder." | "Escalation policy triggered, tier 2" |
| Manual mode skip *(ops console only)* | "Ignored — machine is in manual mode, a technician is already there." | "operationMode=3" |

Numbers, IDs and codes always render in mono and are always **selectable and copyable**, including on the wash screens.

---

## 10. Implementation notes

- Tokens live in `src/design/tokens.css` and are mirrored into `tailwind.config.ts` via `@theme` — one source, two consumers.
- Components in `src/design/components/`, each with a colocated `*.stories.tsx`. A Storybook build is itself a credibility artefact if Bosch asks what else exists.
- No component imports another app's code. Design system has zero domain knowledge except the three domain token groups (priority, parcel status, AI).
- Every component supports `className` passthrough and forwards refs.
- Lint rule: fail the build on any raw hex, raw px in a `padding`/`margin`/`gap`, or a raw duration in a component file.
