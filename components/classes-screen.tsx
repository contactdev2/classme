import { useState } from 'react';
import { Pressable, ScrollView, Text, View } from 'react-native';
import { classesShown, isArchived, studentsInClass, type ClassFilter } from '../lib/classes';
import type { Classroom, ClassroomData } from '../lib/classroom-data';
import { counted, useDirection, useWords, type WordKey } from '../lib/i18n';
import { colors, radius, shadow, space, useAppearance } from '../lib/theme';
import { NewClassroomScreen } from './new-classroom-screen';
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
 * My Classes: every class this teacher teaches, the way into any one of them, and the way to make
 * one of their own.
 *
 * Nothing here is fetched and nothing is waited for — the classes come in as the data the phone
 * already keeps, so the list is drawn the moment the screen opens. What is on the screen is only
 * ever this teacher's own classes: the phone keeps one teacher's records and nobody else's.
 *
 * The form where a classroom is made is a screen this one shows and not a route of its own — the
 * decision the confirmation after a saved register took, and for the same reason: the list stays
 * standing behind it, so a teacher who makes a class is already looking at the place it appears in,
 * with the sentence saying it was made.
 */
export function ClassesScreen({
  data,
  onOpenClass,
  onGo,
  onMade,
}: {
  data: ClassroomData;
  onOpenClass: (classroomId: string) => void;
  onGo: (place: Place) => void;
  /** A classroom was made: everything the phone keeps now, so every screen reads the same thing. */
  onMade: (kept: ClassroomData) => void;
}) {
  const t = useWords();
  const dir = useDirection();
  // Redrawn the moment a teacher flips Dark Mode in their own profile menu: the colours below are
  // whichever of the two looks the app is wearing. See lib/theme.ts.
  useAppearance();
  // Opens on the classes being taught, as the prototype draws it: the term in front of the teacher,
  // with the ones they have put away a press away.
  const [filter, setFilter] = useState<ClassFilter>('active');
  // Whether the teacher is in front of the form, and what was said about the last class they made.
  const [making, setMaking] = useState(false);
  const [said, setSaid] = useState<string | null>(null);
  const showing = classesShown(data, filter);
  const empty = tabs.find((one) => one.filter === filter)!.none;

  /** The way to the form, from the top of the list or from the card an empty list shows. */
  const make = () => {
    setSaid(null);
    setMaking(true);
  };

  if (making) {
    return (
      <NewClassroomScreen
        data={data}
        onBack={() => setMaking(false)}
        onMade={(kept, saidOfIt) => {
          // Back to the list it was made from, with the class in it and the confirmation above it.
          // The classes being taught are what a new class joins, so the filter is put there.
          setMaking(false);
          setFilter('active');
          setSaid(saidOfIt);
          onMade(kept);
        }}
      />
    );
  }

  return (
    <View style={{ flex: 1, direction: dir, backgroundColor: colors.background }}>
      <ScrollView style={{ flex: 1 }} contentContainerStyle={{ paddingTop: 20, paddingBottom: space.gap }}>
        {/* The screen's own top row: the way back to Home, the screen's name, and the mark for
            making a class — which has somewhere to go now, and so is announced as the button it is. */}
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
          <Pressable accessibilityRole="button" accessibilityLabel={t('classes.newClass')} onPress={make}>
            <Text style={{ fontSize: 22, fontWeight: '700', color: colors.accent }}>+</Text>
          </Pressable>
        </View>

        {/* The class that has just been made, said out loud where the list it joined can be seen. */}
        {said ? (
          <View style={{ paddingHorizontal: space.gap, paddingBottom: space.snug }}>
            <Text
              accessibilityRole="alert"
              style={{
                fontSize: 13,
                fontWeight: '600',
                color: colors.text,
                backgroundColor: colors.goodWash,
                borderRadius: radius.field,
                paddingHorizontal: 14,
                paddingVertical: 12,
              }}
            >
              {said}
            </Text>
          </View>
        ) : null}

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
          {showing.length === 0 ? <NoClasses empty={empty} nothingAtAll={data.classrooms.length === 0} onCreate={make} /> : null}
        </View>
      </ScrollView>

      <PlacesRow here="classes" onGo={onGo} />
    </View>
  );
}

/**
 * A list with nothing in it, as the agreed mockup draws it: the school on a wash of the accent, the
 * emptiness named, a sentence saying what a classroom is for, and the one large button there is to
 * press. Under the card, the quiet line the mockup ends on.
 *
 * Which emptiness it is still says itself — `No classes being taught` is not `No classes put away`
 * — and a teacher who has classes but none under this filter reads the sentence about the list
 * rather than the invitation to make their first class, which would not be true.
 */
function NoClasses({ empty, nothingAtAll, onCreate }: { empty: WordKey; nothingAtAll: boolean; onCreate: () => void }) {
  const t = useWords();
  useAppearance();
  return (
    <View style={{ alignItems: 'center', gap: 18, paddingTop: space.snug }}>
      <View
        style={{
          alignSelf: 'stretch',
          alignItems: 'center',
          backgroundColor: colors.card,
          borderRadius: 20,
          paddingHorizontal: space.gap,
          paddingVertical: 36,
          ...shadow.card,
        }}
      >
        {/* Round, as the mockup draws it, and round whatever size the phone's text makes it: the
            corner is larger than the patch can ever be rather than a width and a height pinned. */}
        <View style={{ backgroundColor: colors.accentWash, borderRadius: 999, padding: 22, marginBottom: 20 }}>
          <Text style={{ fontSize: 36, color: colors.accent }}>🏫</Text>
        </View>
        <Text style={{ fontSize: 19, fontWeight: '800', color: colors.text, textAlign: 'center', marginBottom: space.snug }}>
          {t(empty)}
        </Text>
        <Text style={{ fontSize: 14, color: colors.muted, textAlign: 'center', marginBottom: space.room }}>
          {t(nothingAtAll ? 'classes.noneInvite' : 'classes.noneWords')}
        </Text>
        <Pressable
          accessibilityRole="button"
          onPress={onCreate}
          style={{
            alignSelf: 'stretch',
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'center',
            flexWrap: 'wrap',
            gap: 8,
            backgroundColor: colors.accent,
            borderRadius: 14,
            paddingVertical: 16,
            ...shadow.accent,
          }}
        >
          <Text style={{ fontSize: 18, fontWeight: '700', color: colors.onAccent }}>+</Text>
          <Text style={{ fontSize: 15, fontWeight: '700', color: colors.onAccent }}>{t('classes.create')}</Text>
        </Pressable>
      </View>
      <Text style={{ fontSize: 12, color: colors.faintest, textAlign: 'center' }}>{t('classes.noneFoot')}</Text>
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
          {/* A teacher who was not given a timetable yet left the period empty, and the card says
              so in words rather than drawing a gap where a period should be. */}
          {t('classes.meta', {
            period: classroom.period.trim() || t('classes.noPeriod'),
            students: counted(students, 'student'),
          })}
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
