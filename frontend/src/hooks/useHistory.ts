import { useCallback, useEffect, useState } from 'react';
import { createHistoryEntry, parseHistory, type HistoryEntry } from '../calculator/history';
import type { Calculation } from '../calculator/operations';

export const HISTORY_STORAGE_KEY = 'calculator-history-v1';
const MAX_ENTRIES = 100;

/** Calculation history, kept in localStorage so it survives a reload. */
export function useHistory() {
  const [entries, setEntries] = useState<HistoryEntry[]>(() => parseHistory(readStorage()));

  useEffect(() => {
    writeStorage(JSON.stringify(entries));
  }, [entries]);

  const add = useCallback((calculation: Calculation, result: number) => {
    const entry = createHistoryEntry(calculation, result);
    setEntries((current) => [...current, entry].slice(-MAX_ENTRIES));
  }, []);

  const clear = useCallback(() => setEntries([]), []);

  return { entries, add, clear };
}

// Storage can be unavailable (private mode, blocked cookies) or full. History
// then simply lasts for the session instead of breaking the calculator.
function readStorage(): string | null {
  try {
    return window.localStorage.getItem(HISTORY_STORAGE_KEY);
  } catch {
    return null;
  }
}

function writeStorage(value: string) {
  try {
    window.localStorage.setItem(HISTORY_STORAGE_KEY, value);
  } catch {
    // See above: keep working without persistence.
  }
}
