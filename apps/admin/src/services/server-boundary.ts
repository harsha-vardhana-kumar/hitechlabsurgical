import type {
  AdminCommand,
  AdminWorkspace,
  Session,
} from "@hitech/types/admin";
import { ValidationError } from "@hitech/validation";
import { execute } from "./commands";
export interface VerifiedIdentityProvider {
  verifyAccessToken(token: string): Promise<Session>;
}
export interface TransactionStore {
  transaction<T>(fn: (w: AdminWorkspace) => T): Promise<T>;
}
/** Portable Lambda/API handler seam. Never deploy with a demo identity provider or browser repository. */
export async function handleAdminCommand(
  input: { token: string; body: string },
  deps: { identity: VerifiedIdentityProvider; store: TransactionStore },
) {
  try {
    const session = await deps.identity.verifyAccessToken(input.token);
    if (session.demo)
      return {
        status: 403,
        body: {
          message: "Demo identities are not accepted by the production API.",
        },
      };
    if (input.body.length > 512000)
      return { status: 413, body: { message: "Request is too large." } };
    const { command } = JSON.parse(input.body) as { command: AdminCommand };
    const id = await deps.store.transaction((w) => {
      if (w.environment !== "production")
        throw new Error("Production store required.");
      const id = execute(w, session, command);
      w.revision++;
      return id;
    });
    return { status: 200, body: { id } };
  } catch (e) {
    if (e instanceof ValidationError)
      return {
        status: e.message.startsWith("Permission denied")
          ? 403
          : e.message.includes("another tab")
            ? 409
            : 422,
        body: { message: e.message },
      };
    return {
      status: 400,
      body: { message: "The request could not be completed." },
    };
  }
}
