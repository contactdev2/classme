import { Text, View } from 'react-native';
import { lastDays, monthOnMonth, tallyFor, weeklyTrend, type Tally } from '../lib/attendance-stats';
import type { ClassroomData } from '../lib/classroom-data';
import { useWords, type WordKey } from '../lib/i18n';
import { colors, markColours, radius, shadow, space } from '../lib/theme';

/** The stretch of days a class's report reads, and the weeks the trend is drawn over. */
export const overTheLast = 30;

/**
 * Five bars, which is the past month by the week: the week being taught and the four before it.
 * A month is not a whole number of weeks, so the first bar is the week the month began in.
 */
export const trendWeeks = 5;

/** The three marks, as the legend beside the donut names and colours them. */
const legend: { of: keyof Tally & ('present' | 'absent' | 'late'); name: WordKey; colour: string }[] = [
  { of: 'present', name: 'tally.present', colour: markColours.present },
  { of: 'absent', name: 'tally.absent', colour: markColours.absent },
  { of: 'late', name: 'tally.late', colour: markColours.late },
];

// Made when a screen is drawn and not when this module loads: the colours in it are the ones the
// app is wearing at that moment, so a teacher flipping Dark Mode redraws this with everything else.
const card = () => ({
  backgroundColor: colors.card,
  borderRadius: radius.card,
  padding: space.step,
  ...shadow.card,
} as const);

/**
 * One class's attendance, as a report: the donut, the weeks it is made of, and the one sentence
 * worth saying about all of it.
 *
 * Every number here is worked out now, from the daily marks the phone already keeps — a rate, a
 * weekly trend, and how this month compares with the one before it. Nothing is stored twice, which
 * is an approved decision: a summary kept beside the records is a second truth, and the day the two
 * disagree there is no telling which of them is the teacher's own class.
 *
 * The agreed prototype draws these three cards on the class's Overview tab and again on its Trends
 * tab, so both tabs show this one report rather than two screens drifting apart.
 */
export function ClassTrends({
  data,
  classroomId,
  now,
}: {
  data: ClassroomData;
  /** The class being read, or nothing where a teacher has no class open: the report then says so. */
  classroomId: string | null;
  now: Date;
}) {
  const t = useWords();
  const nothing: Tally = { present: 0, absent: 0, late: 0, total: 0, rate: 0 };
  const tally = classroomId ? tallyFor(data, classroomId, lastDays(now, overTheLast)) : nothing;
  const weeks = classroomId ? weeklyTrend(data, classroomId, now, trendWeeks) : [];
  const month = classroomId ? monthOnMonth(data, classroomId, now, overTheLast) : null;

  const insight =
    !month || month.of.total === 0
      ? t('class.insightNone')
      : month.points > 0
        ? t('class.insightUp', { points: month.points })
        : month.points < 0
          ? t('class.insightDown', { points: -month.points })
          : t('class.insightSteady');

  return (
    <>
      {/* What the class's attendance comes to: the share present, and every mark counted. */}
      <View style={{ ...card(), marginHorizontal: space.step, flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: space.gap }}>
        {/* The donut: a thick round band with the number written in the hole of it. React Native
            draws no conic gradient without a drawing package, and a chart pinned to a height
            cannot grow with the phone's largest text — so the band is sized by what is inside it,
            and the three shares it is made of are told apart by the legend and the strip below. */}
        <View
          style={{
            alignItems: 'center',
            justifyContent: 'center',
            borderWidth: 12,
            borderColor: tally.total === 0 ? colors.line : markColours.present,
            borderRadius: 999,
            paddingHorizontal: 18,
            paddingVertical: 22,
          }}
        >
          <Text style={{ fontSize: 22, fontWeight: '800', color: colors.text }}>{t('class.rate', { rate: tally.rate })}</Text>
          <Text style={{ fontSize: 11, color: colors.muted, textAlign: 'center' }}>{t('class.overall')}</Text>
        </View>

        <View style={{ gap: 12, flexGrow: 1 }}>
          {legend.map((one) => (
            <View key={one.of} style={{ flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: 8 }}>
              <View style={{ width: 10, height: 10, borderRadius: 3, backgroundColor: one.colour }} />
              <Text style={{ fontSize: 13, color: colors.muted, flexGrow: 1 }}>{t(one.name)}</Text>
              <Text style={{ fontSize: 13, fontWeight: '700', color: colors.text }}>{tally[one.of]}</Text>
            </View>
          ))}
          {/* The same three counts as the share of the class each one is: the donut, laid flat. */}
          <View style={{ flexDirection: 'row', height: 10, borderRadius: 5, overflow: 'hidden', backgroundColor: colors.line }}>
            {legend.map((one) => (
              <View key={one.of} style={{ flex: tally[one.of], backgroundColor: one.colour }} />
            ))}
          </View>
        </View>
      </View>

      {/* How the weeks of the past month have gone, the week being taught last. */}
      <View style={{ ...card(), marginHorizontal: space.step, gap: 12 }}>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: space.tight }}>
          <Text style={{ fontSize: 15, fontWeight: '700', color: colors.text }}>{t('class.trend')}</Text>
          <Text style={{ fontSize: 13, fontWeight: '600', color: colors.accent }}>{t('class.weekly')}</Text>
        </View>
        {weeks.map((week) => (
          <View key={week.label} style={{ flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: space.snug }}>
            <Text style={{ fontSize: 11, color: colors.faint, minWidth: 48 }}>{week.label}</Text>
            <View style={{ flexGrow: 1, flexBasis: 120, height: 10, borderRadius: 5, backgroundColor: colors.background, overflow: 'hidden' }}>
              <View style={{ width: `${week.marks === 0 ? 0 : week.rate}%`, flexGrow: 1, backgroundColor: colors.accent, borderRadius: 5 }} />
            </View>
            <Text style={{ fontSize: 11, fontWeight: '600', color: week.marks === 0 ? colors.faint : colors.text }}>
              {week.marks === 0 ? t('class.weekEmpty') : t('class.rate', { rate: week.rate })}
            </Text>
          </View>
        ))}
      </View>

      {/* What is worth saying about all of it, in one sentence: this month against the last. */}
      <View style={{ ...card(), marginHorizontal: space.step, flexDirection: 'row', alignItems: 'flex-start', flexWrap: 'wrap', gap: 12 }}>
        <Text style={{ fontSize: 16, backgroundColor: '#FEF3C7', borderRadius: radius.pill, paddingHorizontal: 8, paddingVertical: 6 }}>💡</Text>
        <View style={{ flex: 1, flexBasis: 180, gap: 4 }}>
          <Text style={{ fontSize: 14, fontWeight: '700', color: colors.text }}>{t('class.insights')}</Text>
          <Text style={{ fontSize: 13, color: colors.muted }}>{insight}</Text>
        </View>
      </View>
    </>
  );
}
