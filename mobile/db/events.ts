type Listener = () => void;

const listeners = new Set<Listener>();
let timer: ReturnType<typeof setTimeout> | undefined;

// Screens subscribe to learn that local data changed, instead of polling the database.
export function onDataChange(fn: Listener): () => void {
  listeners.add(fn);
  return () => {
    listeners.delete(fn);
  };
}

// Bursts of writes (a sync saves many rows) are merged into one notification.
export function notifyDataChange(): void {
  clearTimeout(timer);
  timer = setTimeout(() => listeners.forEach((fn) => fn()), 120);
}
