const DB_NAME = 'mars';
const DB_VERSION = 1;
const STORE = 'saves';

function openDb() {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(STORE)) {
        db.createObjectStore(STORE, { keyPath: 'id' });
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

export async function compressJson(text) {
  const stream = new Blob([text]).stream().pipeThrough(new CompressionStream('gzip'));
  return new Uint8Array(await new Response(stream).arrayBuffer());
}

export async function decompressJson(bytes) {
  const stream = new Blob([bytes]).stream().pipeThrough(new DecompressionStream('gzip'));
  return await new Response(stream).text();
}

export async function saveGame(slotId, state) {
  const json = JSON.stringify(state);
  const compressed = await compressJson(json);
  const record = {
    id: slotId,
    savedAt: Date.now(),
    version: state.meta?.version ?? '1.0.0',
    seed: state.meta?.seed ?? 0,
    earthDay: state.clock?.earthDay ?? 0,
    sol: state.clock?.sol ?? 0,
    tickCount: state.clock?.tickCount ?? 0,
    bytes: compressed.byteLength,
    blob: compressed,
  };
  const db = await openDb();
  await new Promise((resolve, reject) => {
    const tx = db.transaction(STORE, 'readwrite');
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
    tx.objectStore(STORE).put(record);
  });
  db.close();
  return { id: slotId, bytes: record.bytes, savedAt: record.savedAt };
}

export async function loadGame(slotId) {
  const db = await openDb();
  const record = await new Promise((resolve, reject) => {
    const tx = db.transaction(STORE, 'readonly');
    const req = tx.objectStore(STORE).get(slotId);
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
  db.close();
  if (!record) throw new Error(`No save in slot "${slotId}"`);
  const text = await decompressJson(record.blob);
  return JSON.parse(text);
}

export async function listSaves() {
  const db = await openDb();
  const rows = await new Promise((resolve, reject) => {
    const tx = db.transaction(STORE, 'readonly');
    const req = tx.objectStore(STORE).getAll();
    req.onsuccess = () => resolve(req.result ?? []);
    req.onerror = () => reject(req.error);
  });
  db.close();
  return rows
    .map((r) => ({
      id: r.id,
      savedAt: r.savedAt,
      version: r.version,
      seed: r.seed,
      earthDay: r.earthDay,
      sol: r.sol,
      tickCount: r.tickCount,
      bytes: r.bytes,
    }))
    .sort((a, b) => b.savedAt - a.savedAt);
}

export async function deleteSave(slotId) {
  const db = await openDb();
  await new Promise((resolve, reject) => {
    const tx = db.transaction(STORE, 'readwrite');
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
    tx.objectStore(STORE).delete(slotId);
  });
  db.close();
}
