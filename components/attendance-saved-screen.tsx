import { Pressable, ScrollView, Text, View } from 'react-native';
import { dayFromText, type SavedRegister } from '../lib/attendance-save';
import type { AttendanceMark, Classroom } from '../lib/classroom-data';
import { useDirection, useWords, type WordKey } from '../lib/i18n';
import { colors, markColours, radius, shadow, space } from '../lib/theme';
import { dateLabel, dayName } from '../lib/week';

/** Each mark's own colour and the word the tiles call it by: the legend's plural noun, not a mark. */
const tileLook: Record<AttendanceMark, { name: WordKey; colour: string }> = {
  Present: { name: 'tally.present', colour: markColours.present },
  Absent: { name: 'tally.absent', colour: markColours.absent },
  Late: { name: 'tally.late', colour: markColours.late },
};

/** A mark's colour, washed right out, behind the number of students standing at it. */
const washOf = (colour: string) => `${colour}14`;

/**
 * The little shapes the prototype scatters behind the tick: the small celebration of a register
 * kept, drawn out of this app's own colours. They carry no words and say nothing, so a teacher
 * reading the screen with their ears hears only what was saved.
 */
const confetti = [
  { top: 18, left: 30, size: 8, round: 2, colour: colors.accent },
  { top: 40, left: 62, size: 6, round: 999, colour: markColours.late },
  { top: 74, left: 24, size: 7, round: 2, colour: markColours.present },
  { top: 24, right: 40, size: 7, round: 999, colour: markColours.absent },
  { top: 60, right: 28, size: 9, round: 2, colour: colors.accent },
  { top: 104, right: 60, size: 6, round: 2, colour: markColours.late },
  { top: 112, left: 50, size: 7, round: 999, colour: markColours.absent },
  { bottom: 12, left: 40, size: 8, round: 999, colour: markColours.present },
  { bottom: 16, right: 36, size: 6, round: 999, colour: colors.accent },
  { bottom: 10, right: 72, size: 7, round: 2, colour: markColours.late },
];

/**
 * Attendance Saved: what a teacher sees the moment today's register is on the phone.
 *
 * It says that it is saved, which register it was — the class and the period it meets in — the day
 * it was taken on, who saved it, and how the class stood, added up in its three marks. Everything
 * on it is the register that was just kept: nothing here is worked out from anything else, and
 * nothing here is kept beside the records, which is the approved decision every summary in the app
 * follows.
 *
 * From it there are the two ways on the prototype draws: into that class's own report, where the
 * day can be looked at beside the days behind it, and back out to Home. The way back to the
 * register itself is where the way back always is, at the top left — the day is saved, and a
 * teacher who marked somebody wrong can change it and keep it again.
 */
export function AttendanceSavedScreen({
  classroom,
  saved,
  onBack,
  onViewReport,
  onHome,
}: {
  classroom: Classroom;
  saved: SavedRegister;
  onBack: () => void;
  onViewReport: () => void;
  onHome: () => void;
}) {
  const t = useWords();
  const dir = useDirection();
  // The day the register belongs to, said in words: read back out of the day that was saved, so
  // the screen says the day on the record and not whatever the clock has moved on to.
  const day = dayFromText(saved.day);

  return (
    <ScrollView
      style={{ flex: 1, direction: dir, backgroundColor: colors.background }}
      contentContainerStyle={{ paddingTop: 20, paddingBottom: space.room, gap: space.snug }}
    >
      {/* The way back to the register this was saved from, what this screen is about, and — drawn
          because the prototype draws it — the mark for what else can be done with a day's
          attendance, which is its own requirement and so is not announced as a button. */}
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: space.snug,
          paddingHorizontal: space.gap,
        }}
      >
        <Pressable accessibilityRole="button" accessibilityLabel={t('saved.back')} onPress={onBack}>
          <Text style={{ fontSize: 20, color: colors.text }}>←</Text>
        </Pressable>
        <Text accessibilityRole="header" style={{ fontSize: 16, fontWeight: '600', color: colors.text }}>
          {t('saved.title')}
        </Text>
        <Text style={{ fontSize: 18, color: colors.text }}>⋮</Text>
      </View>

      {/* The card the whole screen is about. */}
      <View
        style={{
          position: 'relative',
          overflow: 'hidden',
          alignItems: 'center',
          gap: space.snug,
          marginHorizontal: space.gap,
          marginTop: space.snug,
          backgroundColor: colors.card,
          borderRadius: radius.card,
          paddingHorizontal: space.gap,
          paddingTop: space.room,
          paddingBottom: space.gap,
          ...shadow.card,
        }}
      >
        {confetti.map((one, n) => (
          <View
            key={n}
            style={{
              position: 'absolute',
              ...(one.top === undefined ? {} : { top: one.top }),
              ...(one.bottom === undefined ? {} : { bottom: one.bottom }),
              ...(one.left === undefined ? {} : { left: one.left }),
              ...(one.right === undefined ? {} : { right: one.right }),
              width: one.size,
              height: one.size,
              borderRadius: one.round,
              backgroundColor: one.colour,
            }}
          />
        ))}

        {/* The tick. It is drawn out of padding and a round corner rather than pinned to a size, so
            the phone's largest text makes it larger along with everything round it. */}
        <View
          style={{
            alignItems: 'center',
            justifyContent: 'center',
            backgroundColor: markColours.present,
            borderRadius: 999,
            paddingHorizontal: 38,
            paddingVertical: 8,
            marginBottom: space.tight,
            ...shadow.soft,
          }}
        >
          <Text style={{ fontSize: 46, color: colors.onAccent }}>✓</Text>
        </View>

        <Text accessibilityRole="header" style={{ fontSize: 22, fontWeight: '700', color: colors.text, textAlign: 'center' }}>
          {t('saved.done')}
        </Text>
        <View style={{ alignItems: 'center', gap: 2 }}>
          <Text style={{ fontSize: 15, color: colors.muted, textAlign: 'center' }}>
            {t('saved.where', { class: classroom.name, period: classroom.period })}
          </Text>
          <Text style={{ fontSize: 15, color: colors.muted, textAlign: 'center' }}>
            {t('saved.when', { day: dayName(day), date: dateLabel(day) })}
          </Text>
          {/* Who saved it, which the phone keeps on every one of the day's own records. A teacher
              whose record keeps no name of its own is not named here — see lib/attendance-save.ts. */}
          {saved.savedBy ? (
            <Text style={{ fontSize: 13, color: colors.faint, textAlign: 'center', marginTop: 2 }}>
              {t('saved.by', { name: saved.savedBy })}
            </Text>
          ) : null}
        </View>

        {/* How the class stood, in the three marks: the register that was kept, added up. */}
        <View
          style={{
            flexDirection: 'row',
            justifyContent: 'center',
            flexWrap: 'wrap',
            alignSelf: 'stretch',
            gap: 12,
            marginTop: space.step,
          }}
        >
          {saved.summary.counts.map(({ mark, many }) => {
            const look = tileLook[mark];
            return (
              <View
                key={mark}
                accessibilityLabel={t('roster.tally', { name: t(look.name), many })}
                style={{
                  flex: 1,
                  flexBasis: 64,
                  alignItems: 'center',
                  gap: 2,
                  backgroundColor: washOf(look.colour),
                  borderRadius: 14,
                  paddingHorizontal: 8,
                  paddingVertical: 14,
                }}
              >
                <Text style={{ fontSize: 20, fontWeight: '700', color: look.colour }}>{many}</Text>
                <Text style={{ fontSize: 13, color: colors.text, textAlign: 'center' }}>{t(look.name)}</Text>
              </View>
            );
          })}
        </View>
      </View>

      {/* The two ways on the prototype draws: into the class's own report, and out to Home. */}
      <Pressable
        accessibilityRole="button"
        onPress={onViewReport}
        style={{
          alignItems: 'center',
          marginHorizontal: space.gap,
          marginTop: space.step,
          backgroundColor: colors.accent,
          borderRadius: radius.card,
          paddingHorizontal: space.step,
          paddingVertical: 16,
          ...shadow.accent,
        }}
      >
        <Text style={{ fontSize: 16, fontWeight: '600', color: colors.onAccent, textAlign: 'center' }}>
          {t('saved.report')}
        </Text>
      </Pressable>
      <Pressable
        accessibilityRole="button"
        onPress={onHome}
        style={{
          alignItems: 'center',
          marginHorizontal: space.gap,
          marginTop: space.tight,
          backgroundColor: colors.card,
          borderWidth: 1,
          borderColor: colors.line,
          borderRadius: radius.card,
          paddingHorizontal: space.step,
          paddingVertical: 16,
        }}
      >
        <Text style={{ fontSize: 16, fontWeight: '600', color: colors.accent, textAlign: 'center' }}>
          {t('saved.home')}
        </Text>
      </Pressable>

      {/* What a teacher can still do about today, said before they go looking for it. */}
      <Text
        style={{
          marginHorizontal: space.gap,
          marginTop: space.step,
          fontSize: 13,
          color: colors.faint,
          textAlign: 'center',
        }}
      >
        {t('saved.editWords')}
      </Text>
    </ScrollView>
  );
}
