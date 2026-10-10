// DoneMark's try mode on a phone (template 50): in a preview DoneMark's CI published, what went wrong is
// kept for the strip in words — never a query, bodies or headers. Outside try mode this does nothing.
export type Said = { at: string; kind: 'phone'; method: string | null; path: string | null; words: string };

const KEPT = 20;
let said: Said[] = [];
let stopped: Said | null = null;
let installed = false;
const listeners = new Set<(all: Said[]) => void>();
const stopListeners = new Set<(s: Said | null) => void>();

/** Written out in full so Expo inlines it when it bundles a preview. */
export const tryMode = (): boolean => process.env.EXPO_PUBLIC_DONEMARK_TRY === '1';

function keep(s: { method?: string | null; path?: string | null; words: string }): Said {
  const one: Said = { at: new Date().toISOString(), kind: 'phone', method: s.method ?? null, path: s.path ?? null,
    words: (s.words.split('\n')[0] ?? '').slice(0, 300) || '(no words)' };
  said = [one, ...said].slice(0, KEPT);
  for (const l of listeners) l(said);
  return one;
}

/** An error, in its own words. */
export function sayError(err: unknown): Said {
  return keep({ words: err instanceof Error ? err.message : String(err) });
}

export function listen(l: (all: Said[]) => void): () => void {
  listeners.add(l);
  l(said);
  return () => { listeners.delete(l); };
}

export function onStop(l: (s: Said | null) => void): () => void {
  stopListeners.add(l);
  return () => { stopListeners.delete(l); };
}

export const theStop = (): Said | null => stopped;

/** Whether the address the app was opened with carries DoneMark's key and address (the card path, later). */
export function linkedToDonemark(url: string | null): boolean {
  if (!url) return false;
  const q = url.includes('?') ? new URLSearchParams(url.slice(url.indexOf('?') + 1)) : null;
  return Boolean(q?.get('donemark') && q.get('at'));
}

export const saidLines = (all: Said[]): string =>
  all.map((s) => `${s.at.slice(11, 19)} · ${s.method ? `${s.method} ` : ''}${s.path ?? ''}${s.method || s.path ? ' · ' : ''}${s.words}`).join('\n');

/** Installed once, from the root layout. Returns whether try mode is on. */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function installDonemarkTry(g: any = globalThis): boolean {
  if (!tryMode() || installed) return false;
  installed = true;
  const errorUtils = g.ErrorUtils;
  if (errorUtils?.setGlobalHandler) {
    const previous = errorUtils.getGlobalHandler?.();
    errorUtils.setGlobalHandler((error: unknown, isFatal?: boolean) => {
      const s = sayError(error);
      if (isFatal) {
        // Held on the stopped screen instead of closing the app (spec 2026-10-03 §4).
        stopped = s;
        for (const l of stopListeners) l(stopped);
        return;
      }
      previous?.(error, isFatal);
    });
  }
  g.HermesInternal?.enablePromiseRejectionTracker?.({ allRejections: true, onUnhandled: (_id: number, error: unknown) => { sayError(error); } });
  if (typeof g.fetch === 'function') {
    const original = g.fetch;
    g.fetch = async (input: unknown, init?: { method?: string }) => {
      const answer = await original(input, init);
      if (answer && answer.status >= 500) {
        const href = typeof input === 'string' ? input : (input as { url?: string })?.url ?? String(input);
        try {
          const u = new URL(href);
          keep({ method: (init?.method ?? (input as { method?: string })?.method ?? 'GET').toUpperCase(), path: `${u.host}${u.pathname}`, words: `answered ${answer.status}` });
        } catch { /* not an address: nothing to say */ }
      }
      return answer;
    };
  }
  return true;
}
