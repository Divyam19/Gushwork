import type { AnalysisStatus } from './schemas';

/** An analysis marked 'analyzing' longer than this is assumed dead (function killed at maxDuration). */
export const STALE_ANALYZING_MS = 60_000;

/**
 * The status to show. A function killed mid-analysis never reaches its catch block, so the row would
 * read 'analyzing' forever (and the page would keep polling). Treat an old one as an error instead.
 */
export function effectiveStatus(
  a: { status: AnalysisStatus; error: string | null; analyzed_at: string | null },
  now: number = Date.now(),
): { status: AnalysisStatus; error: string | null } {
  if (a.status !== 'analyzing') return { status: a.status, error: a.error };
  const started = a.analyzed_at ? Date.parse(a.analyzed_at) : 0;
  if (now - started > STALE_ANALYZING_MS) return { status: 'error', error: 'Analysis timed out. Try Regenerate.' };
  return { status: 'analyzing', error: null };
}
