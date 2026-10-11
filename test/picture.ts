// One picture of a screen, taken by the check that proves it, at the moment it passes.
// Saved as .constat/pictures/<slug of the check's full name>.png, which is where CI picks it up.
import { execFileSync } from 'node:child_process';
import { existsSync, mkdirSync, mkdtempSync, readFileSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { inflateSync } from 'node:zlib';

const slug = (name: string) =>
  name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 120);

// GitHub's Ubuntu runners ship Chrome; a machine with Chromium instead is just as good.
const browsers = ['google-chrome', 'chromium', 'chromium-browser'];

/**
 * The letters the pictures are drawn with, carried in the page itself.
 *
 * A build machine has Latin letters and nothing else: asked for 日本語 it draws three empty boxes,
 * and a judge holding that picture learns nothing about the Japanese. So the four Noto faces kept
 * in test/fonts — each cut down to the characters this app can show, see the script beside them —
 * are written into the page as the page is written, and the browser has them before it draws a
 * single word. Nothing here reaches a phone, which has letters of its own; this is only what a
 * picture is drawn with.
 */
const lentHere = resolve(process.cwd(), 'test/fonts');

const face = (family: string, file: string) =>
  `@font-face { font-family: ${JSON.stringify(family)}; font-style: normal; font-weight: 100 900;` +
  ` src: url(data:font/woff2;base64,${readFileSync(join(lentHere, file)).toString('base64')})` +
  " format('woff2'); }";

const lentFaces = [
  face('Noto Sans SC', 'noto-sans-sc.woff2'),
  face('Noto Sans JP', 'noto-sans-jp.woff2'),
  face('Noto Sans Arabic', 'noto-sans-arabic.woff2'),
  face('Noto Sans Symbols 2', 'noto-sans-symbols-2.woff2'),
].join('\n  ');

/**
 * Which face gets asked for a character, in the language the screen is in.
 *
 * The lent faces are named before system-ui and not after it, because a browser asked for
 * system-ui answers with the one font the machine calls its own and stops there: everything named
 * after it is never reached, and the page fills with boxes while the letters sit unused inside it.
 * They carry only the characters a build machine has none of, so a Latin word falls straight
 * through them to the machine's own font and the screens look as they always did.
 *
 * Chinese and Japanese are in places the same character and a different letter, drawn one way in
 * Shanghai and another in Osaka; a page says which language it is in, and is drawn in that hand.
 */
const lettersFor = (lang: string) => {
  const han = lang.startsWith('ja') ? ['Noto Sans JP', 'Noto Sans SC'] : ['Noto Sans SC', 'Noto Sans JP'];
  return ['-apple-system', '"Segoe UI"', 'Roboto', '"Noto Sans Arabic"', ...han.map((one) => `"${one}"`),
    '"Noto Sans Symbols 2"', 'system-ui', 'sans-serif'].join(', ');
};

/** What a picture needs to know beyond the markup: the language the screen on it is in. */
export type Framing = { lang?: string };

/** The scripts a build machine has no letters of its own for, or none a reader would recognise. */
const needsTheLentFaces = (markup: string) =>
  /[\p{Script=Han}\p{Script=Hiragana}\p{Script=Katakana}\p{Script=Arabic}]/u.test(markup);

/**
 * A phone-sized page around the screen's own markup: the app draws itself, this only frames it.
 * Drawn once as it is meant to be, and once with nothing lent to it, which is how the picture is
 * asked whether it used the letters it was given.
 */
const page = (markup: string, lang: string, lent = true) => `<!doctype html>
<html lang="${lang}"><head><meta charset="utf-8">
<style>
  ${lent ? lentFaces : ''}
  html, body { margin: 0; padding: 0; background: #ffffff; }
  body { width: 390px; height: 844px; display: flex; flex-direction: column;
         font-family: ${lent ? lettersFor(lang) : barely}; color: #11141a; }
  body > * { flex: 1 1 auto; min-height: 0; }
</style></head><body>${markup}</body></html>
`;

/** The same page with nothing lent to it: only what the machine drawing it owns. */
const barely = '-apple-system, "Segoe UI", Roboto, system-ui, sans-serif';

/** Runs one browser over a page. */
function browserOver(browser: string, args: string[]): void {
  execFileSync(browser, ['--headless', '--no-sandbox', '--disable-gpu', '--hide-scrollbars', ...args], {
    stdio: 'ignore',
    timeout: 120_000,
  });
}

// ─── Reading a picture back, pixel by pixel ──────────────────────────────────────────────────────
// A browser with no letter for a character draws an empty box in its place and says nothing about
// it: the page is the same page, the words are the same width, and only the picture is different.
// So the only honest way to ask is to look at the picture. Every character a screen shows is drawn
// once in a cell of its own, beside a character no font anywhere has a letter for, and the two
// cells of pixels are compared. Drawn the same means the browser drew its box.

type Picture = { width: number; depth: number; rows: Buffer };

/** One PNG, as the pixels in it: Chrome writes 8-bit rows, which is all this needs to read. */
function pixelsOf(png: Buffer): Picture {
  let at = 8;
  let width = 0;
  let height = 0;
  let depth = 0;
  const parts: Buffer[] = [];
  while (at < png.length) {
    const size = png.readUInt32BE(at);
    const kind = png.toString('ascii', at + 4, at + 8);
    const body = png.subarray(at + 8, at + 8 + size);
    if (kind === 'IHDR') {
      width = body.readUInt32BE(0);
      height = body.readUInt32BE(4);
      if (body[8] !== 8 || body[12] !== 0) throw new Error(`the picture is written in a PNG this cannot read`);
      depth = ({ 0: 1, 2: 3, 4: 2, 6: 4 } as Record<number, number>)[body[9]] ?? 0;
      if (depth === 0) throw new Error(`the picture is written in a PNG this cannot read (colour ${body[9]})`);
    }
    if (kind === 'IDAT') parts.push(body);
    if (kind === 'IEND') break;
    at += size + 12;
  }
  const raw = inflateSync(Buffer.concat(parts));
  const line = width * depth;
  const rows = Buffer.alloc(line * height);
  // Each row of a PNG is written as the difference from its neighbours; put back the way it was.
  for (let y = 0; y < height; y += 1) {
    const filter = raw[y * (line + 1)];
    const from = y * (line + 1) + 1;
    for (let x = 0; x < line; x += 1) {
      const left = x >= depth ? rows[y * line + x - depth] : 0;
      const above = y > 0 ? rows[(y - 1) * line + x] : 0;
      const corner = y > 0 && x >= depth ? rows[(y - 1) * line + x - depth] : 0;
      let was = 0;
      if (filter === 1) was = left;
      else if (filter === 2) was = above;
      else if (filter === 3) was = (left + above) >> 1;
      else if (filter === 4) {
        const guess = left + above - corner;
        const toLeft = Math.abs(guess - left);
        const toAbove = Math.abs(guess - above);
        const toCorner = Math.abs(guess - corner);
        was = toLeft <= toAbove && toLeft <= toCorner ? left : toAbove <= toCorner ? above : corner;
      }
      rows[y * line + x] = (raw[from + x] + was) & 0xff;
    }
  }
  return { width, depth, rows };
}

/** One cell of a picture, as a number: two cells with the same number were drawn the same. */
function cellAt(picture: Picture, left: number, top: number): number {
  let count = 0x811c9dc5;
  for (let y = top; y < top + cellHigh; y += 1) {
    const row = y * picture.width * picture.depth;
    for (let x = left * picture.depth; x < (left + cellWide) * picture.depth; x += 1) {
      count = Math.imul(count ^ picture.rows[row + x], 0x01000193);
    }
  }
  return count >>> 0;
}

// The grid every character is drawn on, one to a cell, and the weights the screens are written in
// — a letter a face has in one weight and not in the other is still a box on the screen.
const cellWide = 48;
const cellHigh = 32;
const acrossTheGrid = 16;
const downTheGrid = 64;
const weights = [400, 700];

// Each character is drawn after a Latin letter, as the screens draw it: a browser hands a line of
// text to one font and asks that font's own fallback for the rest of it, so a character alone in
// its cell can come out a letter while the same character in a sentence comes out a box. The
// letter before it makes the cell the kind of line a screen really has.
const beside = 'n';

/** Every character a screen shows that a machine might have no letter for. */
const charactersIn = (markup: string): string[] => {
  const found = new Set<string>();
  for (const ch of markup) {
    if (ch.codePointAt(0)! > 0x7f && !/[\s\p{C}︀-️]/u.test(ch)) found.add(ch);
  }
  return [...found];
};

/** A page with every one of those characters on it, each in a cell of the grid of its own. */
function gridOf(characters: string[], lang: string): string {
  const nothing = String.fromCodePoint(0x10ffff); // a character no font anywhere has a letter for
  const cells = weights.flatMap((weight) =>
    [nothing, ...characters].map(
      (ch) =>
        `<div style="width:${cellWide}px;height:${cellHigh}px;overflow:hidden;font-weight:${weight};` +
        `font-size:20px;line-height:${cellHigh}px">${beside}&#${ch.codePointAt(0)};</div>`,
    ),
  );
  return `<!doctype html>
<html lang="${lang}"><head><meta charset="utf-8">
<style>
  ${lentFaces}
  html, body { margin: 0; padding: 0; background: #ffffff; }
  body { font-family: ${lettersFor(lang)}; color: #000000; }
  #grid { display: flex; flex-wrap: wrap; width: ${cellWide * acrossTheGrid}px; }
</style></head><body><div id="grid">${cells.join('')}</div></body></html>
`;
}

/** Where the nth cell of that grid sits in the picture of it. */
const cellNumber = (n: number) => ({
  left: (n % acrossTheGrid) * cellWide,
  top: Math.floor(n / acrossTheGrid) * cellHigh,
});

/** Throws when no browser on this machine could do the work a picture needs. */
const noBrowser = (refusals: string[]) =>
  new Error(`no browser on this machine took the picture (${refusals.join('; ') || 'none tried'})`);

/** Draws a page with one browser or another, and leaves the picture of it where it was asked for. */
function drawPage(html: string, out: string, size: string, work: string): void {
  const refusals: string[] = [];
  for (const browser of browsers) {
    try {
      browserOver(browser, [
        `--window-size=${size}`, `--user-data-dir=${join(work, 'profile')}`,
        '--virtual-time-budget=10000', `--screenshot=${out}`, `file://${html}`,
      ]);
    } catch (err) {
      refusals.push(`${browser}: ${err instanceof Error ? err.message : String(err)}`);
      continue;
    }
    if (existsSync(out)) return;
  }
  throw noBrowser(refusals);
}

/**
 * The characters in this markup the browser that draws the picture has no letter for, and so draws
 * as the empty box it draws for a character it cannot write. Empty is the only answer a picture of
 * a screen may have.
 */
export function lettersMissingFrom(markup: string, framing: Framing = {}): string[] {
  const characters = charactersIn(markup);
  if (characters.length === 0) return [];
  const work = mkdtempSync(join(tmpdir(), 'constat-letters-'));
  const html = join(work, 'grid.html');
  const out = join(work, 'grid.png');
  writeFileSync(html, gridOf(characters, framing.lang ?? 'en'));
  // The grid is always drawn the same size, whatever is on it: asked for a window shorter than it
  // likes, a browser draws the page smaller and the cells stop lining up with the picture.
  const cells = weights.length * (characters.length + 1);
  if (cells > acrossTheGrid * downTheGrid) {
    throw new Error(`${characters.length} characters on one screen is more than the grid was built for`);
  }
  drawPage(html, out, `${cellWide * acrossTheGrid},${cellHigh * downTheGrid}`, work);

  const picture = pixelsOf(readFileSync(out));
  const missing = new Set<string>();
  weights.forEach((_, nth) => {
    const first = nth * (characters.length + 1);
    const corner = cellNumber(first);
    const box = cellAt(picture, corner.left, corner.top);
    characters.forEach((ch, n) => {
      const where = cellNumber(first + 1 + n);
      if (cellAt(picture, where.left, where.top) === box) missing.add(ch);
    });
  });
  return [...missing];
}

/**
 * Takes the picture and returns where it was saved. Throws when no browser on this machine could
 * draw the page — a check that cannot photograph its screen has not proved it, and says so — and
 * throws when the page the browser drew has characters it had no letters for, because a picture of
 * a Japanese screen in empty boxes proves nothing a person can read.
 */
export function takePicture(checkName: string, markup: string, framing: Framing = {}): string {
  const pictures = resolve(process.cwd(), '.constat/pictures');
  mkdirSync(pictures, { recursive: true });
  const out = join(pictures, `${slug(checkName)}.png`);
  const work = mkdtempSync(join(tmpdir(), 'constat-picture-'));
  const html = join(work, 'screen.html');
  const lang = framing.lang ?? 'en';
  writeFileSync(html, page(markup, lang));
  drawPage(html, out, '390,844', work);

  // The same screen drawn with nothing lent to it. A screen with Chinese, Japanese or Arabic words
  // on it cannot come out the same both ways unless the lent letters went unused — which is what
  // happens when a stack names the machine's own font first and the browser never reads past it.
  if (needsTheLentFaces(markup)) {
    const bare = join(work, 'bare.html');
    const barePicture = join(work, 'bare.png');
    writeFileSync(bare, page(markup, lang, false));
    drawPage(bare, barePicture, '390,844', work);
    if (readFileSync(out).equals(readFileSync(barePicture))) {
      throw new Error(
        `the picture of "${checkName}" is the same drawn with the letters in test/fonts and ` +
          'without them, so the browser never used them: a word of it is a row of empty boxes ' +
          'either way. The lent faces have to be named before system-ui in the stack, which is ' +
          'where a browser stops looking.',
      );
    }
  }

  const missing = lettersMissingFrom(markup, framing);
  if (missing.length > 0) {
    throw new Error(
      `the picture of "${checkName}" draws ${missing.join(' ')} as empty boxes: the machine that ` +
        'drew it has no letter for them. The faces in test/fonts travel with the app for exactly ' +
        'this; run `node test/fonts/gather-fonts.mjs` if a catalogue has gained a character.',
    );
  }
  return out;
}
