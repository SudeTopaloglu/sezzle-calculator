import { describe, expect, it } from 'vitest';
import { createHistoryEntry, groupHistory, parseHistory, type HistoryEntry } from './history';

const NOW = new Date(2026, 9, 8, 15, 0);
const at = (day: number, hour: number) => new Date(2026, 9, day, hour).getTime();

/** Shows the grouped history as plain text, which keeps expectations readable. */
function outline(entries: HistoryEntry[]) {
  return groupHistory(entries, NOW).map((day) => ({
    label: day.label,
    groups: day.groups.map((group) => group.entries.map((entry) => `${entry.expression} = ${entry.result}`)),
  }));
}

describe('groupHistory', () => {
  it('puts calculations that continue from the previous result on one tape', () => {
    const entries = [
      createHistoryEntry('207 − 0.7 × 39', 179.7, at(8, 9)),
      createHistoryEntry('179.7 − 28', 151.7, at(8, 9)),
      createHistoryEntry('1 + 1', 2, at(8, 10)),
    ];

    expect(outline(entries)).toEqual([
      { label: 'Today', groups: [['1 + 1 = 2'], ['207 − 0.7 × 39 = 179.7', '179.7 − 28 = 151.7']] },
    ]);
  });

  it('matches results the way they are displayed', () => {
    const entries = [createHistoryEntry('4,000 + 45.7', 4045.7, at(8, 9)), createHistoryEntry('4,045.7 × 2', 8091.4, at(8, 9))];

    expect(outline(entries)[0].groups).toHaveLength(1);
  });

  it('does not treat a longer number as a continuation', () => {
    const entries = [createHistoryEntry('1 + 1', 2, at(8, 9)), createHistoryEntry('25 × 2', 50, at(8, 9))];

    expect(outline(entries)[0].groups).toHaveLength(2);
  });

  it('puts the newest day first and labels each day', () => {
    const entries = [
      createHistoryEntry('1 + 1', 2, at(1, 12)),
      createHistoryEntry('2 + 2', 4, at(7, 12)),
      createHistoryEntry('3 + 3', 6, at(8, 12)),
    ];

    expect(outline(entries).map((day) => day.label)).toEqual(['Today', 'Yesterday', 'Thu, Oct 1']);
  });

  it('adds the year for dates in another year', () => {
    const entries = [createHistoryEntry('√(4)', 2, new Date(2025, 11, 31, 12).getTime())];

    expect(outline(entries)[0].label).toBe('Wed, Dec 31, 2025');
  });

  it('does not chain across days', () => {
    const entries = [createHistoryEntry('1 + 1', 2, at(7, 23)), createHistoryEntry('2 + 2', 4, at(8, 1))];

    expect(outline(entries).map((day) => day.groups)).toEqual([[['2 + 2 = 4']], [['1 + 1 = 2']]]);
  });

  it('returns nothing for an empty history', () => {
    expect(groupHistory([], NOW)).toEqual([]);
  });
});

describe('parseHistory', () => {
  const valid = createHistoryEntry('1 + 2', 3, at(8, 9));

  it('reads stored entries', () => {
    expect(parseHistory(JSON.stringify([valid]))).toEqual([valid]);
  });

  it.each([
    ['nothing stored', null],
    ['invalid JSON', '{oops'],
    ['not an array', '{"id": "x"}'],
  ])('returns an empty history for %s', (_, raw) => {
    expect(parseHistory(raw)).toEqual([]);
  });

  it('drops malformed entries', () => {
    const malformed = [{ ...valid, id: 42 }, { ...valid, result: 'NaN' }, { ...valid, expression: undefined }, null];
    expect(parseHistory(JSON.stringify([...malformed, valid]))).toEqual([valid]);
  });
});
