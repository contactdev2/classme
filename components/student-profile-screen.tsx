import { useState } from 'react';
import { Pressable, ScrollView, Text, View } from 'react-native';
import { classroomWithId } from '../lib/classes';
import type { ClassroomData, Student } from '../lib/classroom-data';
import { sayAround, useDirection, useWords, type WordKey } from '../lib/i18n';
import { initialsOf } from '../lib/roster';
import { historyOf, latestMonth, recentDays, tallyOfHistory, type HistoryDay } from '../lib/student-history';
import { colors, markColours, radius, shadow, space, useAppearance } from '../lib/theme';
import type { Place } from './places-row';
import { StudentHistoryScreen } from './student-history-screen';
import { dateInWords, dayInWords, dayLook, washFor, washOf } from './student-look';

/** Which of the profile's tabs a teacher is standing on. */
type ProfileTab = 'overview' | 'attendance';

/** The two that show something, in the order the prototype draws them. Notes is its own requirement. */
const tabs: { tab: ProfileTab; name: WordKey }[] = [
  { tab: 'overview', name: 'student.overview' },
  { tab: 'attendance', name: 'student.attendance' },
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
 * One student's own profile: their attendance over time, as a teacher looks it up.
 *
 * The Overview says what their term comes to — the share of days they were present, how many days
 * they were away, and how many they came in late on — with the days most recently taken under it.
 * The Attendance tab is the same term read day by day, with the month they are in added up at the
 * foot of it. 'View All' opens the whole record, every day the phone has a mark against their name.
 *
 * Every number on it is this student's own, worked out here and now from the marks the phone
 * already keeps against their name: a class they sit in is never consulted, nothing is stored
 * twice, and nothing is asked of a network. None of it leaves the phone.
 *
 * Notes is drawn because the prototype draws it and has nothing behind it: nothing on the phone
 * keeps a note against a student yet, so the Teacher Note card says so plainly rather than showing
 * words about a student that nobody wrote.
 */
export function StudentProfileScreen({
  data,
  student,
  onBack,
  onGo,
}: {
  data: ClassroomData;
  student: Student;
  /** Back to the register the student's name was pressed on. */
  onBack: () => void;
  /** Out to one of the app's own places, from the row along the foot of the full record. */
  onGo: (place: Place) => void;
}) {
  const t = useWords();
  const dir = useDirection();
  // Redrawn the moment a teacher flips Dark Mode in their own profile menu: the colours below are
  // whichever of the two looks the app is wearing. See lib/theme.ts.
  useAppearance();
  const [tab, setTab] = useState<ProfileTab>('overview');
  const [showingAll, setShowingAll] = useState(false);

  const days = historyOf(data, student.id);
  const tally = tallyOfHistory(days);
  const recent = recentDays(days);
  const month = latestMonth(days);
  const classroom = classroomWithId(data, student.classroomId);
  const wash = washFor(data, student);

  // The month they are in, added up for the foot of the Attendance tab: every day of it this phone
  // has a mark for, and how those days went. Worked out from the days themselves, like every other
  // number here, so a month can never drift from the days under it.
  const monthSaid = month
    ? t('student.monthSummary', { month: t(`monthFull.${month.month}` as WordKey) })
    : '';
  const ofTheMonth = month ? tallyOfHistory(month.days) : null;
  const monthCounts: { name: WordKey; many: number; colour: string }[] = ofTheMonth
    ? [
        { name: 'student.tracked', many: ofTheMonth.total, colour: colors.text },
        { name: 'tally.present', many: ofTheMonth.present, colour: markColours.present },
        { name: 'tally.absent', many: ofTheMonth.absent, colour: markColours.absent },
        { name: 'tally.late', many: ofTheMonth.late, colour: markColours.late },
      ]
    : [];

  // The whole record, which is what 'View All' opens: a screen this one shows in its own place, so
  // the way back out of it is to this profile and the register behind it is still the register.
  if (showingAll) {
    return <StudentHistoryScreen data={data} student={student} onBack={() => setShowingAll(false)} onGo={onGo} />;
  }

  /** One of the three numbers at the top: the figure, and what it is a figure of. */
  const tile = (name: WordKey, figure: string, colour: string) => (
    <View
      key={name}
      accessibilityLabel={t('roster.tally', { name: t(name), many: figure })}
      style={{ ...card(), flexGrow: 1, flexBasis: 90, alignItems: 'center', gap: 4, paddingHorizontal: space.snug }}
    >
      <Text style={{ fontSize: 22, fontWeight: '800', color: colour }}>{figure}</Text>
      <Text style={{ fontSize: 11, color: colors.muted, textAlign: 'center' }}>{t(name)}</Text>
    </View>
  );

  /** One day of their history: the sign for the mark, the date, and the mark in its own colour. */
  const dayRow = (one: HistoryDay, last: boolean) => {
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
          paddingVertical: 12,
          ...(last ? {} : { borderBottomWidth: 1, borderBottomColor: colors.line }),
        }}
      >
        <View style={{ backgroundColor: washOf(look.colour), borderRadius: 999, paddingHorizontal: 6, paddingVertical: 4 }}>
          <Text style={{ fontSize: 12, color: look.colour }}>{look.sign}</Text>
        </View>
        <Text style={{ flexGrow: 1, fontSize: 14, color: colors.text }}>{dateInWords(one.day)}</Text>
        <Text style={{ fontSize: 13, fontWeight: '700', color: look.colour }}>{t(look.name)}</Text>
      </View>
    );
  };

  return (
    <ScrollView
      style={{ flex: 1, direction: dir, backgroundColor: colors.background }}
      contentContainerStyle={{ paddingTop: 20, paddingBottom: space.room, gap: space.step }}
    >
      {/* The way back to the register this student's name was pressed on, what this screen is, and
          — drawn because the prototype draws it — the mark for what else can be done with a
          student, which is its own requirement and so is not announced as a button. */}
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: space.snug,
          paddingHorizontal: space.step,
        }}
      >
        <Pressable accessibilityRole="button" accessibilityLabel={t('student.back')} onPress={onBack}>
          <Text style={{ fontSize: 22, color: colors.accent }}>←</Text>
        </Pressable>
        <Text accessibilityRole="header" style={{ fontSize: 17, fontWeight: '700', color: colors.text }}>
          {t('student.title')}
        </Text>
        <Text style={{ fontSize: 18, color: colors.text }}>⋮</Text>
      </View>

      {/* Whose profile this is: their initials where the prototype draws their face, their name,
          and the class of the teacher's own that they are in. A photo is kept against a student
          (lib/classroom-data.ts) and drawing it is the photo requirement's to add, here and on the
          register; initials are what the app has for everybody. */}
      <View
        style={{
          ...card(),
          marginHorizontal: space.step,
          flexDirection: 'row',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: 14,
        }}
      >
        <View style={{ backgroundColor: wash.wash, borderRadius: 999, paddingHorizontal: 14, paddingVertical: 12 }}>
          <Text style={{ fontSize: 20, fontWeight: '700', color: wash.ink }}>{initialsOf(student.name)}</Text>
        </View>
        <View style={{ flex: 1, flexBasis: 140, gap: 2 }}>
          <Text style={{ fontSize: 18, fontWeight: '700', color: colors.text }}>{student.name}</Text>
          {classroom ? (
            <Text style={{ fontSize: 13, color: colors.muted }}>
              {t('student.in', { class: classroom.name, period: classroom.period })}
            </Text>
          ) : null}
        </View>
      </View>

      {/* Overview and Attendance, one of them in use — announced as the one-of-three choice it is,
          so a screen reader says which. Notes is drawn and has nothing behind it: nothing on the
          phone keeps a note against a student yet, and a control that answers nothing should not
          say that it does. */}
      <View
        accessibilityRole="radiogroup"
        style={{
          flexDirection: 'row',
          flexWrap: 'wrap',
          backgroundColor: colors.card,
          borderRadius: radius.card,
          padding: 4,
          marginHorizontal: space.step,
          ...shadow.soft,
        }}
      >
        {tabs.map((one) => {
          const here = one.tab === tab;
          return (
            <Pressable
              key={one.tab}
              accessibilityRole="radio"
              accessibilityState={{ checked: here }}
              onPress={() => setTab(one.tab)}
              style={{
                flexGrow: 1,
                flexBasis: 80,
                alignItems: 'center',
                borderRadius: radius.field,
                paddingVertical: 10,
                backgroundColor: here ? colors.accent : colors.card,
                ...(here ? shadow.soft : {}),
              }}
            >
              <Text style={{ fontSize: 14, fontWeight: here ? '700' : '600', color: here ? colors.onAccent : colors.muted }}>
                {t(one.name)}
              </Text>
            </Pressable>
          );
        })}
        <Text
          style={{
            flexGrow: 1,
            flexBasis: 80,
            textAlign: 'center',
            paddingVertical: 10,
            fontSize: 14,
            fontWeight: '600',
            color: colors.muted,
          }}
        >
          {t('student.notes')}
        </Text>
      </View>

      {/* What their term comes to: the share of days they were present, the days they were away,
          and the days they came in late. Each is one phrase to a screen reader, and the figure in
          it is written in its own colour, as the prototype draws it. */}
      <View
        role="group"
        accessibilityLabel={t('student.summary')}
        style={{ flexDirection: 'row', flexWrap: 'wrap', gap: space.snug, paddingHorizontal: space.step }}
      >
        {tile('student.rate', t('class.rate', { rate: tally.rate }), colors.accent)}
        {tile('student.absences', String(tally.absent), markColours.absent)}
        {tile('student.lates', String(tally.late), markColours.late)}
      </View>

      {/* The days most recently taken, and the way to the whole of them. */}
      <View style={{ gap: space.snug, paddingHorizontal: space.step }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: space.tight }}>
          <Text style={{ fontSize: 15, fontWeight: '700', color: colors.text }}>{t('student.recent')}</Text>
          {days.length === 0 ? null : (
            <Pressable accessibilityRole="button" onPress={() => setShowingAll(true)}>
              <Text style={{ fontSize: 13, fontWeight: '700', color: colors.accent }}>{t('student.viewAll')}</Text>
            </Pressable>
          )}
        </View>
        <View role="list" accessibilityLabel={t('student.history')} style={{ ...card(), paddingVertical: 2 }}>
          {recent.map((one, n) => dayRow(one, n === recent.length - 1))}
          {/* A student nobody has marked yet says which emptiness it is, rather than showing an
              empty card under a heading. */}
          {days.length === 0 ? (
            <Text style={{ fontSize: 13, color: colors.muted, paddingVertical: 12 }}>{t('student.none')}</Text>
          ) : null}
        </View>
      </View>

      {/* And the one thing each tab has of its own: on Overview, the note a teacher keeps about
          this student; on Attendance, the month they are in, added up. */}
      {tab === 'overview' ? (
        <View style={{ ...card(), marginHorizontal: space.step, flexDirection: 'row', alignItems: 'flex-start', flexWrap: 'wrap', gap: space.snug }}>
          <Text style={{ fontSize: 18 }}>💬</Text>
          <View style={{ flex: 1, flexBasis: 180, gap: 4 }}>
            <Text style={{ fontSize: 13, fontWeight: '700', color: colors.text }}>{t('student.noteTitle')}</Text>
            <Text style={{ fontSize: 13, color: colors.muted }}>{t('student.noNote')}</Text>
          </View>
        </View>
      ) : month ? (
        <View style={{ ...card(), marginHorizontal: space.step, gap: space.snug }}>
          <Text style={{ fontSize: 15, fontWeight: '700', color: colors.text }}>{monthSaid}</Text>
          <View
            role="group"
            accessibilityLabel={monthSaid}
            style={{ flexDirection: 'row', justifyContent: 'space-between', flexWrap: 'wrap', gap: space.snug }}
          >
            {monthCounts.map((one) => {
              // The count's own number drawn in the mark's colour, with the words around it in the
              // screen's ink: the phrase is cut in this language's own words, so a language that
              // writes the number first still reads right — and the whole of it is what a screen
              // reader says, in one breath. See lib/i18n.ts.
              const said = t('roster.tally', { name: t(one.name), many: one.many });
              const { before, piece, after } = sayAround('roster.tally', 'many', { name: t(one.name), many: one.many });
              return (
                <Text key={one.name} accessibilityLabel={said} style={{ fontSize: 13, color: colors.muted }}>
                  {before}
                  <Text style={{ fontSize: 13, fontWeight: '700', color: one.colour }}>{piece}</Text>
                  {after}
                </Text>
              );
            })}
          </View>
        </View>
      ) : null}
    </ScrollView>
  );
}
