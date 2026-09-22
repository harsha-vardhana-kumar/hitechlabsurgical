import type { Permission, Session, UserRole } from "./types";
const grants: Record<UserRole, Permission[]> = {
  Owner: [
    "view",
    "documents.create",
    "documents.edit",
    "documents.finalize",
    "payments.record",
    "inventory.manage",
    "reports.view",
    "settings.manage",
    "parties.manage",
  ],
  Admin: [
    "view",
    "documents.create",
    "documents.edit",
    "documents.finalize",
    "payments.record",
    "inventory.manage",
    "reports.view",
    "settings.manage",
    "parties.manage",
  ],
  Accounts: [
    "view",
    "documents.create",
    "documents.edit",
    "documents.finalize",
    "payments.record",
    "reports.view",
    "parties.manage",
  ],
  Sales: ["view", "documents.create", "documents.edit", "parties.manage"],
  Viewer: ["view", "reports.view"],
};
export function authorize(session: Session, permission: Permission) {
  if (!grants[session.role].includes(permission))
    throw new Error("This role cannot perform that action.");
}
export interface AuthAdapter {
  getSession(): Promise<Session>;
}
// Demo access is not a security boundary. Production authorization belongs on the server.
export class DemoAuthAdapter implements AuthAdapter {
  async getSession(): Promise<Session> {
    return { id: "demo-admin", name: "Demo Admin", role: "Admin", demo: true };
  }
}
