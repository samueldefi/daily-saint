import { defaultSettings, type Photo, type Quote, type Settings } from "./types";

const DB_NAME = "daily-saint";
const DB_VERSION = 1;

export type PhotoRecord = Photo & { blob: Blob };
export type FontRecord = { slot: "quote" | "author"; name: string; blob: Blob };

function asPromise<T>(request: IDBRequest<T>): Promise<T> {
  return new Promise((resolve, reject) => {
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains("kv")) db.createObjectStore("kv");
      if (!db.objectStoreNames.contains("photos")) {
        db.createObjectStore("photos", { keyPath: "id" });
      }
      if (!db.objectStoreNames.contains("fonts")) {
        db.createObjectStore("fonts", { keyPath: "slot" });
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

async function getKv<T>(key: string, fallback: T): Promise<T> {
  const db = await openDb();
  const value = await asPromise(db.transaction("kv").objectStore("kv").get(key));
  return (value as T | undefined) ?? fallback;
}

async function setKv<T>(key: string, value: T): Promise<void> {
  const db = await openDb();
  await asPromise(db.transaction("kv", "readwrite").objectStore("kv").put(value, key));
}

export async function loadLocalQuotes(): Promise<Quote[]> {
  return getKv<Quote[]>("quotes", []);
}

export async function saveLocalQuotes(quotes: Quote[]): Promise<void> {
  await setKv("quotes", quotes);
}

export async function loadSettings(): Promise<Settings> {
  return { ...defaultSettings(), ...(await getKv<Partial<Settings>>("settings", {})) };
}

export async function saveSettingsRecord(settings: Settings): Promise<void> {
  await setKv("settings", settings);
}

export async function loadPhotos(): Promise<PhotoRecord[]> {
  const db = await openDb();
  const rows = await asPromise(db.transaction("photos").objectStore("photos").getAll());
  return (rows as PhotoRecord[]).sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1));
}

export async function putPhoto(photo: PhotoRecord): Promise<void> {
  const db = await openDb();
  await asPromise(db.transaction("photos", "readwrite").objectStore("photos").put(photo));
}

export async function removePhoto(id: string): Promise<void> {
  const db = await openDb();
  await asPromise(db.transaction("photos", "readwrite").objectStore("photos").delete(id));
}

export async function loadFont(slot: "quote" | "author"): Promise<FontRecord | null> {
  const db = await openDb();
  const row = await asPromise(db.transaction("fonts").objectStore("fonts").get(slot));
  return (row as FontRecord | undefined) ?? null;
}

export async function putFont(record: FontRecord): Promise<void> {
  const db = await openDb();
  await asPromise(db.transaction("fonts", "readwrite").objectStore("fonts").put(record));
}

export async function removeFont(slot: "quote" | "author"): Promise<void> {
  const db = await openDb();
  await asPromise(db.transaction("fonts", "readwrite").objectStore("fonts").delete(slot));
}
