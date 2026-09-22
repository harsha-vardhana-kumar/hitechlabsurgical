import type { Workspace } from "../domain/types";
import { demoWorkspace } from "../data/demo";
export interface WorkspaceRepository {
  load(): Promise<Workspace>;
  transact<T>(
    command: (workspace: Workspace) => T,
  ): Promise<{ workspace: Workspace; result: T }>;
  subscribe(listener: () => void): () => void;
}
const DB = "hitech-billing-demo-v1",
  STORE = "workspace",
  KEY = "current";
function validate(value: Workspace) {
  if (
    value.version !== 1 ||
    ![
      "parties",
      "products",
      "batches",
      "documents",
      "payments",
      "expenses",
      "movements",
      "audit",
    ].every((k) => Array.isArray(value[k as keyof Workspace]))
  )
    throw new Error(
      "This workspace format cannot be opened. Export or restore from a supported version; your data has not been erased.",
    );
  return value;
}
export class DemoLocalAdapter implements WorkspaceRepository {
  private connection?: Promise<IDBDatabase>;
  private channel?: BroadcastChannel;
  private listeners = new Set<() => void>();
  private open() {
    return (this.connection ||= new Promise<IDBDatabase>((resolve, reject) => {
      if (!globalThis.indexedDB) {
        reject(
          new Error(
            "Browser storage is unavailable. Allow storage for this site and retry.",
          ),
        );
        return;
      }
      const request = indexedDB.open(DB, 1);
      request.onupgradeneeded = () => request.result.createObjectStore(STORE);
      request.onerror = () => {
        this.connection = undefined;
        reject(request.error);
      };
      request.onblocked = () => {
        this.connection = undefined;
        reject(
          new Error("Close other billing tabs and retry the storage upgrade."),
        );
      };
      request.onsuccess = () => {
        request.result.onversionchange = () => {
          request.result.close();
          this.connection = undefined;
        };
        resolve(request.result);
      };
    }));
  }
  async load() {
    const db = await this.open();
    const existing = await new Promise<Workspace | undefined>(
      (resolve, reject) => {
        const tx = db.transaction(STORE, "readonly"),
          r = tx.objectStore(STORE).get(KEY);
        r.onsuccess = () => resolve(r.result);
        r.onerror = () => reject(r.error);
      },
    );
    if (existing) return validate(existing);
    return (await this.transact(() => undefined)).workspace;
  }
  async transact<T>(command: (workspace: Workspace) => T) {
    const db = await this.open();
    return new Promise<{ workspace: Workspace; result: T }>(
      (resolve, reject) => {
        const tx = db.transaction(STORE, "readwrite"),
          store = tx.objectStore(STORE),
          r = store.get(KEY);
        let workspace: Workspace, result: T, error: unknown;
        r.onsuccess = () => {
          try {
            workspace = validate(r.result || demoWorkspace());
            result = command(workspace);
            if (result instanceof Promise)
              throw new Error(
                "Repository commands must be synchronous to preserve transaction atomicity.",
              );
            workspace.revision++;
            store.put(workspace, KEY);
          } catch (e) {
            error = e;
            tx.abort();
          }
        };
        tx.oncomplete = () => {
          this.channel?.postMessage("changed");
          resolve({ workspace: structuredClone(workspace), result });
        };
        tx.onabort = tx.onerror = () =>
          reject(
            error ||
              tx.error ||
              new Error(
                "Could not save. Your previous workspace is unchanged.",
              ),
          );
      },
    );
  }
  subscribe(listener: () => void) {
    this.listeners.add(listener);
    if (!this.channel && typeof BroadcastChannel !== "undefined") {
      this.channel = new BroadcastChannel(DB);
      this.channel.onmessage = () => this.listeners.forEach((fn) => fn());
    }
    return () => {
      this.listeners.delete(listener);
      if (!this.listeners.size) {
        this.channel?.close();
        this.channel = undefined;
      }
    };
  }
}
