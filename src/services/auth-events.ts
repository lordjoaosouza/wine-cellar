type Listener = () => void;

const listeners = new Set<Listener>();

export function emitAuthLogout(): void {
  for (const listener of listeners) {
    listener();
  }
}

export function subscribeAuthLogout(listener: Listener): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}
