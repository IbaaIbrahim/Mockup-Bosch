'use client';

/**
 * ScanFrame — docs/01-DESIGN-SYSTEM.md §6.4, docs/09-SCOPE-CONFERENCE-DEMO.md
 * step 13: "BarcodeDetector where available, ZXing-wasm fallback, and a
 * manual-entry fallback on every scanner (the venue lighting will be bad and
 * someone will deny a camera permission)."
 *
 * Detection strategy, in order:
 *   1. Native `BarcodeDetector` (Chrome/Android) — zero extra bundle weight.
 *   2. `@zxing/browser`, dynamically imported so desktop/Android builds never
 *      pay for it — covers iOS Safari, which has no BarcodeDetector (risk R5).
 *   3. Manual text entry — always rendered, never hidden behind a toggle.
 *      This is risk R5/R9 insurance, not a lesser mode.
 */

import { useEffect, useRef, useState } from 'react';
import { Button } from './Button';

export interface ScannerProps {
  instruction: string;
  manualLabel: string;
  manualPlaceholder: string;
  onDetect: (raw: string) => void;
}

type CameraState = 'idle' | 'starting' | 'active' | 'unsupported' | 'denied' | 'error';

interface BarcodeDetectorLike {
  detect(source: CanvasImageSource): Promise<Array<{ rawValue: string }>>;
}

declare global {
  interface Window {
    BarcodeDetector?: new (options?: { formats: string[] }) => BarcodeDetectorLike;
  }
}

const DETECT_FORMATS = ['code_128', 'code_39', 'ean_13', 'qr_code', 'data_matrix'];
const POLL_MS = 250;

export function Scanner({ instruction, manualLabel, manualPlaceholder, onDetect }: ScannerProps) {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const stoppedRef = useRef(false);
  const [cameraState, setCameraState] = useState<CameraState>('idle');
  const [manualValue, setManualValue] = useState('');

  useEffect(() => {
    stoppedRef.current = false;
    let pollTimer: ReturnType<typeof setInterval> | undefined;
    let zxingControls: { stop: () => void } | undefined;

    async function start() {
      if (typeof navigator === 'undefined' || !navigator.mediaDevices?.getUserMedia) {
        setCameraState('unsupported');
        return;
      }

      setCameraState('starting');
      let stream: MediaStream;
      try {
        stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } });
      } catch {
        setCameraState('denied');
        return;
      }

      if (stoppedRef.current) {
        stream.getTracks().forEach((t) => t.stop());
        return;
      }
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play().catch(() => undefined);
      }
      setCameraState('active');

      if (window.BarcodeDetector) {
        const detector = new window.BarcodeDetector({ formats: DETECT_FORMATS });
        pollTimer = setInterval(async () => {
          if (!videoRef.current || stoppedRef.current) return;
          try {
            const results = await detector.detect(videoRef.current);
            const hit = results[0]?.rawValue;
            if (hit) {
              stoppedRef.current = true;
              onDetect(hit);
            }
          } catch {
            // A transient decode failure is normal between frames — ignore.
          }
        }, POLL_MS);
        return;
      }

      // Fallback: ZXing, dynamically imported so it never loads on devices
      // (the common case) that already support BarcodeDetector natively.
      try {
        const { BrowserMultiFormatReader } = await import('@zxing/browser');
        const reader = new BrowserMultiFormatReader();
        if (!videoRef.current || stoppedRef.current) return;
        // Not calling controls.stop() from inside this callback deliberately:
        // referencing `controls` here would race the `await` that assigns it.
        // Detection is instead torn down by the effect cleanup below, which
        // runs as soon as onDetect() causes the parent to unmount this
        // component (moving off the scan screen).
        zxingControls = await reader.decodeFromVideoElement(videoRef.current, (result) => {
          if (result && !stoppedRef.current) {
            stoppedRef.current = true;
            onDetect(result.getText());
          }
        });
      } catch {
        setCameraState('error');
      }
    }

    start();

    return () => {
      stoppedRef.current = true;
      if (pollTimer) clearInterval(pollTimer);
      zxingControls?.stop();
      streamRef.current?.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    };
  }, [onDetect]);

  const submitManual = () => {
    const trimmed = manualValue.trim();
    if (trimmed) onDetect(trimmed);
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-5)' }}>
      <div
        style={{
          position: 'relative',
          width: '100%',
          aspectRatio: '3 / 4',
          borderRadius: 'var(--radius-xl)',
          overflow: 'hidden',
          background: 'var(--grey-950)',
        }}
      >
        <video
          ref={videoRef}
          muted
          playsInline
          style={{
            width: '100%',
            height: '100%',
            objectFit: 'cover',
            display: cameraState === 'active' ? 'block' : 'none',
          }}
        />

        {cameraState === 'active' && (
          <div
            aria-hidden
            style={{
              position: 'absolute',
              inset: 0,
              display: 'grid',
              placeItems: 'center',
              pointerEvents: 'none',
            }}
          >
            <div
              style={{
                width: '70%',
                aspectRatio: '1 / 1',
                border: '3px solid var(--grey-0)',
                borderRadius: 'var(--radius-lg)',
                boxShadow: '0 0 0 100vmax rgb(0 0 0 / 0.35)',
              }}
            />
          </div>
        )}

        {cameraState !== 'active' && (
          <div
            style={{
              position: 'absolute',
              inset: 0,
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 'var(--space-2)',
              padding: 'var(--space-6)',
              textAlign: 'center',
              color: 'var(--grey-400)',
            }}
          >
            <span style={{ font: 'var(--text-body-sm)' }}>
              {cameraState === 'starting' && 'Starting camera…'}
              {cameraState === 'idle' && 'Starting camera…'}
              {cameraState === 'unsupported' && 'Camera scanning is not available on this device.'}
              {cameraState === 'denied' && 'Camera access was denied. Use manual entry below.'}
              {cameraState === 'error' && 'Scanner failed to start. Use manual entry below.'}
            </span>
          </div>
        )}
      </div>

      <p style={{ font: 'var(--text-body)', color: 'var(--content-secondary)', textAlign: 'center', margin: 0 }}>
        {instruction}
      </p>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
        <span style={{ font: 'var(--text-label)', color: 'var(--content-tertiary)' }}>{manualLabel}</span>
        <div style={{ display: 'flex', gap: 'var(--space-2)' }}>
          <input
            type="text"
            value={manualValue}
            onChange={(e) => setManualValue(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') submitManual();
            }}
            placeholder={manualPlaceholder}
            style={{
              flex: 1,
              height: 'var(--target-min)',
              padding: `0 var(--space-4)`,
              borderRadius: 'var(--radius-md)',
              border: '1.5px solid var(--border-default)',
              background: 'var(--surface-raised)',
              color: 'var(--content-primary)',
              font: 'var(--text-mono)',
            }}
          />
          <Button variant="secondary" onClick={submitManual} disabled={!manualValue.trim()} disabledReason="Enter a value first">
            Go
          </Button>
        </div>
      </div>
    </div>
  );
}
