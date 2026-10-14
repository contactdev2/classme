import { useState } from 'react';
import { Pressable, ScrollView, Text, View } from 'react-native';
import { useDirection, useWords, type WordKey } from '../lib/i18n';
import { productName } from '../lib/product';
import { colors, radius, shadow, space, useAppearance } from '../lib/theme';

/**
 * The three slides, in the order the agreed prototype puts them: taking attendance, keeping the
 * classes in order, and what the records add up to once they are kept. Each one is a title, a
 * sentence, and a drawing of the thing it is talking about.
 */
const slides = [
  { title: 'onboard.attendanceTitle', words: 'onboard.attendanceWords', drawing: 'attendance' },
  { title: 'onboard.organiseTitle', words: 'onboard.organiseWords', drawing: 'organise' },
  { title: 'onboard.insightsTitle', words: 'onboard.insightsWords', drawing: 'insights' },
] as const satisfies readonly { title: WordKey; words: WordKey; drawing: string }[];

/** How many slides there are, counted from the slides themselves. */
const of = slides.length;

/** A bar of the drawings: a line of something, the width it is and no fixed height anywhere. */
function Bar({ width, tint = colors.accentSoft }: { width: number; tint?: string }) {
  return <View style={{ width, paddingVertical: 5, borderRadius: 5, backgroundColor: tint }} />;
}

/** A round mark of the drawings: a tick, a face, a tile with something on it. */
function Blob({ children, tint, size = 18 }: { children: string; tint: string; size?: number }) {
  return (
    <View style={{ backgroundColor: tint, borderRadius: 999, paddingHorizontal: 8, paddingVertical: 7, alignItems: 'center' }}>
      <Text style={{ fontSize: size, color: colors.onAccent }}>{children}</Text>
    </View>
  );
}

/**
 * The drawings themselves: what the prototype puts in the picture on each slide, made of this app's
 * own rounded shapes rather than an image file. They are decoration — every word a teacher has to
 * read is in the title and the sentence under it — so nothing in here says anything out loud, and
 * nothing in here is pinned to a size that the phone's largest text would be cut off by.
 */
function Drawing({ which }: { which: 'welcome' | 'attendance' | 'organise' | 'insights' }) {
  if (which === 'welcome') {
    // A teacher, the class register between them, and a student: the app, in one picture.
    return (
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 14, flexWrap: 'wrap' }}>
        <Blob tint="#FDE68A" size={24}>👩‍🏫</Blob>
        <View
          style={{
            backgroundColor: colors.accentWash,
            borderRadius: radius.field,
            paddingHorizontal: space.step,
            paddingVertical: space.step,
            alignItems: 'center',
            gap: space.snug,
          }}
        >
          <Bar width={84} />
          <Bar width={58} />
          <Blob tint={colors.accent}>✓</Blob>
        </View>
        <Blob tint="#A7D8E8" size={20}>🧑‍🎓</Blob>
      </View>
    );
  }
  if (which === 'attendance') {
    // A register with two students on it, both marked in.
    return (
      <View style={{ alignSelf: 'center', backgroundColor: colors.card, borderRadius: radius.field, padding: space.step, gap: space.snug, ...shadow.soft }}>
        {[
          { face: '🧑', tint: '#FDE6C8' },
          { face: '👧', tint: '#F7D6E0' },
        ].map((student) => (
          <View key={student.face} style={{ flexDirection: 'row', alignItems: 'center', gap: space.snug }}>
            <Blob tint={student.tint} size={15}>{student.face}</Blob>
            <Bar width={86} tint={colors.line} />
            <Blob tint="#22C55E" size={13}>✓</Blob>
          </View>
        ))}
      </View>
    );
  }
  if (which === 'organise') {
    // Three classrooms, each with its own colour, its own period and the students in it.
    return (
      <View style={{ alignSelf: 'center', gap: space.snug }}>
        {['#2F6FED', '#F4B400', '#1ABC9C'].map((tint, nth) => (
          <View
            key={tint}
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              gap: space.snug,
              backgroundColor: colors.card,
              borderRadius: radius.field,
              paddingHorizontal: 12,
              paddingVertical: space.snug,
              ...shadow.soft,
            }}
          >
            <View style={{ backgroundColor: tint, borderRadius: 8, paddingHorizontal: 9, paddingVertical: 8 }} />
            <View style={{ gap: 5 }}>
              <Bar width={74 - nth * 10} />
              <Bar width={46} tint={colors.line} />
            </View>
          </View>
        ))}
      </View>
    );
  }
  // What the kept records add up to: a rate, and a week's bars read along rather than up, so the
  // phone's largest text leaves them exactly as they are.
  return (
    <View
      style={{
        alignSelf: 'center',
        flexDirection: 'row',
        alignItems: 'center',
        gap: space.step,
        backgroundColor: colors.card,
        borderRadius: radius.field,
        padding: space.step,
        ...shadow.soft,
      }}
    >
      <Blob tint={colors.accentWash} size={26}>📊</Blob>
      <View style={{ gap: space.snug }}>
        {[88, 60, 100, 48, 110].map((width, nth) => (
          <Bar key={width} width={width} tint={nth % 2 === 0 ? colors.accent : colors.accentSoft} />
        ))}
      </View>
    </View>
  );
}

/** Where a teacher is in the walkthrough, drawn as the prototype draws it: the one they are on wider. */
function Dots({ at }: { at: number }) {
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 7 }}>
      {slides.map((slide, nth) => (
        <View
          key={slide.drawing}
          style={{
            width: nth === at ? 22 : 8,
            paddingVertical: 4,
            borderRadius: 999,
            backgroundColor: nth === at ? colors.accent : colors.accentSoft,
          }}
        />
      ))}
    </View>
  );
}

/** The one button on each of these screens: the way on, in the accent, the full width of the screen. */
function Onward({ words, onPress }: { words: string; onPress: () => void }) {
  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      style={{
        alignItems: 'center',
        backgroundColor: colors.accent,
        borderRadius: radius.card,
        paddingVertical: 16,
        ...shadow.accent,
      }}
    >
      <Text style={{ color: colors.onAccent, fontSize: 16, fontWeight: '700' }}>{words}</Text>
    </Pressable>
  );
}

/** A card with a drawing in it, the panel the prototype puts above the words on every one of these screens. */
function Picture({ which, tint = colors.card }: { which: 'welcome' | 'attendance' | 'organise' | 'insights'; tint?: string }) {
  return (
    <View
      style={{
        backgroundColor: tint,
        borderRadius: radius.card,
        paddingHorizontal: space.step,
        paddingVertical: space.room,
        justifyContent: 'center',
        marginBottom: space.room,
        ...shadow.card,
      }}
    >
      <Drawing which={which} />
    </View>
  );
}

/**
 * The first morning with the app: a welcome, and three slides saying what it is for — taking
 * attendance, keeping the classes in order, and the insights the kept records add up to. The last
 * one's own Get Started is the way into the Home dashboard, and nobody is shown any of it twice:
 * the phone remembers it was finished (lib/onboarding.ts), and `onDone` is what tells it so.
 *
 * Skip is the prototype's own, on the slides that have a Next: a teacher who already knows what the
 * app does says so, and is taken to Home exactly as finishing the last slide would take them. It
 * counts as finished, because a teacher who has decided they do not want this should not be asked
 * again tomorrow.
 */
export function OnboardingScreen({ onDone }: { onDone: () => void }) {
  const t = useWords();
  const dir = useDirection();
  // Redrawn the moment a teacher flips Dark Mode in their own profile menu: the colours below are
  // whichever of the two looks the app is wearing. See lib/theme.ts.
  useAppearance();
  // 0 is the welcome; 1, 2 and 3 are the slides of the walkthrough itself.
  const [at, setAt] = useState(0);
  const slide = at > 0 ? slides[at - 1] : null;
  const last = at === of;

  return (
    <View style={{ flex: 1, direction: dir, backgroundColor: colors.background }}>
      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ paddingTop: slide ? 20 : 40, paddingBottom: space.gap, paddingHorizontal: space.gap }}
      >
        {slide ? (
          <>
            {/* The way back a step, and which of the three slides this is. */}
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: space.step }}>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={t('onboard.back')}
                onPress={() => setAt(at - 1)}
                style={{ paddingHorizontal: 6, paddingVertical: 4 }}
              >
                <Text style={{ fontSize: 20, color: colors.text }}>{dir === 'rtl' ? '›' : '‹'}</Text>
              </Pressable>
              <Text style={{ fontSize: 14, fontWeight: '600', color: colors.faint }}>{t('onboard.step', { at, of })}</Text>
            </View>

            <Picture which={slide.drawing} tint={at === 1 ? colors.accentWash : colors.card} />

            <Text accessibilityRole="header" style={{ fontSize: 24, fontWeight: '800', color: colors.text, marginBottom: 12 }}>
              {t(slide.title)}
            </Text>
            <Text style={{ fontSize: 15, color: colors.muted, marginBottom: space.room }}>{t(slide.words)}</Text>

            <View style={{ marginBottom: space.room }}>
              <Dots at={at - 1} />
            </View>

            {/* The way on: another slide, or — on the last of them — the dashboard itself. */}
            <Onward words={last ? t('onboard.getStarted') : t('onboard.next')} onPress={last ? onDone : () => setAt(at + 1)} />

            {/* For a teacher who already knows all this. The last slide has no Skip: its own button
                is the way in, and two ways to the same screen on one screen is one too many. */}
            {last ? null : (
              <Pressable accessibilityRole="button" onPress={onDone} style={{ alignItems: 'center', paddingVertical: space.step }}>
                <Text style={{ fontSize: 15, fontWeight: '600', color: colors.faint }}>{t('onboard.skip')}</Text>
              </Pressable>
            )}
          </>
        ) : (
          <>
            {/* The app, saying who it is, as the login screen says it. */}
            <View style={{ alignItems: 'center', marginBottom: space.gap }}>
              <View
                style={{
                  backgroundColor: colors.accent,
                  borderRadius: radius.card,
                  paddingHorizontal: 15,
                  paddingVertical: 13,
                  marginBottom: 14,
                  ...shadow.accent,
                }}
              >
                <Text style={{ fontSize: 30 }}>🎓</Text>
              </View>
              <Text accessibilityRole="header" style={{ fontSize: 28, fontWeight: '800', color: colors.text }}>
                {productName()}
              </Text>
              <Text style={{ fontSize: 13, fontWeight: '600', color: colors.faint, letterSpacing: 1.6, marginTop: 4 }}>
                {t('login.tagline')}
              </Text>
            </View>

            <Picture which="welcome" />

            <Text
              accessibilityRole="header"
              style={{ fontSize: 22, fontWeight: '800', color: colors.text, textAlign: 'center', marginBottom: 12 }}
            >
              {t('onboard.welcomeTitle')}
            </Text>
            <Text style={{ fontSize: 14, color: colors.muted, textAlign: 'center', marginBottom: space.room }}>
              {t('onboard.welcomeWords')}
            </Text>

            <View style={{ marginBottom: space.room }}>
              <Dots at={0} />
            </View>

            {/* Into the walkthrough itself, and not past it: the first slide is next. */}
            <Onward words={t('onboard.getStarted')} onPress={() => setAt(1)} />
          </>
        )}
      </ScrollView>
    </View>
  );
}
