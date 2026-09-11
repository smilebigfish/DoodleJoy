import type { PaletteSize } from "@/lib/palette";

export type CustomColors = [string, string, string];

export type Settings = {
  paletteSize: PaletteSize;
  customColors: CustomColors;
};

export type Artwork = {
  id: string;
  createdAt: number;
  thumbnail: Blob;
  png: Blob;
  hasBackground: boolean;
  inkPng?: Blob | null;
  overlayPng?: Blob | null;
};

const DB_NAME = "doodlejoy";
const DB_VERSION = 2;
const SETTINGS_ID = "app";
const STORE_ARTWORKS = "artworks";
const STORE_SETTINGS = "settings";

const EMPTY_CUSTOM_COLORS: CustomColors = ["", "", ""];

export const DEFAULT_SETTINGS: Settings = {
  paletteSize: 24,
  customColors: [...EMPTY_CUSTOM_COLORS],
};

export const MAX_ARTWORKS = 15;

const openDb = () =>
  new Promise<IDBDatabase>((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(STORE_ARTWORKS)) {
        db.createObjectStore(STORE_ARTWORKS, { keyPath: "id" });
      }
      if (!db.objectStoreNames.contains(STORE_SETTINGS)) {
        db.createObjectStore(STORE_SETTINGS, { keyPath: "id" });
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });

const requestToPromise = <T>(request: IDBRequest<T>) =>
  new Promise<T>((resolve, reject) => {
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });

const runStore = async <T>(
  storeName: typeof STORE_ARTWORKS | typeof STORE_SETTINGS,
  mode: IDBTransactionMode,
  work: (store: IDBObjectStore) => Promise<T>,
) => {
  const db = await openDb();
  try {
    const tx = db.transaction(storeName, mode);
    const finished = new Promise<void>((resolve, reject) => {
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
      tx.onabort = () => reject(tx.error ?? new Error("交易中止"));
    });
    const result = await work(tx.objectStore(storeName));
    await finished;
    return result;
  } finally {
    db.close();
  }
};

export const getSettings = async (): Promise<Settings> => {
  const row = await runStore(STORE_SETTINGS, "readonly", (store) =>
    requestToPromise(store.get(SETTINGS_ID)),
  );
  if (!row) {
    return DEFAULT_SETTINGS;
  }
  return {
    paletteSize: row.paletteSize ?? DEFAULT_SETTINGS.paletteSize,
    customColors: [
      row.customColors?.[0] ?? "",
      row.customColors?.[1] ?? "",
      row.customColors?.[2] ?? "",
    ],
  };
};

export const saveSettings = async (settings: Settings) => {
  await runStore(STORE_SETTINGS, "readwrite", (store) =>
    requestToPromise(store.put({ id: SETTINGS_ID, ...settings })),
  );
};

export const listArtworks = async (): Promise<Artwork[]> => {
  const rows = await runStore(STORE_ARTWORKS, "readonly", (store) =>
    requestToPromise(store.getAll()),
  );
  return rows.sort((a, b) => b.createdAt - a.createdAt);
};

export const getArtwork = async (id: string): Promise<Artwork | null> => {
  const row = await runStore(STORE_ARTWORKS, "readonly", (store) =>
    requestToPromise(store.get(id)),
  );
  return row ?? null;
};

export const isQuotaError = (error: unknown) =>
  error instanceof DOMException &&
  (error.name === "QuotaExceededError" || error.code === 22);

const evictOldest = async (store: IDBObjectStore, keepId?: string) => {
  const rows = await requestToPromise(store.getAll());
  const others = keepId ? rows.filter((row) => row.id !== keepId) : rows;
  if (others.length === 0) {
    return false;
  }
  const oldest = others.sort((a, b) => a.createdAt - b.createdAt)[0];
  await requestToPromise(store.delete(oldest.id));
  return true;
};

export const saveArtwork = async (artwork: Artwork) => {
  const persist = () =>
    runStore(STORE_ARTWORKS, "readwrite", async (store) => {
      const existing = await requestToPromise(store.get(artwork.id));
      if (!existing) {
        const rows = await requestToPromise(store.getAll());
        const overflow = rows.length + 1 - MAX_ARTWORKS;
        if (overflow > 0) {
          const oldestFirst = [...rows].sort((a, b) => a.createdAt - b.createdAt);
          for (let index = 0; index < overflow; index += 1) {
            await requestToPromise(store.delete(oldestFirst[index].id));
          }
        }
      }
      await requestToPromise(store.put(artwork));
    });

  try {
    await persist();
  } catch (error) {
    if (!isQuotaError(error)) {
      throw error;
    }
    const removed = await runStore(STORE_ARTWORKS, "readwrite", (store) =>
      evictOldest(store, artwork.id),
    );
    if (!removed) {
      throw error;
    }
    await persist();
  }
};

export const deleteArtwork = async (id: string) => {
  await runStore(STORE_ARTWORKS, "readwrite", (store) =>
    requestToPromise(store.delete(id)),
  );
};
