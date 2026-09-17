import type { DocumentKind, Workspace } from './types';
import { financialYear } from './dates';
export function allocateNumber(w: Workspace, kind: DocumentKind, date: string): string {
  const r = w.settings.numbering[kind]; if (!/^[A-Za-z0-9/-]{1,12}$/.test(r.prefix) || !Number.isSafeInteger(r.next) || r.next < 1 || !Number.isInteger(r.padding) || r.padding < 1 || r.padding > 8) throw new Error('Check document numbering settings.');
  const fy = financialYear(date, w.settings.financialYearStart); if (r.resetFY && r.period && r.period !== fy) r.next = 1; r.period = fy;
  const used = new Set(w.documents.map(d => d.number)); let number: string;
  do { if (!Number.isSafeInteger(r.next + 1)) throw new Error('The numbering sequence is exhausted.'); number = `${r.prefix}${r.includeFY || r.resetFY ? `${fy}/` : ''}${String(r.next++).padStart(r.padding, '0')}`; } while (used.has(number)); return number;
}
