'use client';

/**
 * PhoneFrame — a fixed-size phone screen for the live conference demo.
 *
 * The mobile surfaces (inbound wizard, dashboard mobile, inbox) are built for
 * a real device: they use `100vh`, `100vw` and `position: fixed` for the
 * state wash and the detail drawer. On a projector those units would stretch
 * to the browser window and the "phone" would read as a full-screen site, and
 * resizing the window mid-demo looks unprofessional.
 *
 * This wrapper draws a phone body and makes the screen a CSS containing block
 * (`contain: layout paint` + its own scroll context), so every `position:
 * fixed` child anchors to the phone — not the viewport — and the sticky bars
 * scroll inside the frame. The phone keeps its size on any laptop regardless
 * of window size, and shrinks only if the viewport height is genuinely short.
 *
 * The label is stage aid, not product surface — same reasoning as
 * DemoShortcuts. It names the app so the projector audience always knows which
 * surface is being shown during the flow.
 */

import type { CSSProperties, ReactNode } from 'react';

const FRAME_STAGE: CSSProperties = {
  minHeight: '100vh',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  padding: 'var(--space-8)',
  background: 'var(--surface-page)',
};

const FRAME_BODY: CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  gap: 'var(--space-4)',
};

const PHONE: CSSProperties = {
  width: 'var(--phone-screen-width)',
  display: 'flex',
  flexDirection: 'column',
  borderRadius: 'var(--phone-screen-radius)',
  background: 'var(--phone-frame-bezel)',
  boxShadow: 'var(--phone-frame-shadow)',
  overflow: 'hidden',
};

/* A definite height lets the mobile surfaces fill the screen with
 * min-height:100%, and keeps the phone sized correctly no matter the
 * projector resolution. The subtraction reserves stage padding plus the label
 * below; min() caps it so the phone never exceeds the frame budget. */
const SCREEN: CSSProperties = {
  position: 'relative',
  display: 'flex',
  flexDirection: 'column',
  height: 'min(100vh - var(--space-24), var(--phone-frame-max-height))',
  minHeight: '0',
  overflow: 'auto',
  overscrollBehavior: 'contain',
  background: 'var(--surface-page)',
  borderRadius: 'var(--phone-screen-radius)',
  /* Re-base position:fixed children (state wash, detail drawer) and sticky
   * bars onto the phone screen instead of the browser viewport. */
  contain: 'layout paint',
};

export function PhoneFrame({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div style={FRAME_STAGE}>
      <div style={FRAME_BODY}>
        <div style={PHONE}>
          <div style={SCREEN}>{children}</div>
        </div>
        <span style={{ font: 'var(--text-caption)', color: 'var(--content-tertiary)' }}>{label}</span>
      </div>
    </div>
  );
}
