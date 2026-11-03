import type { Permission, Role, Session } from "@hitech/types/admin";
import { invariant } from "@hitech/validation";
export const roles: Role[] = [
  "Owner",
  "Admin",
  "Content Manager",
  "Sales",
  "Viewer",
];
export const permissions: Permission[] = [
  "dashboard.view",
  "products.manage",
  "products.publish",
  "categories.manage",
  "media.manage",
  "enquiries.manage",
  "seo.manage",
  "content.manage",
  "settings.manage",
  "users.manage",
  "activity.view",
];
export const rolePermissions: Record<Role, readonly Permission[]> = {
  Owner: permissions,
  Admin: permissions.filter((p) => p !== "users.manage"),
  "Content Manager": [
    "dashboard.view",
    "products.manage",
    "categories.manage",
    "media.manage",
    "seo.manage",
    "content.manage",
    "activity.view",
  ],
  Sales: ["dashboard.view", "enquiries.manage"],
  Viewer: ["dashboard.view"],
};
export function can(session: Session, permission: Permission) {
  return !!rolePermissions[session.role]?.includes(permission);
}
export function authorize(session: Session, permission: Permission) {
  invariant(
    session.id && can(session, permission),
    `Permission denied: ${permission}.`,
  );
}
