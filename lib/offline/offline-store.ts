/**
 * Nexus.talks — Persistent Offline Message Store (IndexedDB)
 * POWERED BY AASIF
 *
 * Provides resilient, durable offline message persistence across page refreshes,
 * browser restarts, and temporary network dropouts.
 * 
 * Strict invariants:
 * - Scoped per user and per conversation (no cross-user/conversation data leakage).
 * - FIFO ordering guaranteed by chronological ISO timestamp sorting.
 * - Deduplication via unique tempId primary key.
 * - In-memory fallback if IndexedDB is blocked or unavailable in the environment.
 */

export interface QueuedOfflineMessage {
  id: string; // Unique collision-proof tempId (temp_${Date.now()}_${nonce})
  userId: string;
  conversationId: string;
  content: string;
  replyToId: string | null;
  replyTo?: {
    id: string;
    content: string;
    sender_id: string;
    sender_name: string;
  } | null;
  createdAt: string;
  status: 'sending' | 'failed';
  failedError?: string;
  retryCount: number;
}

const DB_NAME = 'nexus_talks_offline_v1';
const DB_VERSION = 1;
const STORE_NAME = 'offline_queue';

// In-memory fallback in case IndexedDB is restricted (e.g. private mode, test env, iframe constraints)
const memoryStore = new Map<string, QueuedOfflineMessage>();

function isIndexedDBAvailable(): boolean {
  try {
    return typeof window !== 'undefined' && 'indexedDB' in window && window.indexedDB !== null;
  } catch {
    return false;
  }
}

function openDatabase(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (!isIndexedDBAvailable()) {
      return reject(new Error('IndexedDB is not available'));
    }

    try {
      const request = window.indexedDB.open(DB_NAME, DB_VERSION);

      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;
        if (!db.objectStoreNames.contains(STORE_NAME)) {
          const store = db.createObjectStore(STORE_NAME, { keyPath: 'id' });
          store.createIndex('user_id', 'userId', { unique: false });
          store.createIndex('conversation_id', 'conversationId', { unique: false });
          store.createIndex('user_conv', ['userId', 'conversationId'], { unique: false });
          store.createIndex('created_at', 'createdAt', { unique: false });
        }
      };

      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error || new Error('Failed to open IndexedDB'));
      request.onblocked = () => reject(new Error('IndexedDB open request was blocked'));
    } catch (err) {
      reject(err);
    }
  });
}

/**
 * Retrieve all queued offline messages for a specific user and conversation,
 * strictly sorted in chronological FIFO order (oldest first).
 */
export async function getQueuedMessages(
  userId: string,
  conversationId: string
): Promise<QueuedOfflineMessage[]> {
  if (!userId || !conversationId) return [];

  if (!isIndexedDBAvailable()) {
    return Array.from(memoryStore.values())
      .filter((m) => m.userId === userId && m.conversationId === conversationId)
      .sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
  }

  try {
    const db = await openDatabase();
    return new Promise((resolve) => {
      const transaction = db.transaction(STORE_NAME, 'readonly');
      const store = transaction.objectStore(STORE_NAME);
      const request = store.getAll();

      request.onsuccess = () => {
        const all: QueuedOfflineMessage[] = request.result || [];
        const filtered = all
          .filter((m) => m.userId === userId && m.conversationId === conversationId)
          .sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
        resolve(filtered);
      };

      request.onerror = () => {
        // Fallback to memory on transaction error
        const fallback = Array.from(memoryStore.values())
          .filter((m) => m.userId === userId && m.conversationId === conversationId)
          .sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
        resolve(fallback);
      };
    });
  } catch {
    return Array.from(memoryStore.values())
      .filter((m) => m.userId === userId && m.conversationId === conversationId)
      .sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
  }
}

/**
 * Persist a new message into the offline queue.
 */
export async function enqueueOfflineMessage(msg: QueuedOfflineMessage): Promise<void> {
  memoryStore.set(msg.id, msg);

  if (!isIndexedDBAvailable()) return;

  try {
    const db = await openDatabase();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(STORE_NAME, 'readwrite');
      const store = transaction.objectStore(STORE_NAME);
      const request = store.put(msg);

      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error || new Error('Failed to enqueue message'));
    });
  } catch {
    // Memory store already retained the message
  }
}

/**
 * Update an existing queued offline message (e.g. mark failed, increment retryCount).
 */
export async function updateOfflineMessage(
  id: string,
  updates: Partial<QueuedOfflineMessage>
): Promise<void> {
  const existingMemory = memoryStore.get(id);
  if (existingMemory) {
    memoryStore.set(id, { ...existingMemory, ...updates });
  }

  if (!isIndexedDBAvailable()) return;

  try {
    const db = await openDatabase();
    return new Promise((resolve) => {
      const transaction = db.transaction(STORE_NAME, 'readwrite');
      const store = transaction.objectStore(STORE_NAME);
      const getReq = store.get(id);

      getReq.onsuccess = () => {
        const item: QueuedOfflineMessage | undefined = getReq.result;
        if (item) {
          store.put({ ...item, ...updates });
        }
        resolve();
      };
      getReq.onerror = () => resolve();
    });
  } catch {
    // Safe fallback
  }
}

/**
 * Remove an offline message upon successful server acknowledgement.
 */
export async function removeOfflineMessage(id: string): Promise<void> {
  memoryStore.delete(id);

  if (!isIndexedDBAvailable()) return;

  try {
    const db = await openDatabase();
    return new Promise((resolve) => {
      const transaction = db.transaction(STORE_NAME, 'readwrite');
      const store = transaction.objectStore(STORE_NAME);
      const request = store.delete(id);

      request.onsuccess = () => resolve();
      request.onerror = () => resolve();
    });
  } catch {
    // Safe fallback
  }
}

/**
 * Wipe all queued messages for a given user (called upon user logout or account switch).
 */
export async function clearUserOfflineQueue(userId: string): Promise<void> {
  for (const [id, msg] of memoryStore.entries()) {
    if (msg.userId === userId) {
      memoryStore.delete(id);
    }
  }

  if (!isIndexedDBAvailable()) return;

  try {
    const db = await openDatabase();
    return new Promise((resolve) => {
      const transaction = db.transaction(STORE_NAME, 'readwrite');
      const store = transaction.objectStore(STORE_NAME);
      const request = store.getAll();

      request.onsuccess = () => {
        const all: QueuedOfflineMessage[] = request.result || [];
        for (const item of all) {
          if (item.userId === userId) {
            store.delete(item.id);
          }
        }
        resolve();
      };
      request.onerror = () => resolve();
    });
  } catch {
    // Safe fallback
  }
}
