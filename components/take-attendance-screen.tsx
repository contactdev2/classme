import { useState } from 'react';
import { Pressable, ScrollView, Text, TextInput, View } from 'react-native';
import type { ClassroomData } from '../lib/classroom-data';
import { useDirection, useWords, type WordKey } from '../lib/i18n';
import {
  classToMarkIn,
  countedBy,
  everyonePresent,
  initialsOf,
  markOf,
  rosterFilters,
  rosterOf,
  rosterShown,
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
 * Each mark's own colour, the word for it, and the sign the prototype draws beside that word: a
 * tick for a student who is here, a cross for one who is not.
 */
const markLook = {
  Present: { name: 'mark.present' as WordKey, colour: markColours.present, sign: '✓' },
  Absent: { name: 'mark.absent' as WordKey, colour: markColours.absent, sign: '✕' },
  Late: { name: 'mark.late' as WordKey, colour: markColours.late, sign: '✕' },
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

  // Where the register starts: everybody present. Marking one student another way is its own
  // requirement; what is held here is the register as it stands, so that requirement has only to
  // change one student's mark in it.
  const [marks] = useState(() => everyonePresent(roster));
  const [filter, setFilter] = useState<RosterFilter>('all');
  const [looking, setLooking] = useState('');

  const tally = tallyOfRoster(roster, marks);
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
                {/* What they are marked as. Changing it is its own requirement, so this says what
                    it says and is deliberately not announced as a button. */}
                <Text
                  style={{
                    fontSize: 12,
                    fontWeight: '600',
                    color: look.colour,
                    backgroundColor: washOf(look.colour),
                    borderRadius: radius.pill,
                    paddingHorizontal: 10,
                    paddingVertical: 6,
                  }}
                >
                  {t(look.name)} {look.sign}
                </Text>
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
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', flexWrap: 'wrap', gap: space.snug }}>
          {(['Present', 'Absent', 'Late'] as const).map((mark) => (
            <Text key={mark} style={{ fontSize: 13, fontWeight: '600', color: colors.text }}>
              {t('roster.tally', { name: t(markLook[mark].name), many: countedBy(tally, mark) })}
            </Text>
          ))}
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
