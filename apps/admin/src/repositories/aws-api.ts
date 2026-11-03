import type {
  AdminCommand,
  AdminWorkspace,
  Session,
} from "@hitech/types/admin";
import { invariant, safeUrl, validateUpload } from "@hitech/validation";
import { RepositoryQueries } from "./base";
import type { WorkspaceRepository } from "./contracts";
/** Integration adapter, deliberately not selected by the demo runtime. No browser AWS credentials. */
export class AwsApiAdapter
  extends RepositoryQueries
  implements WorkspaceRepository
{
  constructor(
    private readonly baseUrl: string,
    private readonly accessToken: () => Promise<string>,
    private readonly http: typeof fetch,
  ) {
    super();
    invariant(safeUrl(baseUrl), "The API URL must use HTTPS.");
  }
  private async request<T>(path: string, body?: unknown): Promise<T> {
    const token = await this.accessToken();
    invariant(token, "Sign in before accessing the admin API.");
    const response = await this.http(
      `${this.baseUrl.replace(/\/$/, "")}${path}`,
      {
        method: body ? "POST" : "GET",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        ...(body ? { body: JSON.stringify(body) } : {}),
        cache: "no-store",
        credentials: "omit",
      },
    );
    if (!response.ok)
      throw new Error(
        response.status === 409
          ? "This record changed. Reload before saving."
          : response.status === 401
            ? "Your session expired. Sign in again."
            : response.status === 403
              ? "Permission denied."
              : "The admin API could not complete this request.",
      );
    return response.json() as Promise<T>;
  }
  async load() {
    const w = await this.request<AdminWorkspace>("/workspace");
    invariant(
      w.schemaVersion === 1 && w.environment === "production",
      "The API returned an incompatible workspace. Demo data cannot be loaded as production data.",
    );
    return w;
  }
  async dispatch(command: AdminCommand, _session: Session) {
    void _session;
    const { id } = await this.request<{ id: string }>("/commands", { command });
    return { id, workspace: await this.load() };
  }
  async readBlob() {
    return undefined;
  }
  async upload(file: File, alt: string, _session: Session) {
    void _session;
    validateUpload(file);
    const intent = await this.request<{ uploadUrl: string; uploadId: string }>(
      "/media/upload-intents",
      { fileName: file.name, mime: file.type, bytes: file.size, alt },
    );
    invariant(safeUrl(intent.uploadUrl), "Invalid storage upload URL.");
    const response = await this.http(intent.uploadUrl, {
      method: "PUT",
      body: file,
      headers: { "Content-Type": file.type },
      credentials: "omit",
    });
    invariant(response.ok, "Upload failed. Retry the image upload.");
    // Backend must decode, scan/re-encode, check dimensions/type/size and authorize ownership before finalization.
    await this.request("/media/finalize", { uploadId: intent.uploadId });
    return this.load();
  }
  subscribe() {
    return () => {};
  }
}
