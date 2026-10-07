import { describe, expect, it } from 'vitest';
import { createHistoryEntry, groupHistory, parseHistory, type HistoryEntry } from './history';
import type { Calculation } from './operations';

const NOW = new Date(2026, 9, 8, 15, 0);
const at = (day: number, hour: number) => new Date(2026, 9, day, hour).getTime();

function entry(calculation: Calculation, result: number, timestamp: number): HistoryEntry {
  return createHistoryEntry(calculation, result, timestamp);
}

/** Shows the grouped history as plain text, which keeps expectations readable. */
function outline(entries: HistoryEntry[]) {
  return groupHistory(entries, NOW).map((day) => ({
    label: day.label,
    groups: day.groups.map((group) => group.entries.map((e) => `${e.calculation.a}→${e.result}`)),
  }));
}

describe('groupHistory', () => {
  it('chains calculations that continue from the previous result', () => {
    const entries = [
      entry({ operation: 'multiply', a: 0.7, b: 39 }, 27.3, at(8, 9)),
      entry({ operation: 'subtract', a: 207, b: 27.3 }, 179.7, at(8, 9)),
      entry({ operation: 'subtract', a: 179.7, b: 28 }, 151.7, at(8, 9)),
      entry({ operation: 'add', a: 1, b: 1 }, 2, at(8, 10)),
    ];

    expect(outline(entries)).toEqual([
      { label: 'Today', groups: [['1→2'], ['207→179.7', '179.7→151.7'], ['0.7→27.3']] },
    ]);
  });

  it('puts the newest day first and labels each day', () => {
    const entries = [
      entry({ operation: 'add', a: 1, b: 1 }, 2, at(1, 12)),
      entry({ operation: 'add', a: 2, b: 2 }, 4, at(7, 12)),
      entry({ operation: 'add', a: 3, b: 3 }, 6, at(8, 12)),
    ];

    expect(outline(entries).map((day) => day.label)).toEqual(['Today', 'Yesterday', 'Thu, Oct 1']);
  });

  it('adds the year for dates in another year', () => {
    const entries = [entry({ operation: 'sqrt', a: 4 }, 2, new Date(2025, 11, 31, 12).getTime())];

    expect(outline(entries)[0].label).toBe('Wed, Dec 31, 2025');
  });

  it('does not chain across days', () => {
    const entries = [
      entry({ operation: 'add', a: 1, b: 1 }, 2, at(7, 23)),
      entry({ operation: 'add', a: 2, b: 2 }, 4, at(8, 1)),
    ];

    expect(outline(entries).map((day) => day.groups)).toEqual([[['2→4']], [['1→2']]]);
  });

  it('returns nothing for an empty history', () => {
    expect(groupHistory([], NOW)).toEqual([]);
  });
});

describe('parseHistory', () => {
  const valid = entry({ operation: 'add', a: 1, b: 2 }, 3, at(8, 9));
  const unary = entry({ operation: 'sqrt', a: 9 }, 3, at(8, 9));

  it('reads stored entries', () => {
    expect(parseHistory(JSON.stringify([valid, unary]))).toEqual([valid, unary]);
  });

  it.each([
    ['nothing stored', null],
    ['invalid JSON', '{oops'],
    ['not an array', '{"id": "x"}'],
  ])('returns an empty history for %s', (_, raw) => {
    expect(parseHistory(raw)).toEqual([]);
  });

  it('drops malformed entries', () => {
    const malformed = [
      { ...valid, id: 42 },
      { ...valid, result: 'NaN' },
      { ...valid, calculation: { operation: 'modulo', a: 1, b: 2 } },
      { ...valid, calculation: { operation: 'add', a: 1 } },
      null,
    ];
    expect(parseHistory(JSON.stringify([...malformed, valid]))).toEqual([valid]);
  });
});
