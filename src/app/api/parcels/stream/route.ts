/**
 * SSE endpoint — docs/04-APP3-DASHBOARD.md §6. In-process EventEmitter →
 * text/event-stream, the SQLite-era replacement for Postgres LISTEN/NOTIFY.
 * Target: a parcel registered on the phone appears on an open board within
 * 2 seconds (gate C16).
 */

import { eventHub } from '../../../../server/events-hub';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

const HEARTBEAT_MS = 15_000;

export async function GET(request: Request) {
  const encoder = new TextEncoder();

  let unsubscribe: (() => void) | undefined;
  let heartbeat: ReturnType<typeof setInterval> | undefined;

  const stream = new ReadableStream({
    start(controller) {
      const send = (event: string, data: unknown) => {
        controller.enqueue(encoder.encode(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`));
      };

      send('connected', { ok: true, at: new Date().toISOString() });

      unsubscribe = eventHub.onParcelChange((change) => {
        send('parcel', change);
      });

      heartbeat = setInterval(() => {
        controller.enqueue(encoder.encode(`: heartbeat\n\n`));
      }, HEARTBEAT_MS);

      request.signal.addEventListener('abort', () => {
        clearInterval(heartbeat);
        unsubscribe?.();
        try {
          controller.close();
        } catch {
          // Already closed by the client disconnecting — nothing to do.
        }
      });
    },
    cancel() {
      clearInterval(heartbeat);
      unsubscribe?.();
    },
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache, no-transform',
      Connection: 'keep-alive',
      'X-Accel-Buffering': 'no',
    },
  });
}
