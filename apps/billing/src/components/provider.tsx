'use client';
import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from 'react';
import Image from 'next/image';
import type { Session, Workspace } from '../domain/types';
import { BillingService } from '../services/billing';
import { DemoLocalAdapter } from '../repositories/workspace';
import { DemoAuthAdapter } from '../domain/permissions';
import { environment } from '../config/environment';
type Command<T> = (w: Workspace, s: Session) => T;
interface Context { w: Workspace; session: Session; busy: boolean; run<T>(command: Command<T>, message?: string): Promise<T>; confirm(title: string, detail: string, action: () => Promise<unknown>): void; notify(message: string): void }
const WorkspaceContext = createContext<Context | null>(null);
export function useWorkspace() { const c = useContext(WorkspaceContext); if (!c) throw new Error('Workspace is not ready.'); return c; }
export function WorkspaceProvider({ children }: { children: ReactNode }) {
  const [service] = useState(() => new BillingService(new DemoLocalAdapter(), new DemoAuthAdapter()));
  const [w, setW] = useState<Workspace>(), [session, setSession] = useState<Session>(), [busy, setBusy] = useState(false), [error, setError] = useState(''), [toast, setToast] = useState('');
  const [confirmation, setConfirmation] = useState<{ title: string; detail: string; action: () => Promise<unknown> }>();
  const dialog = useRef<HTMLDialogElement>(null);
  const load = useCallback(() => { const result = environment.mode === 'demo' ? service.load() : Promise.reject(new Error('Production authentication and API adapters are not configured. Set NEXT_PUBLIC_BILLING_MODE=demo for the local demo.')); return result.then(r => { setW(current => !current || r.workspace.revision >= current.revision ? r.workspace : current); setSession(r.session); setError(''); }).catch(e => setError(e instanceof Error ? e.message : 'Unable to open workspace.')); }, [service]);
  useEffect(() => { void load(); return service.subscribe(() => { void load(); }); }, [load, service]);
  useEffect(() => { if (!toast) return; const timer = setTimeout(() => setToast(''), 6000); return () => clearTimeout(timer); }, [toast]);
  useEffect(() => { if (confirmation) dialog.current?.showModal(); else dialog.current?.close(); }, [confirmation]);
  async function run<T>(command: Command<T>, message = 'Saved successfully') { setBusy(true); try { const r = await service.execute(command); setW(current => !current || r.workspace.revision >= current.revision ? r.workspace : current); setToast(message); return r.result; } catch (e) { setToast(e instanceof Error ? e.message : 'Unable to save. Please retry.'); throw e; } finally { setBusy(false); } }
  if (!w || !session) return <main className="startup"><Image src="/brand/hitech-logo.svg" width={230} height={57} alt="Hitech Lab & Surgical Solutions" loading="eager" /><h1>{error ? 'Workspace unavailable' : 'Opening your workspace…'}</h1><p>{error || 'Preparing the demo workspace in this browser.'}</p>{error && <button onClick={() => void load()}>Retry</button>}</main>;
  return <WorkspaceContext.Provider value={{ w, session, busy, run, confirm: (title, detail, action) => setConfirmation({ title, detail, action }), notify: setToast }}>{children}<div className="toast" role="status" aria-live="polite" hidden={!toast}>{toast}</div><dialog ref={dialog} className="confirm-dialog" onCancel={e => { e.preventDefault(); if (!busy) setConfirmation(undefined); }}><h2>{confirmation?.title}</h2><p>{confirmation?.detail}</p><div className="actions"><button className="secondary" disabled={busy} onClick={() => setConfirmation(undefined)}>Go back</button><button disabled={busy} onClick={async () => { try { await confirmation?.action(); setConfirmation(undefined); } catch { /* Error is surfaced by run. Keep the dialog open for correction. */ } }}>{busy ? 'Saving…' : 'Confirm'}</button></div></dialog></WorkspaceContext.Provider>;
}
export function useUnsaved(dirty: boolean) { useEffect(() => { if (!dirty) return; const before = (e: BeforeUnloadEvent) => { e.preventDefault(); }; const click = (e: MouseEvent) => { const a = (e.target as Element).closest('a'); if (!a || a.target === '_blank' || a.hasAttribute('download') || a.href === location.href) return; if (!window.confirm('Leave this form? Unsaved changes will be lost.')) { e.preventDefault(); e.stopPropagation(); } }; window.addEventListener('beforeunload', before); document.addEventListener('click', click, true); return () => { window.removeEventListener('beforeunload', before); document.removeEventListener('click', click, true); }; }, [dirty]); }
