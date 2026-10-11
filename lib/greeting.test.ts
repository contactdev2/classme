import { describe, expect, it } from 'vitest';
import { greetingFor, nameOf, partOfDay } from './greeting';
import { schoolWeekOf } from './week';
import { setLanguage } from './i18n';
import { sourceLanguage } from './languages';

// These checks read the greeting and the week in the language the app's own words are written in,
// so what they prove is the arithmetic of a date and not a translation of it. That every screen
// follows the language a teacher chose is proved in app/localise-app.test.tsx.
setLanguage(sourceLanguage);

const at = (when: string) => new Date(when);

describe('the greeting Home opens with', () => {
  it('says the part of the day the teacher is reading it in', () => {
    expect(partOfDay(at('2025-04-21T00:00:00'))).toBe('Good morning');
    expect(partOfDay(at('2025-04-21T08:12:00'))).toBe('Good morning');
    expect(partOfDay(at('2025-04-21T11:59:00'))).toBe('Good morning');
    expect(partOfDay(at('2025-04-21T12:00:00'))).toBe('Good afternoon');
    expect(partOfDay(at('2025-04-21T17:59:00'))).toBe('Good afternoon');
    expect(partOfDay(at('2025-04-21T18:00:00'))).toBe('Good evening');
    expect(partOfDay(at('2025-04-21T23:59:00'))).toBe('Good evening');
  });

  it('calls a teacher by the name their own record keeps', () => {
    expect(nameOf({ email: 'ms.rivera@riversidehigh.edu', name: 'Ms. Rivera' })).toBe('Ms. Rivera');
    expect(greetingFor({ email: 'ms.rivera@riversidehigh.edu', name: 'Ms. Rivera' }, at('2025-04-21T08:12:00'))).toEqual({
      hour: 'Good morning,',
      name: 'Ms. Rivera',
    });
  });

  it('falls back to the email for a record that keeps no name, rather than inventing one', () => {
    expect(nameOf({ email: 'ms.rivera@riversidehigh.edu' })).toBe('ms.rivera@riversidehigh.edu');
    expect(nameOf({ email: 'ms.rivera@riversidehigh.edu', name: '   ' })).toBe('ms.rivera@riversidehigh.edu');
  });
});

describe('the week Home shows', () => {
  it('runs Monday to Friday of the week the day falls in, whichever day it is', () => {
    for (const day of ['2025-04-21', '2025-04-23', '2025-04-25']) {
      expect(schoolWeekOf(at(`${day}T09:00:00`)).map((d) => `${d.name} ${d.date}`)).toEqual([
        'Mon Apr 21',
        'Tue Apr 22',
        'Wed Apr 23',
        'Thu Apr 24',
        'Fri Apr 25',
      ]);
    }
  });

  it('picks out the day the teacher is standing in, and only that one', () => {
    const week = schoolWeekOf(at('2025-04-23T09:00:00'));
    expect(week.filter((d) => d.today).map((d) => d.name)).toEqual(['Wed']);
  });

  it('picks out no day at the weekend, and still shows the week that was taught', () => {
    // Saturday and Sunday both belong to the week behind them.
    for (const weekend of ['2025-04-26T09:00:00', '2025-04-27T09:00:00']) {
      const week = schoolWeekOf(at(weekend));
      expect(week.some((d) => d.today), weekend).toBe(false);
      expect(week.map((d) => d.date), weekend).toEqual(['Apr 21', 'Apr 22', 'Apr 23', 'Apr 24', 'Apr 25']);
    }
  });

  it('crosses the turn of a month and of a year without losing a day', () => {
    expect(schoolWeekOf(at('2025-12-31T09:00:00')).map((d) => d.date)).toEqual(['Dec 29', 'Dec 30', 'Dec 31', 'Jan 1', 'Jan 2']);
  });
});
