import { OPERATIONS, type Calculation } from './operations';

export interface HistoryEntry {
  id: string;
  calculation: Calculation;
  result: number;
  /** Milliseconds since the epoch. */
  timestamp: number;
}

/** Consecutive calculations where each continues from the previous result. */
export interface HistoryGroup {
  id: string;
  entries: HistoryEntry[];
}

export interface HistoryDay {
  id: string;
  label: string;
  groups: HistoryGroup[];
}

export function createHistoryEntry(calculation: Calculation, result: number, timestamp = Date.now()): HistoryEntry {
  return { id: `${timestamp}-${Math.random().toString(36).slice(2, 8)}`, calculation, result, timestamp };
}

/**
 * Arranges entries (stored oldest first) for display: days and groups newest
 * first, entries inside a group in the order they happened, like a paper tape.
 * An entry joins the previous group when it starts from that group's last result.
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
    if (group && entry.calculation.a === group.entries.at(-1)?.result) {
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
  const calculation = entry?.calculation as Partial<{ operation: string; a: number; b: number }> | undefined;
  return (
    typeof entry?.id === 'string' &&
    typeof entry.timestamp === 'number' &&
    Number.isFinite(entry.result) &&
    OPERATIONS.includes(calculation?.operation as Calculation['operation']) &&
    Number.isFinite(calculation?.a) &&
    (calculation?.operation === 'sqrt' || Number.isFinite(calculation?.b))
  );
}
