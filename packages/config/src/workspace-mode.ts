/** A deployed preview may serve demo fixtures. Every unrecognized stage fails closed. */
export function demoWorkspaceEnabled(stage?: string, mode?: string): boolean {
  return (
    ["", "development", "preview", "demo"].includes(stage ?? "") &&
    (!mode || mode === "demo")
  );
}
