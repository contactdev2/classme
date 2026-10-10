// The look the prototype agreed on (round 3): warm and friendly, rounded and approachable, soft blue
// accents and gentle shadows. Every screen reads its colours, corners and spacing from here, so the
// app looks like one app and a change of mind is a change in one file.
export const colors = {
  /** Everything a person reads, unless it is deliberately quieter. */
  text: '#1E2A3A',
  /** The one colour that means "this does something". */
  accent: '#2F6FED',
  /** Behind every screen, and inside a field so it reads as a place to type. */
  background: '#F5F8FC',
  /** A card lifted off the background. */
  card: '#FFFFFF',
  /** The hairline round a field or between two things. */
  line: '#E3EAF4',
  /** A sentence under a heading: still read, just not first. */
  muted: '#5B6B80',
  /** A caption, a hint, a word nobody has to read. */
  faint: '#8C98A8',
  /** The accent, washed out, for a panel that is telling rather than asking. */
  accentWash: '#EAF1FD',
  /** The accent, quietened, behind something small and round: a teacher's own avatar. */
  accentSoft: '#CBD9F7',
  /** On the accent. */
  onAccent: '#FFFFFF',
} as const;

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
