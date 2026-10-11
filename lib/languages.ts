// The languages the app offers, and the one it is written in.
//
// A teacher chooses from the four the product asked for — Simplified Chinese, French, Arabic and
// Japanese — and the first of them is the one a phone that has never been asked opens in. English
// is not offered: it is the language the app's own words are written in, kept here as the source
// every translation is made from and the fallback for a word a catalogue has not got yet, and it is
// on no screen a teacher can reach.
export type Tag = 'zh-Hans' | 'fr' | 'ar' | 'ja' | 'en';

/** One language as the picker draws it: its own name, its own mark, and which way it reads. */
export type Language = {
  tag: Tag;
  /** What the language calls itself — the one name that is the same in every other language. */
  native: string;
  /** The letter in the little square beside it. */
  mark: string;
  /** Whether a screen in this language is mirrored, right to left. */
  rtl: boolean;
};

/** The four languages a teacher can choose, in the order the picker lists them. */
export const languages: readonly Language[] = [
  { tag: 'zh-Hans', native: '简体中文', mark: '中', rtl: false },
  { tag: 'fr', native: 'Français', mark: 'Fr', rtl: false },
  { tag: 'ar', native: 'العربية', mark: 'ع', rtl: true },
  { tag: 'ja', native: '日本語', mark: '日', rtl: false },
];

/** Simplified Chinese: what the app opens in until a teacher chooses otherwise. */
export const defaultLanguage: Tag = 'zh-Hans';

/** The language the app's own words are written in, and no screen offers. */
export const sourceLanguage: Tag = 'en';

/** That language, told apart from anything else a file might have in it. */
export const isLanguage = (value: unknown): value is Tag =>
  typeof value === 'string' && (value === sourceLanguage || languages.some((one) => one.tag === value));

/** Which way a screen in this language reads. */
export const readsRightToLeft = (tag: Tag): boolean => languages.some((one) => one.tag === tag && one.rtl);
