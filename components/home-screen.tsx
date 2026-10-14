import { Pressable, ScrollView, Text, View } from 'react-native';
import { greetingFor } from '../lib/greeting';
import { useDirection, useWords } from '../lib/i18n';
import type { TeacherProfile } from '../lib/local-accounts';
import { colors, radius, shadow, space, useAppearance } from '../lib/theme';
import { schoolWeekOf } from '../lib/week';
import { PlacesRow, type Place } from './places-row';

/**
 * Home: what a teacher lands on the moment their own record opens. It greets them by the name that
 * record keeps, shows the week they are teaching with today picked out, and the day in front of
 * them — drawn at once, with nothing to wait for and nothing asked of a network.
 *
 * The clock is a prop so a check can arrive on a particular morning; on a phone it is the phone's.
 */
export function HomeScreen({
  teacher,
  onOpenProfile,
  onGo,
  now = new Date(),
}: {
  teacher: TeacherProfile;
  onOpenProfile: () => void;
  onGo: (place: Place) => void;
  now?: Date;
}) {
  const t = useWords();
  const dir = useDirection();
  // Redrawn the moment a teacher flips Dark Mode in their own profile menu: the colours below are
  // whichever of the two looks the app is wearing. See lib/theme.ts.
  useAppearance();
  const greeting = greetingFor(teacher, now);
  const week = schoolWeekOf(now);

  return (
    <View style={{ flex: 1, direction: dir, backgroundColor: colors.background }}>
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
            {/* Their own account, which is their profile menu — their name and the school their
                record keeps, the way in to Classroom Settings, the Dark Mode switch, and the way
                out of the app. */}
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={t('home.account')}
              onPress={onOpenProfile}
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
          <Text style={{ fontSize: 22, fontWeight: '700', color: colors.text }}>{t('home.greetingName', { name: greeting.name })}</Text>
          <Text style={{ fontSize: 14, color: colors.muted, marginTop: space.tight }}>{t('home.here')}</Text>
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
              <Text style={{ fontSize: 12, color: colors.muted, marginBottom: 2 }}>{t('home.todayLabel')}</Text>
              <Text style={{ fontSize: 16, fontWeight: '700', color: colors.text }}>{t('home.noClasses')}</Text>
              <Text style={{ fontSize: 13, color: colors.muted, marginTop: 4 }}>{t('home.noClassesWords')}</Text>
            </View>
          </View>
        </View>
      </ScrollView>

      {/* The app's own places, along the bottom, with Home the one the teacher is standing in. */}
      <PlacesRow here="home" onGo={onGo} />
    </View>
  );
}
