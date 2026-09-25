'use client';

import { useEffect, useState } from 'react';

type Mode = 'TABLE' | 'CARD';

function storageKey(listKey: string): string {
  return `list-view-mode:${listKey}`;
}

/** Per-viewer override of the admin's default table/card view for one list, remembered in this
 *  browser only. Falls back to the admin default until the user explicitly toggles it. */
export function useListViewMode(listKey: string, adminDefault: Mode): [Mode, (mode: Mode) => void] {
  const [mode, setModeState] = useState<Mode>(adminDefault);

  useEffect(() => {
    try {
      const stored = localStorage.getItem(storageKey(listKey));
      // eslint-disable-next-line react-hooks/set-state-in-effect -- syncs from browser storage, a legitimate external system
      setModeState(stored === 'TABLE' || stored === 'CARD' ? stored : adminDefault);
    } catch {
      // Storage can throw (private mode, blocked); the initial adminDefault already stands.
    }
  }, [listKey, adminDefault]);

  function setMode(next: Mode) {
    setModeState(next);
    try {
      localStorage.setItem(storageKey(listKey), next);
    } catch {
      // Best-effort only — the in-memory state change above still applies for this session.
    }
  }

  return [mode, setMode];
}
