import { useEffect, useRef, useState } from "react";

/**
 * useState that persists to localStorage. Survives tab switches / reloads.
 * Call the returned `clear` to reset both the React state and the stored value.
 */
export function usePersistedState<T>(key: string, initialValue: T) {
  const [value, setValue] = useState<T>(() => {
    if (typeof window === "undefined") return initialValue;
    try {
      const raw = window.localStorage.getItem(key);
      if (raw === null) return initialValue;
      return JSON.parse(raw) as T;
    } catch {
      return initialValue;
    }
  });

  const keyRef = useRef(key);
  keyRef.current = key;

  useEffect(() => {
    try {
      window.localStorage.setItem(keyRef.current, JSON.stringify(value));
    } catch {
      /* quota or serialization error – ignore */
    }
  }, [value]);

  const clear = () => {
    try {
      window.localStorage.removeItem(keyRef.current);
    } catch {
      /* ignore */
    }
  };

  return [value, setValue, clear] as const;
}

export function clearPersistedKeys(keys: string[]) {
  keys.forEach((k) => {
    try {
      window.localStorage.removeItem(k);
    } catch {
      /* ignore */
    }
  });
}