export type StoredAiAction = {
  type: "navigate";
  label: string;
  destination: {
    platform: "organizer" | "brand" | "club";
    route: string;
    url: string;
    key?: string;
    deep_link_path?: string;
  };
};

export type StoredAiMessage = {
  id: string;
  role: "user" | "assistant";
  content: string;
  actions?: StoredAiAction[];
};

type ConversationRecord = {
  id: string;
  kind: "conversation";
  contextKey: string;
  threadId: string;
  messages: StoredAiMessage[];
  updatedAt: number;
};

type ActiveThreadRecord = {
  id: string;
  kind: "active-thread";
  threadId: string;
};

const DB_NAME = "repeak-hub-ai";
const STORE_NAME = "conversations";
const DB_VERSION = 1;
const MAX_MESSAGES = 20;

function openDatabase(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onupgradeneeded = () => {
      if (!request.result.objectStoreNames.contains(STORE_NAME)) {
        request.result.createObjectStore(STORE_NAME, { keyPath: "id" });
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(new Error("AI_STORAGE_UNAVAILABLE"));
  });
}

async function readRecord<T>(id: string): Promise<T | null> {
  const database = await openDatabase();
  return new Promise((resolve, reject) => {
    const transaction = database.transaction(STORE_NAME, "readonly");
    const request = transaction.objectStore(STORE_NAME).get(id);
    request.onsuccess = () => resolve((request.result as T | undefined) ?? null);
    request.onerror = () => reject(new Error("AI_STORAGE_READ_FAILED"));
    transaction.oncomplete = () => database.close();
  });
}

async function writeRecord(record: ConversationRecord | ActiveThreadRecord) {
  const database = await openDatabase();
  return new Promise<void>((resolve, reject) => {
    const transaction = database.transaction(STORE_NAME, "readwrite");
    transaction.objectStore(STORE_NAME).put(record);
    transaction.oncomplete = () => {
      database.close();
      resolve();
    };
    transaction.onerror = () => {
      database.close();
      reject(new Error("AI_STORAGE_WRITE_FAILED"));
    };
  });
}

const activeId = (contextKey: string) => `active:${contextKey}`;
const conversationId = (contextKey: string, threadId: string) =>
  `conversation:${contextKey}:${threadId}`;

export async function loadAiConversation(contextKey: string): Promise<{
  threadId: string | null;
  messages: StoredAiMessage[];
}> {
  if (typeof indexedDB === "undefined") return { threadId: null, messages: [] };
  try {
    const active = await readRecord<ActiveThreadRecord>(activeId(contextKey));
    if (!active?.threadId) return { threadId: null, messages: [] };
    const conversation = await readRecord<ConversationRecord>(
      conversationId(contextKey, active.threadId),
    );
    return {
      threadId: active.threadId,
      messages: conversation?.messages.slice(-MAX_MESSAGES) ?? [],
    };
  } catch {
    return { threadId: null, messages: [] };
  }
}

export async function saveAiConversation(
  contextKey: string,
  threadId: string,
  messages: StoredAiMessage[],
): Promise<void> {
  if (typeof indexedDB === "undefined") return;
  const safeMessages = messages.slice(-MAX_MESSAGES).map((message) => ({
    id: message.id,
    role: message.role,
    content: message.content,
    ...(message.role === "assistant" && message.actions
      ? { actions: message.actions.slice(0, 20) }
      : {}),
  }));
  try {
    await writeRecord({
      id: conversationId(contextKey, threadId),
      kind: "conversation",
      contextKey,
      threadId,
      messages: safeMessages,
      updatedAt: Date.now(),
    });
    await writeRecord({
      id: activeId(contextKey),
      kind: "active-thread",
      threadId,
    });
  } catch {
    // Chat remains usable when IndexedDB is unavailable (for example, in
    // hardened/private browser modes). Never log message content.
  }
}

export async function setActiveAiThread(
  contextKey: string,
  threadId: string,
): Promise<void> {
  if (typeof indexedDB === "undefined") return;
  try {
    await writeRecord({
      id: activeId(contextKey),
      kind: "active-thread",
      threadId,
    });
  } catch {
    // Non-fatal: the in-memory conversation remains available.
  }
}
