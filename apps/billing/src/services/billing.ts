import type { WorkspaceRepository } from '../repositories/workspace';
import type { AuthAdapter } from '../domain/permissions';
import type { Session, Workspace } from '../domain/types';
export class BillingService {
  constructor(private readonly repository: WorkspaceRepository, private readonly auth: AuthAdapter) {}
  async load() { const [workspace, session] = await Promise.all([this.repository.load(), this.auth.getSession()]); return { workspace, session }; }
  async execute<T>(command: (workspace: Workspace, session: Session) => T) { const session = await this.auth.getSession(); return this.repository.transact(w => command(w, session)); }
  subscribe(listener: () => void) { return this.repository.subscribe(listener); }
}
