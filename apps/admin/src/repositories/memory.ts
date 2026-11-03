import type {
  AdminCommand,
  AdminWorkspace,
  Session,
} from "@hitech/types/admin";
import { execute } from "../services/commands";
import { validateSnapshot } from "./snapshot";
import { RepositoryQueries } from "./base";
/** Deterministic test adapter; rollback matches IndexedDB read/write transactions. */
export class MemoryAdapter extends RepositoryQueries {
  private state: AdminWorkspace;
  constructor(seed: AdminWorkspace) {
    super();
    this.state = structuredClone(validateSnapshot(seed));
  }
  async load() {
    return structuredClone(this.state);
  }
  async dispatch(c: AdminCommand, s: Session) {
    const next = structuredClone(this.state);
    const id = execute(next, s, c);
    validateSnapshot(next);
    next.revision++;
    this.state = next;
    return { workspace: await this.load(), id };
  }
}
