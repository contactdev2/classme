// The look the prototype agreed on (round 3): warm and friendly, rounded and approachable, soft blue
// accents and gentle shadows. Every screen reads its colours, corners and spacing from here, so the
// app looks like one app and a change of mind is a change in one file.
//
// There are two of those looks now — the light the app has always been drawn in, and the dark a
// teacher switches on in their own profile menu. Which one the app is wearing is one answer for the
// whole app, kept here, exactly as the language a teacher reads it in is one answer kept in
// lib/i18n.ts. A screen asks for `colors.text` and gets the ink of whichever look is on; `colors`
// itself is the one object every screen already reads, written over when the look changes, so there
// is no second palette for a screen to forget to follow. A screen that must redraw the moment a
// teacher flips the switch says so with useAppearance() — every screen the app has does.
//
// Where the choice is kept between one morning and the next is lib/appearance.ts.
import { useEffect, useState } from 'react';

/** Which of the two looks the app is wearing. */
export type Appearance = 'light' | 'dark';

/** Every colour a screen can ask for, by the name it asks for it by. */
export type Palette = {
  /** Everything a person reads, unless it is deliberately quieter. */
  text: string;
  /** The one colour that means "this does something". */
  accent: string;
  /** Behind every screen, and inside a field so it reads as a place to type. */
  background: string;
  /** A card lifted off the background. */
  card: string;
  /** The hairline round a field or between two things. */
  line: string;
  /** The fainter hairline between two rows of one card. */
  hairline: string;
  /** A sentence under a heading: still read, just not first. */
  muted: string;
  /** A caption, a hint, a word nobody has to read. */
  faint: string;
  /** The quietest words on a screen: a footer, a version number. */
  faintest: string;
  /** The accent, washed out, for a panel that is telling rather than asking. */
  accentWash: string;
  /** Words on that wash. */
  onWash: string;
  /** The accent, quietened, behind something small and round: a teacher's own avatar. */
  accentSoft: string;
  /** The accent's own edge: behind the way back at the top left of a screen. */
  accentEdge: string;
  /** On the accent. */
  onAccent: string;
  /** Something a teacher should not do by accident: logging out, a sync switched off. */
  alarm: string;
  /** The hairline round it. */
  alarmEdge: string;
  /** Something that is as it should be: the lock on their data, and the badge saying so. */
  good: string;
  /** The wash behind that. */
  goodWash: string;
  /** A switch nobody has turned on. */
  switchOff: string;
  /** The ring round a choice nobody has made. */
  ring: string;
  /** The little arrow at the end of a row that leads somewhere. */
  chevron: string;
};

/** The light the app has always been drawn in: the agreed palette, round 3. */
export const lightColours: Palette = {
  text: '#1E2A3A',
  accent: '#2F6FED',
  background: '#F5F8FC',
  card: '#FFFFFF',
  line: '#E3EAF4',
  hairline: '#F0F3F8',
  muted: '#5B6B80',
  faint: '#8C98A8',
  faintest: '#9AA7B8',
  accentWash: '#EAF1FD',
  onWash: '#3E536B',
  accentSoft: '#CBD9F7',
  accentEdge: '#DCE8FB',
  onAccent: '#FFFFFF',
  alarm: '#E0574A',
  alarmEdge: '#FCE1DE',
  good: '#1FAE63',
  goodWash: '#E4F8ED',
  switchOff: '#D7E3F7',
  ring: '#D5DDE8',
  chevron: '#B7C3D1',
};

/**
 * The same app in the dark: the same shapes, the same spacing, the same soft blue — turned round, so
 * a teacher taking a register in a dim classroom at half past seven is not holding a torch.
 *
 * The accent is lifted a little and what is written on it is darkened, because white on this app's
 * own blue is thin to read against a dark card while dark ink on a lifted blue is not. Nothing else
 * is renamed or moved: a screen asking for `colors.card` gets a card either way.
 */
export const darkColours: Palette = {
  text: '#E7EDF6',
  accent: '#5A8DF6',
  background: '#111822',
  card: '#1B2533',
  line: '#2C3A4C',
  hairline: '#283444',
  muted: '#A9B7C9',
  faint: '#8A98AB',
  faintest: '#7F8C9E',
  accentWash: '#1D2B44',
  onWash: '#C3D2E6',
  accentSoft: '#2A3C5E',
  accentEdge: '#24375C',
  onAccent: '#0B1220',
  alarm: '#FF8A7A',
  alarmEdge: '#4A2A26',
  good: '#4ADE80',
  goodWash: '#14321F',
  switchOff: '#36455B',
  ring: '#3C4B60',
  chevron: '#7C8A9C',
};

/**
 * The colours the app is wearing now. This is the object every screen reads, and it is written over
 * when the look changes rather than swapped for another one, so a style already built out of it —
 * and there are a few, made once where a screen loads — is reading the same colours as the screen
 * around it.
 */
export const colors: Palette = { ...lightColours };

const palettes: Record<Appearance, Palette> = { light: lightColours, dark: darkColours };

let worn: Appearance = 'light';
const listeners = new Set<() => void>();

/** Which of the two looks the app is wearing at this moment. */
export const appearanceNow = (): Appearance => worn;

/** Told when the look changes, and handed back the way to stop being told. */
export function onAppearanceChange(tell: () => void): () => void {
  listeners.add(tell);
  return () => {
    listeners.delete(tell);
  };
}

/** Puts the whole app into this look, at once. Nothing is remembered by this alone. */
export function setAppearance(which: Appearance): void {
  if (which === worn) return;
  worn = which;
  Object.assign(colors, palettes[which]);
  for (const tell of [...listeners]) tell();
}

/**
 * The look the app is in, for a screen that must be redrawn the moment it changes. Every screen asks
 * through this, so a teacher pressing Dark Mode in their own profile menu sees the screen behind
 * their finger change with it — and the screens behind that one, when they walk back to them.
 */
export function useAppearance(): Appearance {
  const [, bump] = useState(0);
  useEffect(() => onAppearanceChange(() => bump((n) => n + 1)), []);
  return worn;
}

/**
 * The three attendance marks, each with a colour of its own. The agreed palette (round 3) names a
 * colour for text, one for what does something and one for what is behind it, and a class's
 * attendance cannot be read in one colour: present, absent and late have to be told apart at a
 * glance, in a ring and in a legend beside it. These are the prototype's own three.
 *
 * They are the same in both looks, deliberately: a mark's colour is what it means, and green that
 * meant present this morning cannot mean something else this evening.
 */
export const markColours = { present: '#22C55E', absent: '#EF4444', late: '#F59E0B' } as const;

/**
 * The soft washes a student's own initials sit on, with the ink each of them is written in. A
 * register is a column of two dozen faces, and one wash down the whole of it reads as a wall rather
 * than as a list of people: the prototype draws its roster this way, taking each student the next
 * wash along. Every pair is dark ink on a pale wash, so a name is as readable at the bottom of the
 * list as at the top — and the same face is the same colour in either look, as a mark is.
 */
export const avatarWashes = [
  { wash: '#DBEAFE', ink: '#1D4ED8' },
  { wash: '#FDE68A', ink: '#92400E' },
  { wash: '#FBCFE8', ink: '#9D174D' },
  { wash: '#BFDBFE', ink: '#1E40AF' },
  { wash: '#E9D5FF', ink: '#6B21A8' },
  { wash: '#C7D2FE', ink: '#3730A3' },
  { wash: '#A7F3D0', ink: '#065F46' },
] as const;

/** 16px corners, as agreed; 12px where something sits inside something already rounded. */
export const radius = { card: 16, field: 12, pill: 10 } as const;

/** The gaps between things, so two screens never disagree about what "a bit of room" is. */
export const space = { tight: 6, snug: 10, step: 16, gap: 24, room: 28 } as const;

/** A gentle shadow: a card, and the accent's own glow under a button. */
export const shadow = {
  card: { shadowColor: '#1E2A3A', shadowOpacity: 0.08, shadowRadius: 24, shadowOffset: { width: 0, height: 8 } },
  accent: { shadowColor: '#2F6FED', shadowOpacity: 0.35, shadowRadius: 18, shadowOffset: { width: 0, height: 8 } },
  soft: { shadowColor: '#2F6FED', shadowOpacity: 0.08, shadowRadius: 12, shadowOffset: { width: 0, height: 4 } },
} as const;
