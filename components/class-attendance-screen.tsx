import { useState } from 'react';
import { Pressable, ScrollView, Text, View } from 'react-native';
import { classesToSwitchTo, classroomWithId } from '../lib/classes';
import type { ClassroomData } from '../lib/classroom-data';
import { useDirection, useWords, type WordKey } from '../lib/i18n';
import { colors, radius, shadow, space, useAppearance } from '../lib/theme';
import { ClassStudentsScreen } from './class-students-screen';
import { ClassTrends } from './class-trends';

/** Which of a class's own tabs a teacher is standing on. */
type ClassTab = 'overview' | 'students' | 'trends';

/**
 * The three tabs of a class, each of which now has somewhere to go, so each of them is announced
 * as the button it is. Overview and Trends are the same report, which is how the agreed prototype
 * draws them; Students is that class's own list of the people in it.
 */
const tabs: { name: WordKey; tab: ClassTab }[] = [
  { name: 'class.overview', tab: 'overview' },
  { name: 'class.students', tab: 'students' },
  { name: 'class.trends', tab: 'trends' },
];

/**
 * One class's attendance: the dashboard behind its own card in My Classes, which is what selecting
 * a class opens.
 *
 * It opens on Overview, and Trends beside it shows the same report — the donut with every mark
 * counted, the weeks of the past month, and one sentence comparing this month with the last — which
 * is how the agreed prototype draws the two tabs. The report itself is components/class-trends.tsx,
 * so neither tab can drift from the other. Every number in it is worked out here and now from the
 * marks the phone already keeps: nothing is stored twice and nothing is asked of a network.
 *
 * A teacher who opened the wrong class switches straight to another one from the row along the top,
 * without going back to the list for it, and the tab they are standing on is kept as they do.
 */
export function ClassAttendanceScreen({
  data,
  classroomId,
  onBack,
  onChanged,
  now = new Date(),
}: {
  data: ClassroomData;
  classroomId: string;
  onBack: () => void;
  /** Something about this class changed on the phone — a student added to it — and here is all of it. */
  onChanged: (kept: ClassroomData) => void;
  now?: Date;
}) {
  const t = useWords();
  const dir = useDirection();
  // Redrawn the moment a teacher flips Dark Mode in their own profile menu: the colours below are
  // whichever of the two looks the app is wearing. See lib/theme.ts.
  useAppearance();
  const [showing, setShowing] = useState(classroomId);
  const [tab, setTab] = useState<ClassTab>('overview');
  const classroom = classroomWithId(data, showing) ?? classroomWithId(data, classroomId);

  // The class's own students, which is what the Students tab opens: a screen this one shows and
  // not a route of its own, the way the form a classroom is made in is a screen the Classes list
  // shows. The class is the one being shown, so a teacher who switched classes from the row above
  // and then opened Students is looking at that class's register.
  if (tab === 'students' && classroom) {
    return (
      <ClassStudentsScreen classroom={classroom} data={data} onBack={() => setTab('overview')} onAdded={onChanged} />
    );
  }

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

        {/* The three tabs of a class, the one the teacher is standing on marked. Overview and
            Trends are this class's own report; Students is the people in it. */}
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', backgroundColor: colors.card, borderRadius: radius.card, padding: 4, marginHorizontal: space.step, ...shadow.soft }}>
          {tabs.map((one) => {
            const here = one.tab === tab;
            const words = (
              <Text
                style={{
                  textAlign: 'center',
                  fontSize: 14,
                  fontWeight: here ? '700' : '600',
                  color: here ? colors.onAccent : colors.muted,
                }}
              >
                {t(one.name)}
              </Text>
            );
            const look = {
              flex: 1,
              borderRadius: radius.field,
              paddingVertical: 10,
              backgroundColor: here ? colors.accent : colors.card,
            } as const;
            return (
              <Pressable
                key={one.name}
                accessibilityRole="button"
                accessibilityState={{ checked: here }}
                onPress={() => setTab(one.tab)}
                style={look}
              >
                {words}
              </Pressable>
            );
          })}
        </View>

        {/* This class's own report, which is what both Overview and Trends show: the donut with
            every mark counted, the weeks of the past month, and the one sentence about all of it.
            See components/class-trends.tsx — the prototype draws these three cards on both tabs. */}
        <ClassTrends data={data} classroomId={classroom ? classroom.id : null} now={now} />

      </ScrollView>
    </View>
  );
}
