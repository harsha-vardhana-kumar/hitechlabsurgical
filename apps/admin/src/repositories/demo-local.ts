import type {
  AdminCommand,
  AdminWorkspace,
  Session,
  MediaAsset,
} from "@hitech/types/admin";
import {
  invariant,
  validateUpload,
  validateUploadBytes,
} from "@hitech/validation";
import { uniqueId } from "@hitech/utils";
import { demoWorkspace } from "../data/demo";
import { execute } from "../services/commands";
import { authorize } from "../domain/permissions";
import { validateSnapshot } from "./snapshot";
import { RepositoryQueries } from "./base";
import type { WorkspaceRepository } from "./contracts";
const DB = "hitech-admin-demo-v1",
  STORE = "workspace",
  BLOBS = "media",
  KEY = "current";
export class DemoLocalAdapter
  extends RepositoryQueries
  implements WorkspaceRepository
{
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
      request.onupgradeneeded = () => {
        request.result.createObjectStore(STORE);
        request.result.createObjectStore(BLOBS);
      };
      request.onerror = () => {
        this.connection = undefined;
        reject(
          new Error(
            "Could not open demo storage. Your existing records have not been erased.",
          ),
        );
      };
      request.onblocked = () => {
        this.connection = undefined;
        reject(
          new Error("Close other admin tabs and retry the storage upgrade."),
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
    return (await this.transact(() => "", false)).workspace;
  }
  private async transact(
    command: (w: AdminWorkspace, blobs: IDBObjectStore) => string,
    mutate = true,
  ) {
    const db = await this.open();
    return new Promise<{ workspace: AdminWorkspace; id: string }>(
      (resolve, reject) => {
        const tx = db.transaction([STORE, BLOBS], "readwrite"),
          store = tx.objectStore(STORE),
          r = store.get(KEY);
        let workspace: AdminWorkspace,
          id = "",
          error: unknown;
        r.onsuccess = () => {
          try {
            workspace = validateSnapshot(r.result || demoWorkspace());
            id = command(workspace, tx.objectStore(BLOBS));
            if (mutate) workspace.revision++;
            validateSnapshot(workspace);
            if (mutate || !r.result) store.put(workspace, KEY);
          } catch (e) {
            error = e;
            tx.abort();
          }
        };
        tx.oncomplete = () => {
          if (mutate) this.channel?.postMessage("changed");
          resolve({ workspace: structuredClone(workspace), id });
        };
        tx.onerror = tx.onabort = () =>
          reject(
            error ||
              new Error(
                "Could not save the workspace. Previous data is unchanged. Browser storage may be full.",
              ),
          );
      },
    );
  }
  dispatch(c: AdminCommand, s: Session) {
    return this.transact((w, blobs) => {
      const id = execute(w, s, c);
      if (c.type === "media.delete") blobs.delete(c.id);
      return id;
    });
  }
  async readBlob(id: string) {
    const db = await this.open();
    return new Promise<Blob | undefined>((resolve, reject) => {
      const r = db.transaction(BLOBS, "readonly").objectStore(BLOBS).get(id);
      r.onsuccess = () => resolve(r.result);
      r.onerror = () => reject(new Error("The saved image could not be read."));
    });
  }
  async upload(file: File, alt: string, s: Session) {
    authorize(s, "media.manage");
    validateUpload(file);
    invariant(
      alt.trim() && alt.length <= 300,
      "Provide image alt text, up to 300 characters.",
    );
    const bytes = new Uint8Array(await file.arrayBuffer());
    validateUploadBytes(bytes, file.type);
    const bitmap = await createImageBitmap(file).catch(() => {
      throw new Error("The image could not be decoded. Choose a valid image.");
    });
    const width = bitmap.width,
      height = bitmap.height;
    bitmap.close();
    validateUpload(file, { width, height });
    const id = uniqueId("media"),
      now = new Date().toISOString();
    const media: MediaAsset = {
      id,
      fileName: file.name,
      alt: alt.trim(),
      caption: "",
      type: "image",
      mime: file.type,
      bytes: file.size,
      width,
      height,
      source: "demo-upload",
      storageKey: `demo/${id}`,
      url: `demo-media:${id}`,
      uploadedAt: now,
    };
    return (
      await this.transact((w, blobs) => {
        blobs.put(file, id);
        w.media.push(media);
        w.activity.unshift({
          id: uniqueId("activity"),
          actor: s.name,
          actorId: s.id,
          action: "media.upload",
          entity: "Media",
          entityId: id,
          timestamp: now,
          metadata: { mime: file.type, bytes: file.size },
        });
        return id;
      })
    ).workspace;
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
