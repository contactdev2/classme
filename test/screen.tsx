// The checks' hands and eyes. A screen is mounted on a real DOM and then typed into and pressed the
// way a person does, so a check can prove what happens and not only what is drawn. For the checks
// only — the app on a phone is driven by the phone itself. Nothing here is shipped.
import { act, type ReactElement } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { languageNow } from '../lib/i18n';
import { takePicture } from './picture';

// React asks to be told when it is being driven by a check, so it can settle every update before
// the check looks at the screen.
(globalThis as Record<string, unknown>).IS_REACT_ACT_ENVIRONMENT = true;

/** A browser's own way of putting text in a field, which is the one React notices. */
const putText = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value')!.set!;

const says = (name: string | RegExp, words: string) =>
  typeof name === 'string' ? words.includes(name) : name.test(words);

/** The entities a DOM writes back out, as the characters a person actually reads on the screen. */
const entities: Record<string, string> = { amp: '&', lt: '<', gt: '>', quot: '"', apos: "'", nbsp: ' ' };

/** What a person actually reads on the screen, with the markup taken back out. */
export const visibleText = (markup: string) =>
  markup
    .replace(/<[^>]*>/g, ' ')
    .replace(/&(#\d+|#x[0-9a-f]+|[a-z]+);/gi, (all, named: string) =>
      named.startsWith('#')
        ? String.fromCodePoint(Number(named.startsWith('#x') ? `0x${named.slice(2)}` : named.slice(1)))
        : entities[named.toLowerCase()] ?? all,
    )
    .replace(/\s+/g, ' ')
    .trim();

export type Screen = {
  /** The field a person would find by reading the words that name it. */
  field(label: string | RegExp): HTMLInputElement;
  /** Types text into that field, a person at the keyboard. */
  type(label: string | RegExp, text: string): Promise<void>;
  /** Presses the button that says these words. */
  press(name: string | RegExp): Promise<void>;
  /** Everything the screen says, as a person reads it. */
  text(): string;
  /** The screen as it stands, markup and all — what a picture of it is taken from. */
  markup(): string;
  /** The screen's own outermost element, laid out the way the phone lays it out. */
  root(): HTMLElement;
  /** Every word a person actually reads on it: a leaf of the screen, a placeholder, a label. */
  readable(): string[];
  close(): void;
};

function fields(host: HTMLElement): HTMLInputElement[] {
  return [...host.querySelectorAll('input')];
}

/**
 * Everything on a screen a person presses: a button, a row of a list they choose from — the
 * language rows in Classroom Settings are announced as the radio group they are — a name that takes
 * them to another screen, which a register announces as the link it is, and a switch, which is what
 * Dark Mode in the profile menu is announced as. A finger does not care which of the four a screen
 * called them.
 */
function buttons(host: HTMLElement): HTMLElement[] {
  return [...host.querySelectorAll('[role="button"], [role="radio"], [role="link"], [role="switch"]')] as HTMLElement[];
}

/** Opens a screen on the DOM, as the app's own web build does, and hands back a way to use it. */
export function open(element: ReactElement): Screen {
  const host = document.createElement('div');
  document.body.appendChild(host);
  let root: Root;
  act(() => {
    root = createRoot(host);
    root.render(element);
  });

  const find = (label: string | RegExp) => {
    const found = fields(host).filter((f) => says(label, f.getAttribute('aria-label') ?? ''));
    if (found.length !== 1) throw new Error(`${found.length} fields named ${label} on this screen, wanted exactly one`);
    return found[0];
  };

  return {
    field: find,
    async type(label, text) {
      const field = find(label);
      await act(async () => {
        putText.call(field, text);
        field.dispatchEvent(new window.Event('input', { bubbles: true }));
      });
    },
    async press(name) {
      const found = buttons(host).filter((b) => says(name, b.textContent ?? '') || says(name, b.getAttribute('aria-label') ?? ''));
      if (found.length !== 1) throw new Error(`${found.length} buttons saying ${name} on this screen, wanted exactly one`);
      await act(async () => {
        found[0].dispatchEvent(new window.MouseEvent('click', { bubbles: true }));
      });
    },
    text: () => visibleText(host.innerHTML),
    root: () => host.firstElementChild as HTMLElement,
    readable() {
      const read: string[] = [];
      for (const el of [...host.querySelectorAll<HTMLElement>('*')]) {
        if (el.children.length === 0) {
          const words = (el.textContent ?? '').trim();
          if (words) read.push(words);
        }
        for (const attribute of ['placeholder', 'aria-label']) {
          const words = el.getAttribute(attribute)?.trim();
          if (words) read.push(words);
        }
      }
      return read;
    },
    markup() {
      // What a person has typed lives in the field itself, not in the markup React wrote; said out
      // loud here so the picture shows the screen as the person in front of it sees it.
      for (const field of fields(host)) field.setAttribute('value', field.value);
      return host.innerHTML;
    },
    close() {
      act(() => root.unmount());
      host.remove();
    },
  };
}

/**
 * A moment of real time on the phone: everything the screen started when it opened — reading the
 * language it was last left in, among them — finished before a check looks at it.
 */
export async function settle(): Promise<void> {
  await act(async () => {
    await Promise.resolve();
    await Promise.resolve();
  });
}

/**
 * One picture of this screen, at the moment the check that took it passes — told which language
 * the app is in, because the same character is drawn one way for a Chinese reader and another for
 * a Japanese one, and a picture of a screen should be in the hand its reader reads.
 */
export function takePictureOf(checkName: string, screen: Screen): string {
  return takePicture(checkName, screen.markup(), { lang: languageNow() });
}
