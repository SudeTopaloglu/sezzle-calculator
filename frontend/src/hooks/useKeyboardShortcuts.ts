import { useEffect, useRef, useState } from 'react';
import { KEYS, type KeyDefinition } from '../calculator/keys';

const KEYS_BY_SHORTCUT = new Map(KEYS.flatMap((key) => key.shortcuts.map((shortcut) => [shortcut, key] as const)));
const ACTIVE_KEY_HIGHLIGHT_MS = 120;

/**
 * Calls onKey for keyboard shortcuts and returns the id of the key to
 * highlight, so keyboard input gets the same visual feedback as a click.
 */
export function useKeyboardShortcuts(onKey: (key: KeyDefinition) => void): string | null {
  const [activeKeyId, setActiveKeyId] = useState<string | null>(null);
  const onKeyRef = useRef(onKey);

  useEffect(() => {
    onKeyRef.current = onKey;
  });

  useEffect(() => {
    let highlightTimer: number | undefined;

    function handleKeyDown(event: KeyboardEvent) {
      if (event.ctrlKey || event.metaKey || event.altKey) {
        return;
      }
      const key = KEYS_BY_SHORTCUT.get(event.key);
      if (!key) {
        return;
      }
      // Stops Enter from also clicking a focused button and "/" from opening quick find.
      event.preventDefault();
      onKeyRef.current(key);

      setActiveKeyId(key.id);
      window.clearTimeout(highlightTimer);
      highlightTimer = window.setTimeout(() => setActiveKeyId(null), ACTIVE_KEY_HIGHLIGHT_MS);
    }

    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.clearTimeout(highlightTimer);
    };
  }, []);

  return activeKeyId;
}
