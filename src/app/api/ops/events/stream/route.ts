/** SSE feed of ops decisions — the ops console's live event log, including skips (CLAUDE.md rule 4). */

import { eventHub } from '../../../../../server/events-hub';

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

      send('connected', { ok: true });
      unsubscribe = eventHub.onOpsEvent((event) => send('opsEvent', event));
      heartbeat = setInterval(() => controller.enqueue(encoder.encode(`: heartbeat\n\n`)), HEARTBEAT_MS);

      request.signal.addEventListener('abort', () => {
        clearInterval(heartbeat);
        unsubscribe?.();
        try {
          controller.close();
        } catch {
          // Already closed by the client disconnecting.
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
