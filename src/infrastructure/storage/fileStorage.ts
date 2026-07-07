/** IndexedDB file storage — swap for Firebase Storage without UI changes. */
export interface StoredFileMeta {
  fileName: string;
  mimeType: string;
  size: number;
  updatedAt: number;
}

export interface IFileStorage {
  save(documentId: string, file: Blob, fileName: string): Promise<void>;
  get(documentId: string): Promise<Blob | null>;
  getMeta(documentId: string): Promise<StoredFileMeta | null>;
  delete(documentId: string): Promise<void>;
  getObjectUrl(documentId: string): Promise<string | null>;
}

export const LOCAL_FILE_PREFIX = 'local://';

export function isLocalFileUrl(url?: string): boolean {
  return !!url?.startsWith(LOCAL_FILE_PREFIX);
}

export function localFileId(url?: string): string | null {
  if (!isLocalFileUrl(url)) return null;
  return url!.slice(LOCAL_FILE_PREFIX.length);
}

const DB_NAME = 'immflow_file_storage';
const DB_VERSION = 1;
const STORE = 'files';

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onerror = () => reject(req.error);
    req.onsuccess = () => resolve(req.result);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(STORE)) {
        db.createObjectStore(STORE, { keyPath: 'id' });
      }
    };
  });
}

class IndexedDbFileStorage implements IFileStorage {
  async save(documentId: string, file: Blob, fileName: string): Promise<void> {
    const db = await openDb();
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(STORE, 'readwrite');
      tx.objectStore(STORE).put({
        id: documentId,
        blob: file,
        meta: { fileName, mimeType: file.type, size: file.size, updatedAt: Date.now() } satisfies StoredFileMeta,
      });
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
    db.close();
  }

  async get(documentId: string): Promise<Blob | null> {
    const db = await openDb();
    const record = await new Promise<{ blob: Blob } | undefined>((resolve, reject) => {
      const tx = db.transaction(STORE, 'readonly');
      const req = tx.objectStore(STORE).get(documentId);
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(req.error);
    });
    db.close();
    return record?.blob ?? null;
  }

  async getMeta(documentId: string): Promise<StoredFileMeta | null> {
    const db = await openDb();
    const record = await new Promise<{ meta: StoredFileMeta } | undefined>((resolve, reject) => {
      const tx = db.transaction(STORE, 'readonly');
      const req = tx.objectStore(STORE).get(documentId);
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(req.error);
    });
    db.close();
    return record?.meta ?? null;
  }

  async delete(documentId: string): Promise<void> {
    const db = await openDb();
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(STORE, 'readwrite');
      tx.objectStore(STORE).delete(documentId);
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
    db.close();
  }

  async getObjectUrl(documentId: string): Promise<string | null> {
    const blob = await this.get(documentId);
    return blob ? URL.createObjectURL(blob) : null;
  }
}

export const fileStorage: IFileStorage = new IndexedDbFileStorage();

export async function downloadDocumentFile(documentId: string, fileName: string, url?: string): Promise<void> {
  let blob: Blob | null = null;
  const localId = localFileId(url) ?? documentId;
  blob = await fileStorage.get(localId);
  if (!blob && url && !isLocalFileUrl(url)) {
    const res = await fetch(url);
    blob = await res.blob();
  }
  if (!blob) throw new Error('File not found');
  const objectUrl = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = objectUrl;
  a.download = fileName;
  a.click();
  URL.revokeObjectURL(objectUrl);
}
