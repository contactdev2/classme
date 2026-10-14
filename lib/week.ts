// The school week a day falls in: Monday to Friday, with the day itself picked out. The names come
// out of the app's own words rather than off a phone's locale, so the strip is in the language the
// teacher chose and not in the one their phone was bought in.
import { say } from './i18n';
import type { WordKey } from './words/en';

const weekdays = ['day.mon', 'day.tue', 'day.wed', 'day.thu', 'day.fri'] as const;

// Every day of the week, from the Sunday a phone's own clock counts from.
const everyDay = ['day.sun', 'day.mon', 'day.tue', 'day.wed', 'day.thu', 'day.fri', 'day.sat'] as const;

/** The short name of the day this is, in the app's own language: 'Mon', 'lun.', '周一'. */
export const dayName = (day: Date): string => say(everyDay[day.getDay()]);

/**
 * The day and month this is, as this language writes them: 'Apr 21', '21 أبريل', '4月21日'. The
 * month and the day round the other way in French and Arabic, and the day carries a character of
 * its own in Chinese and Japanese, so the order is the catalogue's to decide.
 */
export const dateLabel = (day: Date): string =>
  say('week.date', { month: say(`month.${day.getMonth() + 1}` as WordKey), day: day.getDate() });

/** One day in the strip along the top of Home. */
export type SchoolDay = {
  /** Monday to Friday, the day's short name in the app's own language. */
  name: string;
  /** The date on it, as this language writes it: 'Apr 21', '4月21日'. */
  date: string;
  /** Whether this is the day the teacher is looking at the screen on. */
  today: boolean;
};

const sameDay = (one: Date, other: Date) =>
  one.getFullYear() === other.getFullYear() && one.getMonth() === other.getMonth() && one.getDate() === other.getDate();

/**
 * Monday to Friday of the week this day falls in. A Saturday or a Sunday belongs to the week that
 * has just been taught, so the strip still shows that week — with no day picked out, because the
 * teacher is not in school on it.
 */
export function schoolWeekOf(now: Date): SchoolDay[] {
  // getDay() counts from Sunday; the school week counts from Monday.
  const sinceMonday = (now.getDay() + 6) % 7;
  return weekdays.map((key, after) => {
    const day = new Date(now.getFullYear(), now.getMonth(), now.getDate() - sinceMonday + after);
    return {
      name: say(key),
      date: dateLabel(day),
      today: sameDay(day, now),
    };
  });
}
