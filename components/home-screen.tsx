import { Pressable, ScrollView, Text, View } from 'react-native';
import { greetingFor } from '../lib/greeting';
import type { TeacherProfile } from '../lib/local-accounts';
import { colors, radius, shadow, space } from '../lib/theme';
import { schoolWeekOf } from '../lib/week';

/**
 * The places the app has, along the bottom, as the prototype draws them. Home is where a teacher
 * already is; the other four are each their own requirement, so — like 'Forgot password?' on the
 * login screen — they are drawn because the prototype draws them, and nothing is behind them yet.
 * They are deliberately not announced as buttons: a control that answers nothing should not say it
 * does.
 */
const places = [
  { name: 'Home', mark: '⌂' },
  { name: 'Classes', mark: '◫' },
  { name: 'Attendance', mark: '📅' },
  { name: 'Messages', mark: '💬' },
  { name: 'More', mark: '⋯' },
] as const;

/**
 * Home: what a teacher lands on the moment their own record opens. It greets them by the name that
 * record keeps, shows the week they are teaching with today picked out, and the day in front of
 * them — drawn at once, with nothing to wait for and nothing asked of a network.
 *
 * The clock is a prop so a check can arrive on a particular morning; on a phone it is the phone's.
 */
export function HomeScreen({
  teacher,
  onLogOut,
  now = new Date(),
}: {
  teacher: TeacherProfile;
  onLogOut: () => void;
  now?: Date;
}) {
  const greeting = greetingFor(teacher, now);
  const week = schoolWeekOf(now);

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <ScrollView style={{ flex: 1 }} contentContainerStyle={{ paddingTop: 20, paddingBottom: space.step }}>
        {/* The screen's own top row: the menu, what is waiting, and the teacher themselves. */}
        <View
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'space-between',
            paddingHorizontal: space.gap,
            paddingBottom: space.snug,
          }}
        >
          <Text style={{ fontSize: 22, color: colors.text }}>☰</Text>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: space.step }}>
            <Text style={{ fontSize: 20 }}>🔔</Text>
            {/* Their own account. Settings is its own requirement, and logging out securely with it;
                until that screen exists this is the way back out, and it says so to a screen reader
                rather than leaving a teacher to guess. */}
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Your account — log out"
              onPress={onLogOut}
              style={{
                backgroundColor: colors.accentSoft,
                borderRadius: radius.pill,
                paddingHorizontal: 9,
                paddingVertical: 7,
                ...shadow.soft,
              }}
            >
              <Text style={{ fontSize: 16 }}>👤</Text>
            </Pressable>
          </View>
        </View>

        {/* The greeting: the first thing read, and the first thing a screen reader announces. */}
        <View accessibilityRole="header" style={{ paddingHorizontal: space.gap, paddingBottom: space.step }}>
          <Text style={{ fontSize: 22, fontWeight: '700', color: colors.text }}>{greeting.hour}</Text>
          <Text style={{ fontSize: 22, fontWeight: '700', color: colors.text }}>{greeting.name} 👋</Text>
          <Text style={{ fontSize: 14, color: colors.muted, marginTop: space.tight }}>Here's what's happening today.</Text>
        </View>

        {/* The week being taught, with the day the teacher is standing in picked out. */}
        <View style={{ flexDirection: 'row', gap: 8, paddingHorizontal: space.gap, paddingBottom: space.step }}>
          {week.map((day) => (
            <View
              key={day.name}
              style={{
                flex: 1,
                alignItems: 'center',
                backgroundColor: day.today ? colors.accent : colors.card,
                borderRadius: radius.card,
                paddingVertical: space.snug,
                paddingHorizontal: 2,
                ...(day.today ? shadow.accent : shadow.soft),
              }}
            >
              <Text style={{ fontSize: 12, fontWeight: '600', color: day.today ? colors.onAccent : colors.muted }}>{day.name}</Text>
              <Text style={{ fontSize: 14, fontWeight: '700', color: day.today ? colors.onAccent : colors.muted }}>{day.date}</Text>
            </View>
          ))}
        </View>

        {/* The day itself. A classroom is its own requirement and none can be made yet, so what is
            here is the truth about this phone — not the prototype's Mathematics, Science and
            English, which are one school's sample data and not a word of the product. */}
        <View style={{ paddingHorizontal: space.gap, gap: 14 }}>
          <View
            style={{
              flexDirection: 'row',
              gap: 12,
              backgroundColor: colors.card,
              borderRadius: radius.card,
              padding: space.step,
              ...shadow.card,
            }}
          >
            <View style={{ width: 4, alignSelf: 'stretch', borderRadius: 2, backgroundColor: colors.accent }} />
            <View style={{ flex: 1 }}>
              <Text style={{ fontSize: 12, color: colors.muted, marginBottom: 2 }}>Today</Text>
              <Text style={{ fontSize: 16, fontWeight: '700', color: colors.text }}>No classes yet</Text>
              <Text style={{ fontSize: 13, color: colors.muted, marginTop: 4 }}>
                Your periods, and the students in them, show here once you have a classroom.
              </Text>
            </View>
          </View>
        </View>
      </ScrollView>

      {/* The app's places, along the bottom. It wraps rather than clips, so the phone's largest text
          makes this row taller and never cuts a word off it. */}
      <View
        style={{
          flexDirection: 'row',
          justifyContent: 'space-around',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: space.snug,
          paddingHorizontal: space.snug,
          paddingVertical: 12,
          backgroundColor: colors.card,
          borderTopWidth: 1,
          borderTopColor: colors.line,
        }}
      >
        {places.map((place) => {
          const here = place.name === 'Home';
          return (
            <View key={place.name} style={{ alignItems: 'center', gap: 4 }}>
              <Text style={{ fontSize: 18, color: here ? colors.accent : colors.faint }}>{place.mark}</Text>
              <Text style={{ fontSize: 11, fontWeight: here ? '600' : '400', color: here ? colors.accent : colors.faint }}>
                {place.name}
              </Text>
            </View>
          );
        })}
      </View>
    </View>
  );
}
