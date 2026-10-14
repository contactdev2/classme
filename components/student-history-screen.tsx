import { Pressable, ScrollView, Text, View } from 'react-native';
import { classroomWithId } from '../lib/classes';
import type { AttendanceMark, ClassroomData, Student } from '../lib/classroom-data';
import { useDirection, useWords, type WordKey } from '../lib/i18n';
import { initialsOf } from '../lib/roster';
import { historyByMonth, historyOf, tallyOfHistory } from '../lib/student-history';
import { colors, markColours, radius, shadow, space } from '../lib/theme';
import { PlacesRow, type Place } from './places-row';
import { dateInWords, dayInWords, dayLook, monthInWords, washFor } from './student-look';

/** The three counts along the top, in the order the prototype draws them. */
const counts: { of: AttendanceMark; name: WordKey; colour: string }[] = [
  { of: 'Present', name: 'tally.present', colour: markColours.present },
  { of: 'Absent', name: 'tally.absent', colour: markColours.absent },
  { of: 'Late', name: 'tally.late', colour: markColours.late },
];

const card = {
  backgroundColor: colors.card,
  borderRadius: radius.card,
  padding: space.step,
  ...shadow.card,
} as const;

/**
 * Full Attendance Record: every day the phone has a mark against one student's name, and not a
 * handful of them. This is what 'View All' on their profile opens.
 *
 * The days run newest first, gathered under the month each of them falls in, so a term is read the
 * way a teacher thinks about it. Whose record it is stays at the top of it — their name, their
 * class and their own rate — because a list this long otherwise loses whose it is on the way down.
 *
 * Nothing is stored and nothing is asked of a network: the months, the counts and the rate are all
 * worked out from the daily records as the screen is drawn (lib/student-history.ts).
 */
export function StudentHistoryScreen({
  data,
  student,
  onBack,
  onGo,
}: {
  data: ClassroomData;
  student: Student;
  /** Back to the profile this was opened from. */
  onBack: () => void;
  onGo: (place: Place) => void;
}) {
  const t = useWords();
  const dir = useDirection();

  const days = historyOf(data, student.id);
  const tally = tallyOfHistory(days);
  const months = historyByMonth(days);
  const classroom = classroomWithId(data, student.classroomId);
  const wash = washFor(data, student);

  return (
    <View style={{ flex: 1, direction: dir, backgroundColor: colors.background }}>
      <ScrollView style={{ flex: 1 }} contentContainerStyle={{ paddingTop: 20, paddingBottom: space.gap, gap: space.step }}>
        {/* The way back to the profile this was opened from, and what this screen is. */}
        <View
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: space.snug,
            paddingHorizontal: space.step,
          }}
        >
          <Pressable accessibilityRole="button" accessibilityLabel={t('student.fullBack')} onPress={onBack}>
            <Text style={{ fontSize: 22, color: colors.accent }}>←</Text>
          </Pressable>
          <Text accessibilityRole="header" style={{ fontSize: 17, fontWeight: '700', color: colors.text }}>
            {t('student.fullTitle')}
          </Text>
          {/* The room the prototype leaves on the other side of the title, so the title itself
              sits in the middle of the screen and not beside the way back. */}
          <View style={{ width: 22 }} />
        </View>

        {/* Whose record this is, and what it comes to. */}
        <View
          style={{
            ...card,
            marginHorizontal: space.step,
            flexDirection: 'row',
            alignItems: 'center',
            flexWrap: 'wrap',
            gap: 12,
          }}
        >
          <View style={{ backgroundColor: wash.wash, borderRadius: 999, paddingHorizontal: 11, paddingVertical: 10 }}>
            <Text style={{ fontSize: 16, fontWeight: '700', color: wash.ink }}>{initialsOf(student.name)}</Text>
          </View>
          <View style={{ flex: 1, flexBasis: 130, gap: 2 }}>
            <Text style={{ fontSize: 15, fontWeight: '700', color: colors.text }}>{student.name}</Text>
            {classroom ? (
              <Text style={{ fontSize: 12, color: colors.muted }}>
                {t('student.in', { class: classroom.name, period: classroom.period })}
              </Text>
            ) : null}
          </View>
          <View style={{ alignItems: 'flex-end', gap: 2 }}>
            <Text style={{ fontSize: 16, fontWeight: '800', color: colors.accent }}>{t('class.rate', { rate: tally.rate })}</Text>
            <Text style={{ fontSize: 10, color: colors.muted }}>{t('student.rate')}</Text>
          </View>
        </View>

        {/* The three counts the whole record comes to, each one phrase to a screen reader. */}
        <View
          role="group"
          accessibilityLabel={t('student.summary')}
          style={{ flexDirection: 'row', flexWrap: 'wrap', gap: space.snug, paddingHorizontal: space.step }}
        >
          {counts.map((one) => {
            const many = one.of === 'Present' ? tally.present : one.of === 'Absent' ? tally.absent : tally.late;
            return (
              <View
                key={one.of}
                accessibilityLabel={t('roster.tally', { name: t(one.name), many })}
                style={{ ...card, flexGrow: 1, flexBasis: 90, alignItems: 'center', gap: 2, paddingHorizontal: space.snug }}
              >
                <Text style={{ fontSize: 16, fontWeight: '800', color: one.colour }}>{many}</Text>
                <Text style={{ fontSize: 11, color: colors.muted, textAlign: 'center' }}>{t(one.name)}</Text>
              </View>
            );
          })}
        </View>

        {/* The record itself: a month at a time, newest first, and every day of it under its own
            month. A list, each row named by the day and the mark on it, so a teacher reading the
            screen with their ears hears a record and not a heap of dates. */}
        {months.map((month) => (
          <View key={`${month.year}-${month.month}`} style={{ gap: space.snug, paddingHorizontal: space.step }}>
            <Text style={{ fontSize: 13, fontWeight: '700', color: colors.muted }}>
              {monthInWords(month.year, month.month)}
            </Text>
            <View role="list" accessibilityLabel={monthInWords(month.year, month.month)} style={{ gap: space.snug }}>
              {month.days.map((one) => {
                const look = dayLook[one.mark];
                return (
                  <View
                    key={one.day}
                    role="listitem"
                    accessibilityLabel={dayInWords(one)}
                    style={{
                      flexDirection: 'row',
                      alignItems: 'center',
                      flexWrap: 'wrap',
                      gap: space.snug,
                      backgroundColor: colors.card,
                      borderRadius: 14,
                      paddingHorizontal: 14,
                      paddingVertical: 12,
                      ...shadow.soft,
                    }}
                  >
                    <View style={{ width: 8, height: 8, borderRadius: 999, backgroundColor: look.colour }} />
                    <Text style={{ flexGrow: 1, fontSize: 13, color: colors.text }}>{dateInWords(one.day)}</Text>
                    <Text style={{ fontSize: 12, fontWeight: '700', color: look.colour }}>{t(look.name)}</Text>
                  </View>
                );
              })}
            </View>
          </View>
        ))}

        {/* A student nobody has marked yet: the record says so plainly rather than being an empty
            screen a teacher is left to interpret. */}
        {days.length === 0 ? (
          <View style={{ ...card, marginHorizontal: space.step }}>
            <Text style={{ fontSize: 13, color: colors.muted }}>{t('student.none')}</Text>
          </View>
        ) : null}
      </ScrollView>

      {/* The row along the foot, as the prototype draws it on this screen: the teacher is standing
          in Attendance, which is where a student's name was pressed. */}
      <PlacesRow here="attendance" onGo={onGo} />
    </View>
  );
}
