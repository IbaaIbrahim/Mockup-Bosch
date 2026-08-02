/**
 * Europe/Berlin day boundaries, computed without a date library.
 *
 * docs/04-APP3-DASHBOARD.md §4.1: date filters apply to `timestamp_last_event`
 * "Europe/Berlin". We only need calendar-day boundaries (for "Today" /
 * "Yesterday"), so a small offset trick beats adding a dependency for one
 * calculation.
 */

const BERLIN_TZ = 'Europe/Berlin';

/** The Europe/Berlin wall-clock instant, expressed as a UTC Date with the same numbers. */
function toBerlinWallClock(instant: Date): Date {
  return new Date(instant.toLocaleString('en-US', { timeZone: BERLIN_TZ }));
}

/** Midnight at the start of `instant`'s Europe/Berlin calendar day, as a real UTC instant. */
export function berlinMidnightUtc(instant: Date): Date {
  const wall = toBerlinWallClock(instant);
  const naiveUtcMidnight = new Date(
    Date.UTC(wall.getFullYear(), wall.getMonth(), wall.getDate(), 0, 0, 0, 0),
  );
  // Offset between Berlin wall clock and UTC at this instant (handles DST).
  const offsetMs = toBerlinWallClock(naiveUtcMidnight).getTime() - naiveUtcMidnight.getTime();
  return new Date(naiveUtcMidnight.getTime() - offsetMs);
}

export function berlinDayRange(instant: Date, daysAgo = 0): { start: Date; end: Date } {
  const todayStart = berlinMidnightUtc(instant);
  const start = new Date(todayStart.getTime() - daysAgo * 24 * 60 * 60 * 1000);
  const end = new Date(start.getTime() + 24 * 60 * 60 * 1000);
  return { start, end };
}

export type DatePreset = 'today' | 'yesterday' | 'last7' | 'last30';

export function resolveDatePreset(
  preset: DatePreset,
  referenceDate: Date = new Date(),
): { dateFrom: string; dateTo: string } {
  switch (preset) {
    case 'today': {
      const { start, end } = berlinDayRange(referenceDate, 0);
      return { dateFrom: start.toISOString(), dateTo: end.toISOString() };
    }
    case 'yesterday': {
      const { start, end } = berlinDayRange(referenceDate, 1);
      return { dateFrom: start.toISOString(), dateTo: end.toISOString() };
    }
    case 'last7': {
      const { end } = berlinDayRange(referenceDate, 0);
      const start = new Date(end.getTime() - 7 * 24 * 60 * 60 * 1000);
      return { dateFrom: start.toISOString(), dateTo: end.toISOString() };
    }
    case 'last30': {
      const { end } = berlinDayRange(referenceDate, 0);
      const start = new Date(end.getTime() - 30 * 24 * 60 * 60 * 1000);
      return { dateFrom: start.toISOString(), dateTo: end.toISOString() };
    }
  }
}
