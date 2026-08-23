import AsyncStorage from "@react-native-async-storage/async-storage";

export interface LocalCollection<T> {
  clear: () => Promise<void>;
  get: (id: string) => Promise<T | null>;
  has: (id: string) => Promise<boolean>;
  list: () => Promise<T[]>;
  remove: (id: string) => Promise<T[]>;
  save: (item: T) => Promise<T[]>;
  saveMany: (items: T[]) => Promise<T[]>;
}

export function createLocalCollection<T>({
  key,
  getId,
  maxItems,
}: {
  key: string;
  getId: (item: T) => string;
  maxItems?: number;
}): LocalCollection<T> {
  let memory: T[] | null = null;

  async function readAll(): Promise<T[]> {
    if (memory) {
      return memory;
    }
    try {
      const stored = await AsyncStorage.getItem(key);
      const parsed = stored ? (JSON.parse(stored) as unknown) : [];
      memory = Array.isArray(parsed) ? (parsed as T[]) : [];
    } catch {
      memory = [];
    }
    return memory;
  }

  async function writeAll(items: T[]): Promise<T[]> {
    memory = items;
    await AsyncStorage.setItem(key, JSON.stringify(items));
    return items;
  }

  function upsertAll(current: T[], incoming: T[]): T[] {
    const incomingIds = new Set(incoming.map(getId));
    const merged = [
      ...incoming,
      ...current.filter((entry) => !incomingIds.has(getId(entry))),
    ];
    return maxItems ? merged.slice(0, maxItems) : merged;
  }

  return {
    clear: async () => {
      await writeAll([]);
    },
    get: async (id) =>
      (await readAll()).find((item) => getId(item) === id) ?? null,
    has: async (id) => (await readAll()).some((item) => getId(item) === id),
    list: async () => [...(await readAll())],
    remove: async (id) =>
      writeAll((await readAll()).filter((item) => getId(item) !== id)),
    save: async (item) => writeAll(upsertAll(await readAll(), [item])),
    saveMany: async (items) => {
      if (items.length === 0) {
        return [...(await readAll())];
      }
      return writeAll(upsertAll(await readAll(), items));
    },
  };
}

export interface LocalRecord<T> {
  get: () => Promise<T>;
  save: (value: T) => Promise<T>;
  subscribe: (listener: (value: T) => void) => () => void;
}

export function createLocalRecord<T>({
  key,
  defaultValue,
}: {
  key: string;
  defaultValue: T;
}): LocalRecord<T> {
  let memory: T | null = null;
  const listeners = new Set<(value: T) => void>();

  async function read(): Promise<T> {
    if (memory) {
      return memory;
    }
    try {
      const stored = await AsyncStorage.getItem(key);
      memory = stored ? (JSON.parse(stored) as T) : defaultValue;
    } catch {
      memory = defaultValue;
    }
    return memory;
  }

  async function write(value: T): Promise<T> {
    memory = value;
    await AsyncStorage.setItem(key, JSON.stringify(value));
    for (const listener of listeners) {
      listener(value);
    }
    return value;
  }

  return {
    get: read,
    save: write,
    subscribe: (listener) => {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
  };
}
