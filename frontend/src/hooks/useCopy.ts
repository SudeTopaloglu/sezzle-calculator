import { useEffect, useRef, useState } from 'react';

type CopyStatus = 'idle' | 'copied' | 'failed';

const FEEDBACK_MS = 1_500;

/** Copies text to the clipboard and reports the outcome briefly for feedback. */
export function useCopy() {
  const [status, setStatus] = useState<CopyStatus>('idle');
  const resetTimer = useRef<number | undefined>(undefined);

  useEffect(() => () => window.clearTimeout(resetTimer.current), []);

  async function copy(text: string) {
    let outcome: CopyStatus;
    try {
      await navigator.clipboard.writeText(text);
      outcome = 'copied';
    } catch {
      // No clipboard access, e.g. the page is served over plain HTTP.
      outcome = 'failed';
    }
    setStatus(outcome);
    window.clearTimeout(resetTimer.current);
    resetTimer.current = window.setTimeout(() => setStatus('idle'), FEEDBACK_MS);
  }

  return { status, copy };
}
