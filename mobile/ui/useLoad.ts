import { useCallback, useEffect, useState } from "react";
import { friendlyError } from "../lib/errors";

interface State<T> {
  data: T | null;
  error: string | null;
  loading: boolean;
}

// Loads on mount and whenever `active` turns true again or reload() is called. Old data stays visible
// while refreshing. `load` must be stable (wrap it in useCallback).
export function useLoad<T>(load: () => Promise<T>, active = true) {
  const [state, setState] = useState<State<T>>({ data: null, error: null, loading: true });
  const [tick, setTick] = useState(0);

  useEffect(() => {
    if (!active) return;
    let live = true;
    load().then(
      (data) => live && setState({ data, error: null, loading: false }),
      (e) => live && setState((s) => ({ ...s, error: friendlyError(e).message, loading: false }))
    );
    return () => {
      live = false;
    };
  }, [load, active, tick]);

  const reload = useCallback(() => setTick((t) => t + 1), []);
  return { ...state, reload };
}
