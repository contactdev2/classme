import { useState } from 'react';
import { Pressable, ScrollView, Text, View } from 'react-native';
import type { ClassroomData } from '../lib/classroom-data';
import { classToTakeNow, isToday, schoolDaysOf, theDaysClasses } from '../lib/day-schedule';
import { greetingFor } from '../lib/greeting';
import { counted, useDirection, useWords } from '../lib/i18n';
import type { TeacherProfile } from '../lib/local-accounts';
import { colors, radius, shadow, space, useAppearance } from '../lib/theme';
import { dateLabel, dayName, sameDay } from '../lib/week';
import { PlacesRow, type Place } from './places-row';

/**
 * Home: what a teacher lands on the moment their own record opens. It greets them by the name that
 * record keeps, shows the week they are teaching as five dates they can pick one of, and the day
 * they picked — every class of it, in the order their periods put them, with the way into the
 * register of the one they are standing in. Drawn at once, with nothing to wait for and nothing
 * asked of a network.
 *
 * Which classes a day holds, and which of them there is a register to take, are lib/day-schedule.ts
 * — this screen holds no rule of its own.
 *
 * The clock is a prop so a check can arrive on a particular morning; on a phone it is the phone's.
 */
export function HomeScreen({
  teacher,
  data,
  onOpenProfile,
  onOpenClass,
  onTakeAttendance,
  onGo,
  now = new Date(),
}: {
  teacher: TeacherProfile;
  data: ClassroomData;
  onOpenProfile: () => void;
  onOpenClass: (classroomId: string) => void;
  onTakeAttendance: (classroomId: string) => void;
  onGo: (place: Place) => void;
  now?: Date;
}) {
  const t = useWords();
  const dir = useDirection();
  // Redrawn the moment a teacher flips Dark Mode in their own profile menu: the colours below are
  // whichever of the two looks the app is wearing. See lib/theme.ts.
  useAppearance();
  const greeting = greetingFor(teacher, now);
  const week = schoolDaysOf(now);
  // The date being viewed. Home opens on the day the teacher is holding the phone on, whichever day
  // of the week that is: on a Saturday the strip still shows the week just taught, with no date in
  // it picked out, which is requirement 4's own decision about a weekend.
  const [looking, setLooking] = useState(now);
  const today = isToday(looking, now);
  const schedule = theDaysClasses(data);
  const current = classToTakeNow(schedule, looking, now);

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

        {/* The week being taught, as five dates to pick one of: the one being viewed is the one
            marked, and it is today when the screen opens. Announced as the one-of-five choice it is,
            so a screen reader says which date is being read, and it wraps rather than clipping, so
            the phone's largest text makes the strip taller. */}
        <View
          accessibilityRole="radiogroup"
          style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, paddingHorizontal: space.gap, paddingBottom: space.step }}
        >
          {week.map((day) => {
            const picked = sameDay(day.on, looking);
            // The date the teacher is holding the phone on keeps the accent to itself even when
            // they are reading another one, so the week is never a puzzle about which day it is.
            const ink = picked ? colors.onAccent : day.today ? colors.accent : colors.muted;
            return (
              <Pressable
                key={day.name}
                accessibilityRole="radio"
                accessibilityState={{ checked: picked }}
                accessibilityLabel={t('home.dayHeading', { day: day.name, date: day.date })}
                onPress={() => setLooking(day.on)}
                style={{
                  flex: 1,
                  minWidth: 56,
                  alignItems: 'center',
                  backgroundColor: picked ? colors.accent : colors.card,
                  borderRadius: radius.card,
                  paddingVertical: space.snug,
                  paddingHorizontal: 2,
                  ...(picked ? shadow.accent : shadow.soft),
                }}
              >
                <Text style={{ fontSize: 12, fontWeight: '600', color: ink }}>{day.name}</Text>
                <Text style={{ fontSize: 14, fontWeight: '700', color: picked ? colors.onAccent : colors.text }}>{day.date}</Text>
              </Pressable>
            );
          })}
        </View>

        {/* Which day the schedule under this is: today, or the date the teacher picked. */}
        <View style={{ paddingHorizontal: space.gap, paddingBottom: space.snug, gap: 2 }}>
          <Text style={{ fontSize: 12, fontWeight: '600', color: colors.muted }}>
            {today ? t('home.todayLabel') : t('home.dayHeading', { day: dayName(looking), date: dateLabel(looking) })}
          </Text>
          {/* A register belongs to the day it is taken on, so another day is a schedule to read and
              nothing to mark. Said where the way into the register would be. */}
          {!today && schedule.length > 0 ? (
            <Text style={{ fontSize: 13, color: colors.faint }}>{t('home.notToday')}</Text>
          ) : null}
        </View>

        {/* The day itself: every class the teacher is teaching, in the order their periods put them,
            and on the one they are standing in the way into its register. */}
        <View style={{ paddingHorizontal: space.gap, gap: 14 }}>
          {schedule.length === 0 ? (
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
                {/* Which emptiness this is: a phone with nothing taught on it yet, or a teacher
                    whose every class has been put away. The second is the Classes list's own word
                    for it — an invitation to make a first class would not be true for them. */}
                <Text style={{ fontSize: 16, fontWeight: '700', color: colors.text }}>
                  {data.classrooms.length === 0 ? t('home.noClasses') : t('classes.noneActive')}
                </Text>
                <Text style={{ fontSize: 13, color: colors.muted, marginTop: 4 }}>
                  {data.classrooms.length === 0 ? t('home.noClassesWords') : t('classes.noneWords')}
                </Text>
              </View>
            </View>
          ) : (
            <View role="list" style={{ gap: 14 }}>
              {schedule.map(({ classroom, students }) => {
                const standing = current?.classroom.id === classroom.id;
                return (
                  <View
                    key={classroom.id}
                    role="listitem"
                    accessibilityLabel={classroom.name}
                    style={{
                      flexDirection: 'row',
                      gap: 12,
                      backgroundColor: colors.card,
                      borderRadius: radius.card,
                      padding: space.step,
                      ...shadow.card,
                    }}
                  >
                    {/* The class's own colour down the side of its card, and the accent on the one
                        the teacher is standing in. */}
                    <View
                      style={{
                        width: 4,
                        alignSelf: 'stretch',
                        borderRadius: 2,
                        backgroundColor: standing ? colors.accent : classroom.colour,
                      }}
                    />
                    <View style={{ flex: 1 }}>
                      <Pressable
                        accessibilityRole="link"
                        onPress={() => onOpenClass(classroom.id)}
                        style={{ flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', gap: space.snug }}
                      >
                        <View style={{ flex: 1 }}>
                          {/* A teacher who was not given a timetable yet left the period empty, and
                              the card says so in words rather than drawing a gap where a period
                              should be — the Classes list's own word for it. */}
                          <Text style={{ fontSize: 12, fontWeight: '600', color: colors.muted, marginBottom: 2 }}>
                            {classroom.period.trim() || t('classes.noPeriod')}
                          </Text>
                          <Text style={{ fontSize: 17, fontWeight: '700', color: colors.text }}>{classroom.name}</Text>
                          <Text style={{ fontSize: 13, color: colors.muted, marginTop: 2 }}>{counted(students, 'student')}</Text>
                        </View>
                        <Text style={{ fontSize: 18, color: colors.chevron }}>›</Text>
                      </Pressable>
                      {standing ? (
                        <Pressable
                          accessibilityRole="button"
                          onPress={() => onTakeAttendance(classroom.id)}
                          style={{
                            alignItems: 'center',
                            marginTop: 12,
                            backgroundColor: colors.accent,
                            borderRadius: radius.field,
                            paddingVertical: 12,
                            ...shadow.accent,
                          }}
                        >
                          <Text style={{ fontSize: 15, fontWeight: '700', color: colors.onAccent }}>{t('home.take')}</Text>
                        </Pressable>
                      ) : null}
                    </View>
                  </View>
                );
              })}
            </View>
          )}
        </View>
      </ScrollView>

      {/* The app's own places, along the bottom, with Home the one the teacher is standing in. */}
      <PlacesRow here="home" onGo={onGo} />
    </View>
  );
}
