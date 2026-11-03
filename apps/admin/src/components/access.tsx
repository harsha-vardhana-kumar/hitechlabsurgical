"use client";
import type { Permission } from "@hitech/types/admin";
import { ShieldCheck } from "lucide-react";
import { useWorkspace } from "./provider";
export function Access({
  permission,
  children,
}: {
  permission: Permission;
  children: React.ReactNode;
}) {
  const { allowed, session } = useWorkspace();
  return allowed(permission) ? (
    children
  ) : (
    <div className="empty">
      <ShieldCheck size={32} />
      <h1>Permission required</h1>
      <p>Your {session.role} demo role cannot access this section.</p>
      <p>Use the user menu to explore another demo role.</p>
    </div>
  );
}
