// Sample sources: "lib:<file>" = bundled in public/samples (internal, factory pads only — never listed in the library browser), "db:<key>" = user audio cached in IndexedDB.

export type SampleRef = { id: string; name: string };

const DB = "nadrisk.samples", STORE = "blobs";
const open = () => new Promise<IDBDatabase>((res, rej) => {
  const r = indexedDB.open(DB, 1);
  r.onupgradeneeded = () => r.result.createObjectStore(STORE);
  r.onsuccess = () => res(r.result); r.onerror = () => rej(r.error);
});
const tx = async <T,>(mode: IDBTransactionMode, fn: (s: IDBObjectStore) => IDBRequest<T>) => {
  const db = await open();
  return new Promise<T>((res, rej) => { const q = fn(db.transaction(STORE, mode).objectStore(STORE)); q.onsuccess = () => res(q.result); q.onerror = () => rej(q.error); });
};

export const cacheId = (f: { name: string; size: number }) => `db:${f.name}-${f.size}`;
export const putSample = async (id: string, name: string, blob: Blob) => { await tx("readwrite", s => s.put({ name, blob }, id)); return id; };
export const cacheFile = (f: File) => putSample(cacheId(f), f.name, f);
export const listCached = async (): Promise<SampleRef[]> => {
  const keys = (await tx("readonly", s => s.getAllKeys())) as string[];
  return keys.map(id => ({ id, name: id.slice(3).replace(/-\d+$/, "") }));
};
export const deleteCached = (id: string) => tx("readwrite", s => s.delete(id));

export async function getSampleBlob(id: string): Promise<Blob | null> {
  if (id.startsWith("lib:")) { const r = await fetch(`/samples/${id.slice(4)}.wav`); return r.ok ? r.blob() : null; }
  if (id.startsWith("db:")) { const v = (await tx("readonly", s => s.get(id))) as { blob: Blob } | undefined; return v?.blob ?? null; }
  return null;
}

const toB64 = async (b: Blob) => { const u = new Uint8Array(await b.arrayBuffer()); let s = ""; for (let i = 0; i < u.length; i += 0x8000) s += String.fromCharCode(...u.subarray(i, i + 0x8000)); return btoa(s); };
const fromB64 = (s: string, type: string) => { const bin = atob(s), u = new Uint8Array(bin.length); for (let i = 0; i < bin.length; i++) u[i] = bin.charCodeAt(i); return new Blob([u], { type }); };

// Bundles embed cached user audio so a set file restores everything on another device.
export async function packSamples(ids: string[]) {
  const out: Record<string, { name: string; type: string; data: string }> = {};
  for (const id of new Set(ids)) { if (!id.startsWith("db:")) continue; const b = await getSampleBlob(id); if (b) out[id] = { name: id.slice(3), type: b.type || "audio/wav", data: await toB64(b) }; }
  return out;
}
export async function unpackSamples(m: Record<string, { name: string; type: string; data: string }> = {}) {
  for (const [id, v] of Object.entries(m)) await putSample(id, v.name, fromB64(v.data, v.type));
}
