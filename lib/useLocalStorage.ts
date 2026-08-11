"use client";

import { useCallback, useSyncExternalStore } from "react";

type Listener = () => void;
const listeners = new Map<string, Set<Listener>>();

function getListeners(key: string): Set<Listener> {
  let set = listeners.get(key);
  if (!set) {
    set = new Set();
    listeners.set(key, set);
  }
  return set;
}

function getServerSnapshot(): string | null {
  return null;
}

/** Reads a localStorage key reactively, hydration-safe via useSyncExternalStore. */
export function useLocalStorageValue(key: string): string | null {
  const subscribe = useCallback(
    (onStoreChange: Listener) => {
      const set = getListeners(key);
      set.add(onStoreChange);
      return () => set.delete(onStoreChange);
    },
    [key]
  );
  const getSnapshot = useCallback(() => localStorage.getItem(key), [key]);

  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
}

/** Writes a localStorage key and notifies subscribers of `useLocalStorageValue`. */
export function setLocalStorageValue(key: string, value: string): void {
  localStorage.setItem(key, value);
  getListeners(key).forEach((listener) => listener());
}
