// One picture of a screen, taken by the check that proves it, at the moment it passes.
// Saved as .constat/pictures/<slug of the check's full name>.png, which is where CI picks it up.
import { execFileSync } from 'node:child_process';
import { existsSync, mkdirSync, mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';

const slug = (name: string) =>
  name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 120);

// GitHub's Ubuntu runners ship Chrome; a machine with Chromium instead is just as good.
const browsers = ['google-chrome', 'chromium', 'chromium-browser'];

/** A phone-sized page around the screen's own markup: the app draws itself, this only frames it. */
const page = (markup: string) => `<!doctype html>
<html lang="en"><head><meta charset="utf-8">
<style>
  html, body { margin: 0; padding: 0; background: #ffffff; }
  body { width: 390px; height: 844px; display: flex; flex-direction: column;
         font-family: -apple-system, "Segoe UI", Roboto, system-ui, sans-serif; color: #11141a; }
  body > * { flex: 1 1 auto; min-height: 0; }
</style></head><body>${markup}</body></html>
`;

/**
 * Takes the picture and returns where it was saved. Throws when no browser on this machine could
 * draw the page — a check that cannot photograph its screen has not proved it, and says so.
 */
export function takePicture(checkName: string, markup: string): string {
  const pictures = resolve(process.cwd(), '.constat/pictures');
  mkdirSync(pictures, { recursive: true });
  const out = join(pictures, `${slug(checkName)}.png`);
  const work = mkdtempSync(join(tmpdir(), 'constat-picture-'));
  const html = join(work, 'screen.html');
  writeFileSync(html, page(markup));
  const refusals: string[] = [];
  for (const browser of browsers) {
    try {
      execFileSync(browser, [
        '--headless', '--no-sandbox', '--disable-gpu', '--hide-scrollbars',
        '--window-size=390,844', `--user-data-dir=${join(work, 'profile')}`,
        `--screenshot=${out}`, `file://${html}`,
      ], { stdio: 'ignore', timeout: 120_000 });
    } catch (err) {
      refusals.push(`${browser}: ${err instanceof Error ? err.message : String(err)}`);
      continue;
    }
    if (existsSync(out)) return out;
  }
  throw new Error(`no browser on this machine took the picture (${refusals.join('; ') || 'none tried'})`);
}
