import { useCallback, useEffect, useState } from "react";

interface State<T> {
  data: T | null;
  error: string | null;
  loading: boolean;
}

// `load` must be a stable function (define it at module level) so the effect only re-runs on reload.
export function useFetch<T>(load: () => Promise<T>) {
  const [state, setState] = useState<State<T>>({ data: null, error: null, loading: true });
  const [tick, setTick] = useState(0);

  useEffect(() => {
    let live = true;
    load().then(
      (data) => live && setState({ data, error: null, loading: false }),
      (e) => live && setState({ data: null, error: String(e), loading: false })
    );
    return () => {
      live = false;
    };
  }, [load, tick]);

  const reload = useCallback(() => {
    setState((s) => ({ ...s, loading: true, error: null }));
    setTick((t) => t + 1);
  }, []);

  return { ...state, reload };
}
