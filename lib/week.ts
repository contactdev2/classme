// The school week a day falls in: Monday to Friday, with the day itself picked out. Written out
// rather than asked of a locale, so the strip reads the same on every phone and in every check.
const weekdays = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri'] as const;
const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'] as const;

/** One day in the strip along the top of Home. */
export type SchoolDay = {
  /** Mon to Fri, the day's short name. */
  name: string;
  /** The date on it, as a person reads it: 'Apr 21'. */
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
  return weekdays.map((name, after) => {
    const day = new Date(now.getFullYear(), now.getMonth(), now.getDate() - sinceMonday + after);
    return { name, date: `${months[day.getMonth()]} ${day.getDate()}`, today: sameDay(day, now) };
  });
}
