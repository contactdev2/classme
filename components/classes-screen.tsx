import { useState } from 'react';
import { Pressable, ScrollView, Text, View } from 'react-native';
import { classesShown, isArchived, studentsInClass, type ClassFilter } from '../lib/classes';
import type { Classroom, ClassroomData } from '../lib/classroom-data';
import { counted, useDirection, useWords, type WordKey } from '../lib/i18n';
import { colors, radius, shadow, space, useAppearance } from '../lib/theme';
import { PlacesRow, type Place } from './places-row';

/** The three filters, with the words each of them is named by and the sentence for an empty list. */
const tabs: { filter: ClassFilter; name: WordKey; none: WordKey }[] = [
  { filter: 'all', name: 'classes.all', none: 'classes.noneAll' },
  { filter: 'active', name: 'classes.active', none: 'classes.noneActive' },
  { filter: 'archived', name: 'classes.archived', none: 'classes.noneArchived' },
];

/** The soft tint behind a subject's own icon: the class's own colour, at a tenth of itself. */
const tintOf = (colour: string) => (/^#[0-9a-f]{6}$/i.test(colour) ? `${colour}1A` : colors.accentWash);

/**
 * My Classes: every class this teacher teaches, and the way into any one of them.
 *
 * Nothing here is fetched and nothing is waited for — the classes come in as the data the phone
 * already keeps, so the list is drawn the moment the screen opens. What is on the screen is only
 * ever this teacher's own classes: the phone keeps one teacher's records and nobody else's.
 */
export function ClassesScreen({
  data,
  onOpenClass,
  onGo,
}: {
  data: ClassroomData;
  onOpenClass: (classroomId: string) => void;
  onGo: (place: Place) => void;
}) {
  const t = useWords();
  const dir = useDirection();
  // Redrawn the moment a teacher flips Dark Mode in their own profile menu: the colours below are
  // whichever of the two looks the app is wearing. See lib/theme.ts.
  useAppearance();
  // Opens on the classes being taught, as the prototype draws it: the term in front of the teacher,
  // with the ones they have put away a press away.
  const [filter, setFilter] = useState<ClassFilter>('active');
  const showing = classesShown(data, filter);
  const empty = tabs.find((one) => one.filter === filter)!.none;

  return (
    <View style={{ flex: 1, direction: dir, backgroundColor: colors.background }}>
      <ScrollView style={{ flex: 1 }} contentContainerStyle={{ paddingTop: 20, paddingBottom: space.gap }}>
        {/* The screen's own top row: the way back to Home, the screen's name, and — drawn because
            the prototype draws it — the mark for making a class, which is its own requirement and
            so has nothing behind it yet and is deliberately not announced as a button. */}
        <View
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: space.snug,
            paddingHorizontal: space.gap,
            paddingBottom: space.snug,
          }}
        >
          <Pressable accessibilityRole="button" accessibilityLabel={t('classes.back')} onPress={() => onGo('home')}>
            <Text style={{ fontSize: 22, color: colors.text }}>‹</Text>
          </Pressable>
          <Text accessibilityRole="header" style={{ fontSize: 18, fontWeight: '700', color: colors.text }}>
            {t('classes.title')}
          </Text>
          <Text style={{ fontSize: 22, fontWeight: '700', color: colors.accent }}>+</Text>
        </View>

        {/* Which classes to show: all of them, the ones being taught, or the ones put away. They are
            announced as the one-of-three choice they are, so a screen reader says which is in use. */}
        <View
          accessibilityRole="radiogroup"
          style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, paddingHorizontal: space.gap, paddingBottom: space.step }}
        >
          {tabs.map((tab) => {
            const chosen = tab.filter === filter;
            return (
              <Pressable
                key={tab.filter}
                accessibilityRole="radio"
                accessibilityState={{ checked: chosen }}
                onPress={() => setFilter(tab.filter)}
                style={{
                  backgroundColor: chosen ? colors.accent : colors.accentWash,
                  borderRadius: 20,
                  paddingHorizontal: 18,
                  paddingVertical: 8,
                  ...(chosen ? shadow.accent : {}),
                }}
              >
                <Text style={{ fontSize: 13, fontWeight: '600', color: chosen ? colors.onAccent : colors.accent }}>
                  {t(tab.name)}
                </Text>
              </Pressable>
            );
          })}
        </View>

        {/* The classes themselves, each a card a finger opens. */}
        <View style={{ paddingHorizontal: space.gap, gap: 14 }}>
          {showing.map((classroom) => (
            <ClassCard key={classroom.id} classroom={classroom} students={studentsInClass(data, classroom.id)} onOpen={onOpenClass} />
          ))}
          {showing.length === 0 ? (
            <View
              style={{
                backgroundColor: colors.card,
                borderRadius: radius.card,
                padding: space.step,
                gap: 4,
                ...shadow.card,
              }}
            >
              <Text style={{ fontSize: 16, fontWeight: '700', color: colors.text }}>{t(empty)}</Text>
              <Text style={{ fontSize: 13, color: colors.muted }}>{t('classes.noneWords')}</Text>
            </View>
          ) : null}
        </View>
      </ScrollView>

      <PlacesRow here="classes" onGo={onGo} />
    </View>
  );
}

/** One class, as a teacher picks it out of their own list: what it is called, when it meets, how many are in it. */
function ClassCard({
  classroom,
  students,
  onOpen,
}: {
  classroom: Classroom;
  students: number;
  onOpen: (classroomId: string) => void;
}) {
  const t = useWords();
  // Redrawn the moment a teacher flips Dark Mode in their own profile menu: the colours below are
  // whichever of the two looks the app is wearing. See lib/theme.ts.
  useAppearance();
  return (
    <Pressable
      accessibilityRole="button"
      onPress={() => onOpen(classroom.id)}
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        flexWrap: 'wrap',
        gap: 14,
        backgroundColor: colors.card,
        borderRadius: radius.card,
        padding: space.step,
        ...shadow.card,
      }}
    >
      {/* The subject's own icon, on a wash of the colour the teacher chose for this class. */}
      <View
        style={{
          backgroundColor: tintOf(classroom.colour),
          borderRadius: radius.field,
          paddingHorizontal: 12,
          paddingVertical: 10,
        }}
      >
        <Text style={{ fontSize: 20, fontWeight: '700', color: classroom.colour }}>{classroom.subject}</Text>
      </View>
      <View style={{ flex: 1, gap: 2 }}>
        <Text style={{ fontSize: 16, fontWeight: '700', color: colors.text }}>{classroom.name}</Text>
        <Text style={{ fontSize: 13, color: colors.muted }}>
          {t('classes.meta', { period: classroom.period, students: counted(students, 'student') })}
        </Text>
        {/* A class put away says so on its own card, so the All list is never a puzzle. */}
        {isArchived(classroom) ? (
          <Text
            style={{
              alignSelf: 'flex-start',
              fontSize: 11,
              fontWeight: '700',
              color: colors.muted,
              backgroundColor: colors.background,
              borderRadius: radius.pill,
              paddingHorizontal: 8,
              paddingVertical: 4,
              marginTop: 4,
            }}
          >
            {t('classes.archived')}
          </Text>
        ) : null}
      </View>
      <Text style={{ fontSize: 18, color: colors.faint }}>›</Text>
    </Pressable>
  );
}
