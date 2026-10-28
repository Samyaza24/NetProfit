import { useCallback, useEffect, useState } from "react";
import { AppState } from "react-native";
import { friendlyError } from "../lib/errors";

interface State<T> {
  data: T | null;
  error: string | null;
  loading: boolean;
}

// Loads on mount, whenever `active` turns true again, when the app returns to the foreground, every
// `pollMs` if given, and when reload() is called (for example by pull-to-refresh). Old data stays
// visible while refreshing. `load` must be stable (module-level or wrapped in useCallback).
export function useLoad<T>(load: () => Promise<T>, active = true, pollMs = 0) {
  const [state, setState] = useState<State<T>>({ data: null, error: null, loading: true });
  const [refreshing, setRefreshing] = useState(false);
  const [tick, setTick] = useState(0);

  useEffect(() => {
    if (!active) return;
    let live = true;
    load().then(
      (data) => {
        if (!live) return;
        setState({ data, error: null, loading: false });
        setRefreshing(false);
      },
      (e) => {
        if (!live) return;
        setState((s) => ({ ...s, error: friendlyError(e).message, loading: false }));
        setRefreshing(false);
      }
    );
    return () => {
      live = false;
    };
  }, [load, active, tick]);

  useEffect(() => {
    if (!active) return;
    const sub = AppState.addEventListener("change", (s) => s === "active" && setTick((t) => t + 1));
    const timer = pollMs > 0 ? setInterval(() => setTick((t) => t + 1), pollMs) : undefined;
    return () => {
      sub.remove();
      if (timer) clearInterval(timer);
    };
  }, [active, pollMs]);

  // reload shows the pull-to-refresh spinner; refresh fetches quietly (used when local data changes).
  const reload = useCallback(() => {
    setRefreshing(true);
    setTick((t) => t + 1);
  }, []);
  const refresh = useCallback(() => setTick((t) => t + 1), []);

  return { ...state, refreshing, reload, refresh };
}
