import { Playlist } from './types';

const DB_NAME = 'GigFlowDB';
const DB_VERSION = 1;
const STORE_NAME = 'state';

export const initDB = (): Promise<IDBDatabase> => {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    
    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve(request.result);
    
    request.onupgradeneeded = (e) => {
      const db = (e.target as IDBOpenDBRequest).result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME);
      }
    };
  });
};

export const savePlaylistsToDB = async (playlists: Playlist[]) => {
  const db = await initDB();
  return new Promise<void>((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readwrite');
    const store = tx.objectStore(STORE_NAME);
    const request = store.put(playlists, 'playlists');
    
    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
  });
};

export const getPlaylistsFromDB = async (): Promise<Playlist[] | null> => {
  const db = await initDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readonly');
    const store = tx.objectStore(STORE_NAME);
    const req = store.get('playlists');
    
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
};