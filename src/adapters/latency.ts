/**
 * Shared artificial latency for mock external-system adapters.
 *
 * CLAUDE.md rule 3: "Give them ~250ms of artificial latency — an instant 'SAP
 * lookup' looks fake." A dead-instant mock reads as obviously fake in a live
 * demo; a quarter-second one with a loading skeleton reads as a real
 * integration.
 */
export const DEFAULT_ADAPTER_LATENCY_MS = 250;

export function adapterLatency(ms = DEFAULT_ADAPTER_LATENCY_MS): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
