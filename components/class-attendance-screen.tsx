import { useState } from 'react';
import { Pressable, ScrollView, Text, View } from 'react-native';
import { lastDays, monthOnMonth, tallyFor, weeklyTrend, type Tally } from '../lib/attendance-stats';
import { classesToSwitchTo, classroomWithId } from '../lib/classes';
import type { ClassroomData } from '../lib/classroom-data';
import { useDirection, useWords, type WordKey } from '../lib/i18n';
import { colors, markColours, radius, shadow, space, useAppearance } from '../lib/theme';

/** The stretch of days the dashboard reads, and the weeks the trend is drawn over. */
const overTheLast = 30;
const trendWeeks = 5;

/** The three marks, as the legend beside the ring names and colours them. */
const legend: { of: keyof Tally & ('present' | 'absent' | 'late'); name: WordKey; colour: string }[] = [
  { of: 'present', name: 'tally.present', colour: markColours.present },
  { of: 'absent', name: 'tally.absent', colour: markColours.absent },
  { of: 'late', name: 'tally.late', colour: markColours.late },
];

/** The three tabs of a class's attendance. Students and Trends are each their own requirement. */
const tabs: { name: WordKey; here: boolean }[] = [
  { name: 'class.overview', here: true },
  { name: 'class.students', here: false },
  { name: 'class.trends', here: false },
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
 * One class's attendance: the dashboard behind its own card in My Classes.
 *
 * Every number on it is worked out here and now from the marks the phone already keeps — a rate, a
 * weekly trend, and how the month compares with the one before it. Nothing is stored twice and
 * nothing is asked of a network.
 *
 * A teacher who opened the wrong class switches straight to another one from the row along the top,
 * without going back to the list for it.
 */
export function ClassAttendanceScreen({
  data,
  classroomId,
  onBack,
  now = new Date(),
}: {
  data: ClassroomData;
  classroomId: string;
  onBack: () => void;
  now?: Date;
}) {
  const t = useWords();
  const dir = useDirection();
  // Redrawn the moment a teacher flips Dark Mode in their own profile menu: the colours below are
  // whichever of the two looks the app is wearing. See lib/theme.ts.
  useAppearance();
  const [showing, setShowing] = useState(classroomId);
  const classroom = classroomWithId(data, showing) ?? classroomWithId(data, classroomId);
  const span = lastDays(now, overTheLast);
  const tally = classroom ? tallyFor(data, classroom.id, span) : { present: 0, absent: 0, late: 0, total: 0, rate: 0 };
  const weeks = classroom ? weeklyTrend(data, classroom.id, now, trendWeeks) : [];
  const month = classroom ? monthOnMonth(data, classroom.id, now, overTheLast) : null;

  const insight =
    !month || month.of.total === 0
      ? t('class.insightNone')
      : month.points > 0
        ? t('class.insightUp', { points: month.points })
        : month.points < 0
          ? t('class.insightDown', { points: -month.points })
          : t('class.insightSteady');

  return (
    <View style={{ flex: 1, direction: dir, backgroundColor: colors.background }}>
      <ScrollView style={{ flex: 1 }} contentContainerStyle={{ paddingTop: 20, paddingBottom: space.gap, gap: space.step }}>
        {/* The way back to the list, the class a teacher is in, and — drawn because the prototype
            draws it — the mark for what else can be done with a class, which is its own requirement
            and so has nothing behind it yet and is not announced as a button. */}
        <View
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: space.snug,
            paddingHorizontal: space.step,
          }}
        >
          <Pressable accessibilityRole="button" accessibilityLabel={t('class.back')} onPress={onBack}>
            <Text style={{ fontSize: 22, color: colors.text }}>←</Text>
          </Pressable>
          <Text accessibilityRole="header" style={{ fontSize: 18, fontWeight: '700', color: colors.text }}>
            {classroom ? classroom.name : t('classes.noneAll')}
          </Text>
          <Text style={{ fontSize: 20, color: colors.muted }}>⋯</Text>
        </View>

        {/* Which days the numbers below are worked out over. */}
        <View style={{ flexDirection: 'row', justifyContent: 'flex-end', paddingHorizontal: space.step }}>
          <Text
            style={{
              fontSize: 13,
              fontWeight: '600',
              color: colors.muted,
              backgroundColor: colors.card,
              borderRadius: radius.pill,
              paddingHorizontal: 14,
              paddingVertical: 6,
              ...shadow.soft,
            }}
          >
            {t('class.range')}
          </Text>
        </View>

        {/* The teacher's other classes, so one tap is the whole of switching between them. */}
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10, paddingHorizontal: space.step }}>
          {classesToSwitchTo(data, showing).map((one) => {
            const open = classroom?.id === one.id;
            return (
              <Pressable
                key={one.id}
                accessibilityRole="button"
                accessibilityState={{ checked: open }}
                onPress={() => setShowing(one.id)}
                style={{
                  backgroundColor: open ? colors.accent : colors.card,
                  borderRadius: radius.pill,
                  paddingHorizontal: 14,
                  paddingVertical: 6,
                  ...(open ? shadow.accent : shadow.soft),
                }}
              >
                <Text style={{ fontSize: 13, fontWeight: '600', color: open ? colors.onAccent : colors.text }}>{one.name}</Text>
              </Pressable>
            );
          })}
        </View>

        {/* Overview, where the teacher is. The students of a class and its trends are each their
            own requirement, so those two are drawn and nothing is behind them yet. */}
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', backgroundColor: colors.card, borderRadius: radius.card, padding: 4, marginHorizontal: space.step, ...shadow.soft }}>
          {tabs.map((tab) => (
            <Text
              key={tab.name}
              style={{
                flex: 1,
                textAlign: 'center',
                borderRadius: radius.field,
                paddingVertical: 10,
                fontSize: 14,
                fontWeight: tab.here ? '700' : '600',
                color: tab.here ? colors.onAccent : colors.muted,
                backgroundColor: tab.here ? colors.accent : colors.card,
              }}
            >
              {t(tab.name)}
            </Text>
          ))}
        </View>

        {/* What the class's attendance comes to: the share present, and every mark counted. */}
        <View style={{ ...card(), marginHorizontal: space.step, flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: space.gap }}>
          {/* The ring: thick, round and sized by what is written inside it, so the phone's largest
              text makes the ring bigger rather than hiding the number in it. */}
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
            {/* The same three counts as the share of the class each one is. */}
            <View style={{ flexDirection: 'row', height: 10, borderRadius: 5, overflow: 'hidden', backgroundColor: colors.line }}>
              {legend.map((one) => (
                <View key={one.of} style={{ flex: tally[one.of], backgroundColor: one.colour }} />
              ))}
            </View>
          </View>
        </View>

        {/* How the weeks have gone, the week being taught last. */}
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

        {/* What is worth saying about all of it, in one sentence. */}
        <View style={{ ...card(), marginHorizontal: space.step, flexDirection: 'row', alignItems: 'flex-start', flexWrap: 'wrap', gap: 12 }}>
          <Text style={{ fontSize: 16, backgroundColor: '#FEF3C7', borderRadius: radius.pill, paddingHorizontal: 8, paddingVertical: 6 }}>💡</Text>
          <View style={{ flex: 1, flexBasis: 180, gap: 4 }}>
            <Text style={{ fontSize: 14, fontWeight: '700', color: colors.text }}>{t('class.insights')}</Text>
            <Text style={{ fontSize: 13, color: colors.muted }}>{insight}</Text>
          </View>
        </View>
      </ScrollView>
    </View>
  );
}
