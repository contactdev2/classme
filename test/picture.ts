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

/**
 * What the browser was asked to read back off the page once it had drawn it: every character a
 * person would see, and whether the browser had a letter for it or drew the empty box it draws
 * when it has none. A picture full of empty boxes says nothing about a translation, so a check
 * that takes one is not allowed to pass.
 *
 * A character is drawn twice: once as itself, and once as U+10FFFF, which is a character no font
 * anywhere has a letter for. If the two come out as the same picture, the browser drew the box.
 */
const readsEveryLetter = `
(async () => {
  const report = document.getElementById('constat-letters');
  try {
    if (document.fonts && document.fonts.ready) await document.fonts.ready;
    const canvas = document.createElement('canvas');
    canvas.width = 72;
    canvas.height = 72;
    const ink = canvas.getContext('2d');
    const nothing = String.fromCodePoint(0x10ffff);
    const drawn = (ch, font) => {
      ink.fillStyle = '#ffffff';
      ink.fillRect(0, 0, 72, 72);
      ink.fillStyle = '#000000';
      ink.font = font;
      ink.textBaseline = 'top';
      ink.fillText(ch, 4, 4);
      return canvas.toDataURL();
    };
    const box = new Map();
    const missing = new Set();
    const nobodysLetter = /[\\s\\p{C}\\uFE00-\\uFE0F]/u;
    const look = (text, element) => {
      if (!text) return;
      const style = getComputedStyle(element);
      const font = style.fontStyle + ' ' + style.fontWeight + ' 40px ' + style.fontFamily;
      if (!box.has(font)) box.set(font, drawn(nothing, font));
      for (const ch of text) {
        if (ch.codePointAt(0) < 0x80 || nobodysLetter.test(ch)) continue;
        if (drawn(ch, font) === box.get(font)) missing.add(ch);
      }
    };
    const walk = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
    for (let node = walk.nextNode(); node; node = walk.nextNode()) {
      const element = node.parentElement;
      if (element && element.id !== 'constat-letters') look(node.nodeValue, element);
    }
    for (const field of document.querySelectorAll('input, textarea')) {
      look(field.value, field);
      look(field.getAttribute('placeholder'), field);
    }
    report.textContent = 'read ' + [...missing].join('');
  } catch (err) {
    report.textContent = 'broke ' + err;
  }
})();
`;

/** A phone-sized page around the screen's own markup: the app draws itself, this only frames it. */
const page = (markup: string) => `<!doctype html>
<html lang="en"><head><meta charset="utf-8">
<style>
  html, body { margin: 0; padding: 0; background: #ffffff; }
  body { width: 390px; height: 844px; display: flex; flex-direction: column;
         font-family: -apple-system, "Segoe UI", Roboto, system-ui, sans-serif; color: #11141a; }
  body > * { flex: 1 1 auto; min-height: 0; }
  #constat-letters { display: none; }
</style></head><body>${markup}<pre id="constat-letters">not read</pre>
<script>${readsEveryLetter}</script></body></html>
`;

/** Runs one browser over a page, and hands back everything it said. */
function browserOver(browser: string, args: string[]): string {
  return execFileSync(browser, ['--headless', '--no-sandbox', '--disable-gpu', '--hide-scrollbars', ...args], {
    encoding: 'utf8',
    stdio: ['ignore', 'pipe', 'ignore'],
    timeout: 120_000,
  });
}

/** What the page said about its own letters, once the browser had drawn it. */
function lettersMissingFromPage(browser: string, work: string, html: string): string[] {
  const dumped = browserOver(browser, [
    `--user-data-dir=${join(work, 'profile')}`, '--virtual-time-budget=10000', '--dump-dom', `file://${html}`,
  ]);
  const said = dumped.match(/<pre id="constat-letters"[^>]*>([^<]*)<\/pre>/)?.[1];
  if (said === undefined || !said.startsWith('read ')) {
    throw new Error(`the browser never read the letters back off the page (it said ${JSON.stringify(said ?? null)})`);
  }
  return [...said.slice('read '.length)];
}

/** A page of this markup, written somewhere a browser can open it. */
function pageOnDisk(markup: string): { work: string; html: string } {
  const work = mkdtempSync(join(tmpdir(), 'constat-picture-'));
  const html = join(work, 'screen.html');
  writeFileSync(html, page(markup));
  return { work, html };
}

/** Throws when no browser on this machine could do the work a picture needs. */
const noBrowser = (refusals: string[]) =>
  new Error(`no browser on this machine took the picture (${refusals.join('; ') || 'none tried'})`);

/**
 * The characters in this markup that a browser has no letter for, and so would draw as the empty
 * box it draws for a character it cannot write. Empty is the only answer a picture may have.
 */
export function lettersMissingFrom(markup: string): string[] {
  const { work, html } = pageOnDisk(markup);
  const refusals: string[] = [];
  for (const browser of browsers) {
    try {
      return lettersMissingFromPage(browser, work, html);
    } catch (err) {
      if (err instanceof Error && err.message.startsWith('the browser never read')) throw err;
      refusals.push(`${browser}: ${err instanceof Error ? err.message : String(err)}`);
    }
  }
  throw noBrowser(refusals);
}

/**
 * Takes the picture and returns where it was saved. Throws when no browser on this machine could
 * draw the page — a check that cannot photograph its screen has not proved it, and says so — and
 * throws when the page the browser drew has characters it had no letters for, because a picture
 * of a Japanese screen in empty boxes proves nothing a person can read.
 */
export function takePicture(checkName: string, markup: string): string {
  const pictures = resolve(process.cwd(), '.constat/pictures');
  mkdirSync(pictures, { recursive: true });
  const out = join(pictures, `${slug(checkName)}.png`);
  const { work, html } = pageOnDisk(markup);
  const refusals: string[] = [];
  for (const browser of browsers) {
    try {
      browserOver(browser, [
        '--window-size=390,844', `--user-data-dir=${join(work, 'profile')}`,
        `--screenshot=${out}`, `file://${html}`,
      ]);
    } catch (err) {
      refusals.push(`${browser}: ${err instanceof Error ? err.message : String(err)}`);
      continue;
    }
    if (!existsSync(out)) continue;
    const missing = lettersMissingFromPage(browser, work, html);
    if (missing.length > 0) {
      throw new Error(
        `the picture of "${checkName}" draws ${missing.join(' ')} as empty boxes: the machine that ` +
          'drew it has no letters for them. The faces in test/fonts travel with the app for exactly ' +
          'this; run `node test/fonts/gather-fonts.mjs` if a catalogue has gained a character.',
      );
    }
    return out;
  }
  throw noBrowser(refusals);
}
