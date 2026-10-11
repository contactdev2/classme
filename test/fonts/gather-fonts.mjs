// The letters the pictures are drawn with, fetched once and kept here.
//
// A picture of a screen is drawn by a browser on a build machine, and a build machine has no
// Chinese, Japanese or Arabic letters on it: every one of them comes out as an empty box, and a
// judge reading the picture sees boxes where the translation should be. So the app's own letters
// travel with it. This script asks Google Fonts for a Noto face cut down to exactly the characters
// this app can put on a screen, and writes each one next to this file; test/picture.ts then lends
// those faces to the browser that draws the picture.
//
// Run it again — `node test/fonts/gather-fonts.mjs` — whenever a catalogue in lib/words gains a
// character the kept faces have not got. The check that photographs a screen says so by name when
// that happens, so nobody has to remember on their own.
import { execFileSync } from 'node:child_process';
import { readFileSync, readdirSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const root = resolve(here, '../..');

/** Every file that can put words on a screen: the catalogues, the languages, the screens. */
const sources = [
  ...readdirSync(join(root, 'lib/words')).map((name) => `lib/words/${name}`),
  'lib/languages.ts',
  ...readdirSync(join(root, 'components')).map((name) => `components/${name}`),
  ...readdirSync(join(root, 'app')).filter((name) => name.endsWith('.tsx')).map((name) => `app/${name}`),
];

const han = /[\p{Script=Han}\p{Script=Hiragana}\p{Script=Katakana}　-ヿㇰ-ㇿ＀-￯]/u;
const arabic = /[\p{Script=Arabic}؀-ۿﭐ-﷿ﹰ-﻿]/u;

// Arrows, a tick, a power sign: the little marks the screens draw instead of a word. A build
// machine owns some of them and not others, and the ones it misses are the ones that matter.
const marks = (ch) =>
  !han.test(ch) && !arabic.test(ch) && !/[\p{Script=Latin}\p{Extended_Pictographic}]/u.test(ch);

/** Every character the app can show that is nobody's ASCII, sorted so the file is the same twice. */
function characters(wanted) {
  const belongs = typeof wanted === 'function' ? wanted : (ch) => wanted.test(ch);
  const found = new Set();
  for (const file of sources) {
    for (const ch of readFileSync(join(root, file), 'utf8')) {
      // A character nobody draws — a space, a mark that only says which way to read — needs no letter.
      if (ch.codePointAt(0) > 0x7f && !/[\s\p{C}\uFE00-\uFE0F]/u.test(ch) && belongs(ch)) found.add(ch);
    }
  }
  return [...found].sort().join('');
}

/** The faces kept here, and the characters each of them is cut down to. */
const faces = [
  { file: 'noto-sans-sc.woff2', family: 'Noto Sans SC', weights: ':wght@400..700', text: () => characters(han) },
  { file: 'noto-sans-jp.woff2', family: 'Noto Sans JP', weights: ':wght@400..700', text: () => characters(han) },
  { file: 'noto-sans-arabic.woff2', family: 'Noto Sans Arabic', weights: ':wght@400..700', text: () => characters(arabic) },
  // Noto's symbols are drawn in one weight, and asking for a second is asking for nothing.
  { file: 'noto-sans-symbols-2.woff2', family: 'Noto Sans Symbols 2', weights: '', text: () => characters(marks) },
];

// Google Fonts hands woff2 only to a browser that says it can read woff2.
const browser = 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36';

const fetchText = (url) =>
  execFileSync('curl', ['-sSfL', '--max-time', '60', '-H', `User-Agent: ${browser}`, url], { encoding: 'utf8' });

for (const face of faces) {
  const text = face.text();
  const css = fetchText(
    `https://fonts.googleapis.com/css2?family=${encodeURIComponent(face.family).replace(/%20/g, '+')}` +
      `${face.weights}&text=${encodeURIComponent(text)}`,
  );
  const url = css.match(/src: url\((https:[^)]+)\) format\('woff2'\)/)?.[1];
  if (!url) throw new Error(`Google Fonts sent no woff2 for ${face.family}:\n${css}`);
  const woff2 = execFileSync('curl', ['-sSfL', '--max-time', '60', '-H', `User-Agent: ${browser}`, url], {
    encoding: 'buffer',
    maxBuffer: 64 * 1024 * 1024,
  });
  writeFileSync(join(here, face.file), woff2);
  console.log(`${face.file}: ${woff2.length} bytes, ${[...text].length} characters of ${face.family}`);
}
