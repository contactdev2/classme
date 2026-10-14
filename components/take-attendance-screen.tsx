import { useState } from 'react';
import { Pressable, ScrollView, Text, TextInput, View } from 'react-native';
import type { ClassroomData, Student } from '../lib/classroom-data';
import { sayAround, useDirection, useWords, type WordKey } from '../lib/i18n';
import {
  classToMarkIn,
  countedBy,
  everyonePresent,
  initialsOf,
  markedAs,
  markOf,
  nextMarkAfter,
  rosterFilters,
  rosterOf,
  rosterShown,
  summaryOfRoster,
  tallyOfRoster,
  type RosterFilter,
} from '../lib/roster';
import { avatarWashes, colors, markColours, radius, shadow, space } from '../lib/theme';
import { dateLabel, dayName } from '../lib/week';

/** What each filter is called, and what the roster says when nobody answers it. */
const filterWords: Record<RosterFilter, WordKey> = {
  all: 'roster.all',
  Present: 'mark.present',
  Absent: 'mark.absent',
  Late: 'mark.late',
};

/**
 * Each mark's own colour, the word for it, and the signs the prototype draws around that word: a
 * tick for a student who is here, a cross for one who is not, and a clock on the one who came in
 * after the bell. The word carries the meaning on its own — the signs are beside it, never instead
 * of it, so a screen read with the ears says the same thing as one read with the eyes.
 */
const markLook = {
  Present: { name: 'mark.present' as WordKey, colour: markColours.present, before: '', sign: '✓' },
  Absent: { name: 'mark.absent' as WordKey, colour: markColours.absent, before: '', sign: '✕' },
  Late: { name: 'mark.late' as WordKey, colour: markColours.late, before: '⏰ ', sign: '✕' },
} as const;

/** A mark's colour, washed out, behind the word for it. */
const washOf = (colour: string) => `${colour}26`;

/** The soft tint behind a subject's own icon: the class's own colour, at a tenth of itself. */
const tintOf = (colour: string) => (/^#[0-9a-f]{6}$/i.test(colour) ? `${colour}1A` : colors.accentWash);

/**
 * Take Attendance: one class's register, in the few seconds a teacher has at the start of a period.
 *
 * It opens with every student on the roster marked Present, because that is what a full class is
 * and a register is mostly the handful who are not there. Nothing is read off a saved mark and
 * nothing is waited for: the roster is the class as the phone already keeps it, and the marks start
 * where lib/roster.ts says a register starts.
 *
 * From there a teacher marks the exceptions: a student's own status is a button, and pressing it
 * takes that one student round Present, Absent and Late. Nothing is written to the phone yet —
 * keeping the register is its own requirement — so what is held here is the register as it stands
 * under the teacher's thumb.
 *
 * Along the foot, beside the way to keep it, the class is added up: Present, Absent and Late, each
 * with how many stand at it, for the one look a teacher gives a register before they save it. The
 * three come to the number of students in the class, they follow every tap at once, and they add up
 * the whole class and not the part of it a filter or a search happens to be showing.
 *
 * The clock is a prop so a check can arrive on a particular morning; on a phone it is the phone's.
 */
export function TakeAttendanceScreen({
  data,
  classroomId = null,
  onBack,
  now = new Date(),
}: {
  data: ClassroomData;
  classroomId?: string | null;
  onBack: () => void;
  now?: Date;
}) {
  const t = useWords();
  const dir = useDirection();
  const classroom = classToMarkIn(data, classroomId);
  const roster = classroom ? rosterOf(data, classroom.id) : [];

  // Where the register starts — everybody present — and where it stands once the teacher has
  // marked the exceptions. The class it was seeded for is held beside it, so a teacher who changes
  // which class they are marking gets that class's own register and not the last one's marks: the
  // ids are another class's, and a roster read through them would show everybody present anyway,
  // which would be a lie about a mark nobody had made.
  const [marks, setMarks] = useState(() => everyonePresent(roster));
  const [seededFor, setSeededFor] = useState(classroom?.id ?? null);
  if (seededFor !== (classroom?.id ?? null)) {
    setSeededFor(classroom?.id ?? null);
    setMarks(everyonePresent(roster));
  }
  const [filter, setFilter] = useState<RosterFilter>('all');
  const [looking, setLooking] = useState('');

  /** One student's status pressed: that student on to the next of the three marks, nobody else. */
  const markNext = (student: Student) => setMarks((standing) => markedAs(standing, student.id, nextMarkAfter(markOf(standing, student))));

  const tally = tallyOfRoster(roster, marks);
  // How the class stands, for the look a teacher gives the bar before they keep the register:
  // worked out from the marks under their thumb, never kept beside them, so a tap on one student's
  // status moves it in the same breath.
  const summary = summaryOfRoster(roster, marks);
  const showing = rosterShown(roster, marks, filter, looking);

  return (
    <View style={{ flex: 1, direction: dir, backgroundColor: colors.background }}>
      <ScrollView style={{ flex: 1 }} contentContainerStyle={{ paddingTop: 20, paddingBottom: space.step, gap: space.snug }}>
        {/* The way back to where the teacher came from, the screen's own name, and — drawn because
            the prototype draws it — the mark for what else can be done with a register, which is
            its own requirement and so has nothing behind it yet and is not announced as a button. */}
        <View
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: space.snug,
            paddingHorizontal: space.step,
          }}
        >
          <Pressable accessibilityRole="button" accessibilityLabel={t('roster.back')} onPress={onBack}>
            <Text style={{ fontSize: 22, color: colors.text }}>‹</Text>
          </Pressable>
          <Text accessibilityRole="header" style={{ fontSize: 18, fontWeight: '700', color: colors.text }}>
            {t('roster.title')}
          </Text>
          <Text style={{ fontSize: 18, color: colors.text }}>⋮</Text>
        </View>

        {/* Which register this is: the class, the period it meets in, and today's date. The mark
            for choosing another class is drawn as the prototype draws it; switching classes from
            here is its own requirement, and a teacher can already open the class they want from
            My Classes. */}
        {classroom ? (
          <View
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              flexWrap: 'wrap',
              gap: 12,
              marginHorizontal: space.step,
              backgroundColor: colors.card,
              borderRadius: radius.card,
              paddingHorizontal: 14,
              paddingVertical: 12,
              ...shadow.card,
            }}
          >
            <View
              style={{
                backgroundColor: tintOf(classroom.colour),
                borderRadius: radius.pill,
                paddingHorizontal: 10,
                paddingVertical: 8,
              }}
            >
              <Text style={{ fontSize: 18, fontWeight: '700', color: classroom.colour }}>{classroom.subject}</Text>
            </View>
            <View style={{ flex: 1, flexBasis: 160, gap: 2 }}>
              <Text style={{ fontSize: 15, fontWeight: '700', color: colors.text }}>{classroom.name}</Text>
              <Text style={{ fontSize: 12, color: colors.muted }}>
                {t('roster.when', { period: classroom.period, day: dayName(now), date: dateLabel(now) })}
              </Text>
            </View>
            <Text style={{ fontSize: 14, color: colors.faint }}>▾</Text>
          </View>
        ) : null}

        {/* How the class stands, four ways: everybody, and each of the three marks with how many of
            them are at it. Announced as the one-of-four choice it is, so a screen reader says which
            is in use. */}
        <View
          accessibilityRole="radiogroup"
          style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6, paddingHorizontal: space.step }}
        >
          {rosterFilters.map((one) => {
            const chosen = one === filter;
            const ink = one === 'all' ? colors.accent : markLook[one].colour;
            return (
              <Pressable
                key={one}
                accessibilityRole="radio"
                accessibilityState={{ checked: chosen }}
                onPress={() => setFilter(one)}
                style={{
                  backgroundColor: chosen ? ink : colors.card,
                  borderRadius: radius.pill,
                  paddingHorizontal: 10,
                  paddingVertical: 7,
                  ...(chosen ? shadow.soft : { borderWidth: 1, borderColor: colors.line }),
                }}
              >
                <Text style={{ fontSize: 12, fontWeight: '600', color: chosen ? colors.onAccent : ink }}>
                  {t('roster.counted', { name: t(filterWords[one]), many: countedBy(tally, one) })}
                </Text>
              </Pressable>
            );
          })}
        </View>

        {/* Finding one student in a class of two dozen. */}
        <View
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            gap: 8,
            marginHorizontal: space.step,
            backgroundColor: colors.card,
            borderWidth: 1,
            borderColor: colors.line,
            borderRadius: radius.field,
            paddingHorizontal: 12,
            paddingVertical: 9,
          }}
        >
          <Text style={{ fontSize: 14, color: colors.faint }}>🔍</Text>
          <TextInput
            accessibilityLabel={t('roster.search')}
            autoCorrect={false}
            placeholder={t('roster.searchPlaceholder')}
            placeholderTextColor={colors.faint}
            value={looking}
            onChangeText={setLooking}
            style={{ flex: 1, fontSize: 13, color: colors.text, paddingVertical: 0 }}
          />
        </View>

        {/* The register itself: a row for each student, and what they are marked as. Announced as
            the list it is, each row named by the student standing on it, so a teacher reading the
            screen with their ears hears a register and not a heap of words. */}
        <View role="list" style={{ paddingHorizontal: space.step, gap: 8 }}>
          {showing.map((student) => {
            const mark = markOf(marks, student);
            const look = markLook[mark];
            const wash = avatarWashes[roster.indexOf(student) % avatarWashes.length];
            return (
              <View
                key={student.id}
                role="listitem"
                accessibilityLabel={student.name}
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  flexWrap: 'wrap',
                  gap: 10,
                  backgroundColor: colors.card,
                  borderRadius: 14,
                  paddingHorizontal: 12,
                  paddingVertical: 10,
                  ...shadow.soft,
                }}
              >
                {/* The student's own initials, where the prototype draws their face. A photo is
                    kept against a student (lib/classroom-data.ts) and showing it here is its own
                    requirement; initials are what a register has for everybody. */}
                <View style={{ backgroundColor: wash.wash, borderRadius: radius.pill, paddingHorizontal: 9, paddingVertical: 8 }}>
                  <Text style={{ fontSize: 13, fontWeight: '700', color: wash.ink }}>{initialsOf(student.name)}</Text>
                </View>
                <Text style={{ flex: 1, flexBasis: 120, fontSize: 14, fontWeight: '600', color: colors.text }}>
                  {student.name}
                </Text>
                {/* What they are marked as, and the way to change it: one press takes this one
                    student on to the next of the three marks. It is named by the student standing
                    on it, so a teacher reading the screen with their ears is told whose mark they
                    are about to change — and so that two students sharing a surname are two
                    different buttons. */}
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel={t('roster.change', { name: student.name, mark: t(look.name) })}
                  onPress={() => markNext(student)}
                  style={{
                    backgroundColor: washOf(look.colour),
                    borderRadius: radius.pill,
                    paddingHorizontal: 10,
                    paddingVertical: 6,
                  }}
                >
                  <Text style={{ fontSize: 12, fontWeight: '600', color: look.colour }}>
                    {look.before}
                    {t(look.name)} {look.sign}
                  </Text>
                </Pressable>
              </View>
            );
          })}

          {/* An empty register says which emptiness it is, rather than showing nothing at all. */}
          {showing.length === 0 ? (
            <View style={{ backgroundColor: colors.card, borderRadius: radius.card, padding: space.step, gap: 4, ...shadow.card }}>
              <Text style={{ fontSize: 16, fontWeight: '700', color: colors.text }}>
                {classroom ? t('roster.noneTitle') : t('classes.noneAll')}
              </Text>
              <Text style={{ fontSize: 13, color: colors.muted }}>
                {!classroom
                  ? t('roster.noClassWords')
                  : looking.trim() !== ''
                    ? t('roster.noneFound')
                    : t('roster.noneMarked')}
              </Text>
            </View>
          ) : null}
        </View>
      </ScrollView>

      {/*
        The foot of the screen, outside everything that scrolls, so how the class stands and the way
        to keep it are both under the teacher's thumb however long the register above them grows.
      */}
      <View
        style={{
          gap: space.snug,
          backgroundColor: colors.card,
          borderTopWidth: 1,
          borderTopColor: colors.line,
          paddingHorizontal: space.step,
          paddingTop: 12,
          paddingBottom: 18,
        }}
      >
        <View
          role="group"
          accessibilityLabel={t('roster.summary')}
          style={{ flexDirection: 'row', justifyContent: 'space-between', flexWrap: 'wrap', gap: space.snug }}
        >
          {summary.counts.map(({ mark, many }) => {
            // The mark's own word, and its count written in the mark's own colour: three numbers a
            // teacher reads at a glance, which is the whole use of a summary. The phrase is cut in
            // the language's own words, so a language that writes the number first still reads
            // right — and the whole of it is what a screen reader says, in one breath.
            const said = t('roster.tally', { name: t(markLook[mark].name), many });
            const { before, piece, after } = sayAround('roster.tally', 'many', {
              name: t(markLook[mark].name),
              many,
            });
            return (
              <Text
                key={mark}
                accessibilityLabel={said}
                style={{ fontSize: 13, fontWeight: '600', color: colors.text }}
              >
                {before}
                <Text style={{ fontSize: 13, fontWeight: '700', color: markLook[mark].colour }}>{piece}</Text>
                {after}
              </Text>
            );
          })}
        </View>
        {/* Keeping the register is its own requirement — the marks a teacher changes and the record
            they become are one piece of work — so the button the prototype draws is drawn here and,
            like the mark beside the screen's name, is deliberately not announced as a button yet. */}
        <Text
          style={{
            textAlign: 'center',
            backgroundColor: colors.accent,
            color: colors.onAccent,
            borderRadius: 14,
            paddingVertical: 14,
            fontSize: 15,
            fontWeight: '700',
            ...shadow.accent,
          }}
        >
          {t('roster.save')}
        </Text>
      </View>
    </View>
  );
}
