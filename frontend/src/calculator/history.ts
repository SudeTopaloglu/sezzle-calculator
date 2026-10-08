import { formatNumber } from './format';

export interface HistoryEntry {
  id: string;
  /** What was calculated, as shown on screen, e.g. "2 + 3 × 4". */
  expression: string;
  result: number;
  /** Milliseconds since the epoch. */
  timestamp: number;
}

/** Consecutive calculations where each continues from the previous result. */
interface HistoryGroup {
  id: string;
  entries: HistoryEntry[];
}

interface HistoryDay {
  id: string;
  label: string;
  groups: HistoryGroup[];
}

export function createHistoryEntry(expression: string, result: number, timestamp = Date.now()): HistoryEntry {
  return { id: `${timestamp}-${Math.random().toString(36).slice(2, 8)}`, expression, result, timestamp };
}

/**
 * Arranges entries (stored oldest first) for display: days and groups newest
 * first, entries inside a group in the order they happened, like a paper tape.
 * An entry joins the previous group when it starts with that group's last result,
 * e.g. "8,045.7 − 28" after "206.3 × 39 = 8,045.7".
 */
export function groupHistory(entries: readonly HistoryEntry[], now = new Date()): HistoryDay[] {
  const days: HistoryDay[] = [];

  for (const entry of entries) {
    const dayId = new Date(entry.timestamp).toDateString();
    let day = days.at(-1);
    if (day?.id !== dayId) {
      day = { id: dayId, label: dayLabel(new Date(entry.timestamp), now), groups: [] };
      days.push(day);
    }

    const group = day.groups.at(-1);
    const previous = group?.entries.at(-1);
    if (group && previous && entry.expression.startsWith(`${formatNumber(previous.result)} `)) {
      group.entries.push(entry);
    } else {
      day.groups.push({ id: entry.id, entries: [entry] });
    }
  }

  return days.reverse().map((day) => ({ ...day, groups: day.groups.reverse() }));
}

function dayLabel(date: Date, now: Date): string {
  const yesterday = new Date(now);
  yesterday.setDate(now.getDate() - 1);

  if (date.toDateString() === now.toDateString()) return 'Today';
  if (date.toDateString() === yesterday.toDateString()) return 'Yesterday';
  return date.toLocaleDateString('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    year: date.getFullYear() === now.getFullYear() ? undefined : 'numeric',
  });
}

/** Reads stored history, dropping anything malformed instead of failing. */
export function parseHistory(raw: string | null): HistoryEntry[] {
  if (raw === null) return [];
  try {
    const data: unknown = JSON.parse(raw);
    return Array.isArray(data) ? data.filter(isHistoryEntry) : [];
  } catch {
    return [];
  }
}

function isHistoryEntry(value: unknown): value is HistoryEntry {
  const entry = value as Partial<HistoryEntry> | null;
  return (
    typeof entry?.id === 'string' &&
    typeof entry.expression === 'string' &&
    typeof entry.timestamp === 'number' &&
    Number.isFinite(entry.result)
  );
}
