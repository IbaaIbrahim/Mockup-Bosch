'use client';

/**
 * PhoneFrame — a fixed-size phone on stage for the live conference demo.
 *
 * The mobile surfaces (inbound wizard, dashboard mobile, inbox) are built for
 * a real device: they use `100vh`, `100vw` and `position: fixed` for the
 * state wash and the detail drawer. On a projector those units would stretch
 * to the browser window and the "phone" would read as a full-screen site, and
 * resizing the window mid-demo looks unprofessional.
 *
 * This wrapper draws a realistic device — bezel, notch and home indicator —
 * and makes the screen a CSS containing block (`contain: layout paint` + its
 * own scroll context), so every `position: fixed` child anchors to the phone
 * (not the viewport) and the sticky bars scroll inside the frame. The phone
 * keeps its size on any laptop regardless of window size.
 *
 * An inbox button sits in the frame footer, below the screen: it mirrors the
 * "View Inbox" action on the first wizard screen so the presenter can jump to
 * the notification sink from any step without scrolling. It is stage aid, not
 * product surface — same reasoning as DemoShortcuts.
 */

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { createContext, useContext, useState } from 'react';
import type { CSSProperties, ReactNode } from 'react';

/**
 * DemoFrameContext — lets a surface inside the phone tell the frame to remove
 * the footer Inbox link. Used by the inbound wizard during the C10 hard block
 * (§3.2.2.1): on a location mismatch the screen must offer nothing but
 * "Scan again", and a stray footer link is a navigation the test pins to
 * zero. The frame owns the state and surfaces opt in via `setHardBlocked`.
 */
export const DemoFrameContext = createContext<{
  hardBlocked: boolean;
  setHardBlocked: (active: boolean) => void;
}>({
  hardBlocked: false,
  setHardBlocked: () => {},
});

export function useDemoFrame() {
  return useContext(DemoFrameContext);
}

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

/* The phone body is slightly larger than the screen so the bezel is visible
 * as a real handset frame. The screen is inset by the bezel padding. */
const PHONE: CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  width: 'calc(var(--phone-screen-width) + var(--phone-frame-pad) * 2)',
  height: 'calc(min(100vh - var(--space-24), var(--phone-frame-max-height)) + var(--phone-frame-pad) * 2)',
  maxHeight: 'var(--phone-frame-max-height)',
  padding: 'var(--phone-frame-pad)',
  borderRadius: 'var(--radius-2xl)',
  background: 'var(--device-bezel)',
  boxShadow: 'var(--phone-frame-shadow)',
  border: '1px solid var(--device-bezel-edge)',
  boxSizing: 'border-box',
};

/* A definite height lets the mobile surfaces fill the screen with
 * min-height:100%, and keeps the phone sized correctly no matter the
 * projector resolution. The subtraction reserves stage padding plus the
 * frame footer below. */
const SCREEN: CSSProperties = {
  position: 'relative',
  flex: '1 1 0',
  minHeight: '0',
  overflow: 'auto',
  overscrollBehavior: 'contain',
  background: 'var(--surface-page)',
  borderRadius: 'calc(var(--radius-2xl) - var(--phone-frame-pad))',
  /* Re-base position:fixed children (state wash, detail drawer) and sticky
   * bars onto the phone screen instead of the browser viewport. */
  contain: 'layout paint',
};

/* The notch — the black pill at the top of the screen housing the sensors.
 * Positioned absolutely over the screen's top edge. */
const NOTCH: CSSProperties = {
  position: 'absolute',
  top: 'var(--space-2)',
  left: '50%',
  transform: 'translateX(-50%)',
  width: 'var(--device-notch-width)',
  height: 'var(--device-notch-height)',
  borderRadius: 'var(--radius-full)',
  background: 'var(--device-notch)',
  zIndex: 'var(--z-appbar)',
  pointerEvents: 'none',
};

/* The home indicator — the white pill at the bottom of the screen. */
const HOME_INDICATOR: CSSProperties = {
  position: 'absolute',
  bottom: 'var(--space-2)',
  left: '50%',
  transform: 'translateX(-50%)',
  width: 'var(--device-home-width)',
  height: 'var(--device-home-height)',
  borderRadius: 'var(--radius-full)',
  background: 'var(--device-home-indicator)',
  zIndex: 'var(--z-appbar)',
  pointerEvents: 'none',
};

const FOOTER: CSSProperties = {
  display: 'flex',
  justifyContent: 'center',
  paddingTop: 'var(--space-2)',
};

const INBOX_BUTTON: CSSProperties = {
  display: 'inline-flex',
  alignItems: 'center',
  gap: 'var(--space-2)',
  height: 'var(--target-compact)',
  padding: `0 var(--space-4)`,
  borderRadius: 'var(--radius-full)',
  border: 'none',
  background: 'rgb(255 255 255 / 0.12)',
  color: 'var(--grey-0)',
  font: 'var(--text-caption)',
  textDecoration: 'none',
  cursor: 'pointer',
  transition: 'background var(--duration-fast) var(--ease-out)',
};

const ACTIVE_INBOX_BUTTON: CSSProperties = {
  ...INBOX_BUTTON,
  background: 'var(--bosch-red-500)',
};

export function PhoneFrame({ label, children }: { label: string; children: ReactNode }) {
  const pathname = usePathname();
  const onInbox = pathname?.startsWith('/inbound/inbox');
  const onInboundRoot = pathname === '/inbound';
  const [hardBlocked, setHardBlocked] = useState(false);

  return (
    <DemoFrameContext.Provider value={{ hardBlocked, setHardBlocked }}>
      <div style={FRAME_STAGE}>
        <div style={FRAME_BODY}>
          <div style={PHONE}>
            <div style={SCREEN}>
              <div style={NOTCH} aria-hidden />
              {children}
              <div style={HOME_INDICATOR} aria-hidden />
            </div>
          </div>
          {!hardBlocked && !onInboundRoot && (
            <footer style={FOOTER}>
              <Link
                href="/inbound/inbox"
                style={onInbox ? ACTIVE_INBOX_BUTTON : INBOX_BUTTON}
                aria-current={onInbox ? 'page' : undefined}
              >
                <span aria-hidden>✉</span> Inbox
              </Link>
            </footer>
          )}
          <span style={{ font: 'var(--text-caption)', color: 'var(--content-tertiary)' }}>{label}</span>
        </div>
      </div>
    </DemoFrameContext.Provider>
  );
}
