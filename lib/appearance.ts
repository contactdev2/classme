// Which of the app's two looks a teacher chose, kept on their own phone.
//
// Dark Mode is a switch in the profile menu, and a switch a teacher has to find again every morning
// is not a setting: it is kept as the text of one small file in the app's own documents folder,
// beside the records (lib/accounts-file.ts) and the memory of the walkthrough (lib/onboarding.ts),
// and read as the app opens. Keeping settings and preferences like this one on the device is an
// approved decision — nothing about it is sent anywhere, and there is nothing to send it to.
//
// **Nothing personal is written in it.** It says which look the app was left in, and not a word
// about whose phone it is.
import { textOnThisPhone, type KeptText } from './accounts-file';
import { appearanceNow, setAppearance, type Appearance } from './theme';

/** What the file is called in the app's own documents folder. */
export const appearanceFileName = 'classme-appearance.json';

/** The look a teacher chose, and the way to say they have chosen another. */
export type AppearanceMemory = {
  /** The look this phone was left in, or null where nobody has chosen one. */
  read(): Promise<Appearance | null>;
  /** Writes that down, in place of whatever was there. */
  write(which: Appearance): Promise<void>;
};

/** One of the two looks, or nothing where these are not words this app wrote. */
const lookIn = (said: unknown): Appearance | null => (said === 'light' || said === 'dark' ? said : null);

/** Kept for as long as the app runs and no longer, for a check: nothing of a phone in it. */
export function appearanceIn(which: Appearance | null = null): AppearanceMemory {
  let kept = which;
  return {
    async read() {
      return kept;
    },
    async write(next) {
      kept = next;
    },
  };
}

/**
 * The choice as one file's text: `{ "version": 1, "appearance": "dark" }`.
 *
 * Text that is not what this app writes — a file somebody edited, a file from a version that kept
 * something else — reads as nobody having chosen, so the app opens in the light it has always
 * opened in rather than refusing to draw a screen over a settings file.
 */
export function appearanceKeptIn(file: KeptText): AppearanceMemory {
  return {
    async read() {
      const text = await file.read();
      if (!text) return null;
      let read: unknown;
      try {
        read = JSON.parse(text);
      } catch {
        return null;
      }
      if (!read || typeof read !== 'object') return null;
      return lookIn((read as Record<string, unknown>).appearance);
    },
    async write(which) {
      await file.write(JSON.stringify({ version: 1, appearance: which }));
    },
  };
}

/** The choice this phone keeps, in the app's own documents folder. */
export function appearanceOnThisPhone(): AppearanceMemory {
  return appearanceKeptIn(textOnThisPhone(appearanceFileName));
}

// A phone nobody has chosen a look on, until the app itself says where its own memory is: this is
// what a check gets, and it is the honest starting state — a freshly installed app has been told
// nothing, and the app opens in the light it was drawn in.
let memory: AppearanceMemory = appearanceIn(null);

/** Keeps the chosen look in this memory from now on. */
export function keepAppearanceIn(next: AppearanceMemory): void {
  memory = next;
}

/** The memory the app is using now. */
export function appearanceMemory(): AppearanceMemory {
  return memory;
}

/**
 * The look a teacher chose: put on now, and kept so the app opens in it next time.
 *
 * Never throws. The screens are already drawn in it by the time anything is written, so a phone that
 * would not keep it costs a teacher one press tomorrow morning and nothing else — and nothing is
 * logged about it either way.
 */
export async function rememberAppearance(which: Appearance): Promise<boolean> {
  setAppearance(which);
  try {
    await memory.write(which);
    return true;
  } catch {
    return false;
  }
}

/** The other one: what a press of the switch puts the app into. */
export const theOtherLook = (): Appearance => (appearanceNow() === 'dark' ? 'light' : 'dark');

/**
 * The look the app opens in, settled as it opens: the one this phone was left in, or the light it
 * has always opened in where nobody has chosen. A phone that will not answer is a phone nobody has
 * chosen on.
 */
export async function openInKeptAppearance(): Promise<Appearance> {
  let kept: Appearance | null = null;
  try {
    kept = await memory.read();
  } catch {
    // Nothing kept, or nothing readable: the app opens in the light, which is what it always did.
  }
  setAppearance(kept ?? 'light');
  return appearanceNow();
}
