import { useState } from 'react';
import { Pressable, ScrollView, Text, TextInput, View } from 'react-native';
import { useDirection, useWords } from '../lib/i18n';
import {
  classColours,
  emptyForm,
  makeClassroom,
  notReadyFor,
  subjectIcons,
  type NewClassroom,
} from '../lib/new-classroom';
import type { ClassroomData } from '../lib/classroom-data';
import { colors, radius, shadow, space, useAppearance } from '../lib/theme';

/** The words above a field, naming it, so a person knows what goes in it. */
function FieldLabel({ children }: { children: string }) {
  return <Text style={{ fontSize: 13, fontWeight: '600', color: colors.text, marginBottom: space.tight }}>{children}</Text>;
}

// Made when a screen is drawn and not when this module loads: the colours in it are the ones the
// app is wearing at that moment, so a teacher flipping Dark Mode redraws this with everything else.
const fieldRow = () => ({
  flexDirection: 'row',
  alignItems: 'center',
  gap: 8,
  backgroundColor: colors.background,
  borderWidth: 1,
  borderColor: colors.line,
  borderRadius: radius.field,
  paddingHorizontal: 14,
  paddingVertical: 12,
} as const);

/** The soft tint behind a subject's own icon: the class's own colour, at a tenth of itself. */
const tintOf = (colour: string) => (/^#[0-9a-f]{6}$/i.test(colour) ? `${colour}1A` : colors.accentWash);

/**
 * New Classroom: where a teacher makes one of their own classes.
 *
 * It asks for the four things a classroom is — its name, the period it meets in, and the icon and
 * colour it is picked out by — and only the name is one a classroom cannot be made without: the
 * icon and the colour open on a choice already made, and the period may be left for a timetable
 * that has not been given out yet. A teacher who types a name and presses the button has a whole
 * classroom.
 *
 * The card at the top is the class as the list will draw it, so the icon and the colour are a
 * choice a teacher can see rather than one they have to imagine.
 *
 * Nothing here decides what a submission means: what is missing, whether the name is one of their
 * own classes already, and the keeping of it are all lib/new-classroom.ts, and this screen says
 * back what it is told.
 */
export function NewClassroomScreen({
  data,
  onBack,
  onMade,
}: {
  /** What the phone keeps, as the screen behind this one has it: what a name is checked against. */
  data: ClassroomData;
  onBack: () => void;
  /** A classroom was made: everything the phone keeps now, and the sentence to say about it. */
  onMade: (kept: ClassroomData, said: string) => void;
}) {
  const t = useWords();
  const dir = useDirection();
  // Redrawn the moment a teacher flips Dark Mode in their own profile menu: the colours below are
  // whichever of the two looks the app is wearing. See lib/theme.ts.
  useAppearance();
  const [form, setForm] = useState<NewClassroom>(emptyForm);
  const [said, setSaid] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  /** One field of the form, typed into. What was said about the last press is no longer true. */
  const put = (part: Partial<NewClassroom>) => {
    setForm((was) => ({ ...was, ...part }));
    setSaid(null);
  };

  /**
   * The button: what the teacher typed, handed in to be kept, and the answer said back. What is not
   * yet right is named here before anything is written — nobody waits to be told they have not
   * finished typing — and a name one of their own classes already has is refused by the rules
   * themselves, against what the phone actually keeps.
   */
  async function create() {
    // One press is one classroom: a second one while the first is still being written is ignored.
    if (busy) return;
    const notReady = notReadyFor(data, form);
    if (notReady) {
      setSaid(notReady);
      return;
    }
    setBusy(true);
    setSaid(t('newClass.saving'));
    const made = await makeClassroom(form);
    setBusy(false);
    if (made.created && made.data) {
      // Made and kept. This screen is done: the list it came from says so and shows the class.
      onMade(made.data, made.said);
      return;
    }
    // Not made, and said so in words of its own — never the words of the thing that failed, and
    // never with any of what was typed in it.
    setSaid(made.said);
  }

  return (
    <View style={{ flex: 1, direction: dir, backgroundColor: colors.background }}>
      <ScrollView style={{ flex: 1 }} contentContainerStyle={{ paddingTop: 20, paddingBottom: space.room }}>
        {/* The screen's own top row: the way back to the list, and the screen's name. */}
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
          <Pressable accessibilityRole="button" accessibilityLabel={t('newClass.back')} onPress={onBack}>
            <Text style={{ fontSize: 22, color: colors.text }}>‹</Text>
          </Pressable>
          <Text accessibilityRole="header" style={{ fontSize: 18, fontWeight: '700', color: colors.text }}>
            {t('newClass.title')}
          </Text>
          {/* The balance the prototype draws at the other end of the row, and no more than that. */}
          <Text style={{ fontSize: 22, color: 'transparent' }}>‹</Text>
        </View>

        {/* The class as the list will draw it: the icon chosen, on a wash of the colour chosen. */}
        <View style={{ paddingHorizontal: space.gap, paddingBottom: space.step }}>
          <View
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
            <View
              style={{
                backgroundColor: tintOf(form.colour),
                borderRadius: radius.field,
                paddingHorizontal: 12,
                paddingVertical: 10,
              }}
            >
              <Text style={{ fontSize: 20, fontWeight: '700', color: form.colour }}>{form.subject}</Text>
            </View>
            <View style={{ flex: 1, gap: 2 }}>
              <Text style={{ fontSize: 16, fontWeight: '700', color: colors.text }}>
                {form.name.trim() || t('newClass.preview')}
              </Text>
              <Text style={{ fontSize: 13, color: colors.muted }}>{form.period.trim() || t('classes.noPeriod')}</Text>
            </View>
          </View>
        </View>

        {/* What a classroom is made of. */}
        <View
          style={{
            marginHorizontal: space.gap,
            backgroundColor: colors.card,
            borderRadius: radius.card,
            paddingHorizontal: 20,
            paddingVertical: space.gap,
            ...shadow.card,
          }}
        >
          <View style={{ marginBottom: space.step }}>
            <FieldLabel>{t('newClass.name')}</FieldLabel>
            <View style={fieldRow()}>
              <Text style={{ fontSize: 15 }}>🏫</Text>
              <TextInput
                accessibilityLabel={t('newClass.name')}
                autoCapitalize="words"
                autoCorrect={false}
                placeholder={t('newClass.namePlaceholder')}
                placeholderTextColor={colors.faint}
                value={form.name}
                onChangeText={(name) => put({ name })}
                style={{ flex: 1, fontSize: 15, color: colors.text, paddingVertical: 0 }}
              />
            </View>
          </View>

          <View style={{ marginBottom: space.step }}>
            <FieldLabel>{t('newClass.period')}</FieldLabel>
            <View style={fieldRow()}>
              <Text style={{ fontSize: 15 }}>🕘</Text>
              <TextInput
                accessibilityLabel={t('newClass.period')}
                autoCapitalize="words"
                autoCorrect={false}
                placeholder={t('newClass.periodPlaceholder')}
                placeholderTextColor={colors.faint}
                value={form.period}
                onChangeText={(period) => put({ period })}
                style={{ flex: 1, fontSize: 15, color: colors.text, paddingVertical: 0 }}
              />
            </View>
          </View>

          {/* The icon the class is spotted by. Announced as the one-of-six choice it is, each one
              named by its own subject so a screen reader says more than 'image'. */}
          <View style={{ marginBottom: space.step }}>
            <FieldLabel>{t('newClass.subject')}</FieldLabel>
            <View accessibilityRole="radiogroup" style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>
              {subjectIcons.map((one) => {
                const chosen = one.icon === form.subject;
                return (
                  <Pressable
                    key={one.icon}
                    accessibilityRole="radio"
                    accessibilityState={{ checked: chosen }}
                    accessibilityLabel={t(one.name)}
                    onPress={() => put({ subject: one.icon })}
                    style={{
                      backgroundColor: chosen ? colors.accentWash : colors.background,
                      borderWidth: 2,
                      borderColor: chosen ? colors.accent : colors.line,
                      borderRadius: radius.field,
                      paddingHorizontal: 10,
                      paddingVertical: 9,
                    }}
                  >
                    {/* The icon itself, named for a screen reader by the subject it stands for: a
                        row of six of them reads at the largest text size, where six words beside
                        them would be a column six rows deep. */}
                    <Text style={{ fontSize: 20 }}>{one.icon}</Text>
                  </Pressable>
                );
              })}
            </View>
          </View>

          {/* And the colour, for a teacher who would rather tell their classes apart that way. */}
          <View style={{ marginBottom: space.gap }}>
            <FieldLabel>{t('newClass.colour')}</FieldLabel>
            <View accessibilityRole="radiogroup" style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
              {classColours.map((one) => {
                const chosen = one.colour === form.colour;
                return (
                  <Pressable
                    key={one.colour}
                    accessibilityRole="radio"
                    accessibilityState={{ checked: chosen }}
                    accessibilityLabel={t(one.name)}
                    onPress={() => put({ colour: one.colour })}
                    style={{
                      backgroundColor: chosen ? tintOf(one.colour) : colors.background,
                      borderWidth: 2,
                      borderColor: chosen ? one.colour : colors.line,
                      borderRadius: radius.field,
                      paddingHorizontal: 10,
                      paddingVertical: 10,
                    }}
                  >
                    {/* The colour itself, drawn rather than written: a round patch of it, named for
                        a screen reader by the colour it is, and grown out of padding so the phone's
                        largest text takes it along with everything else. */}
                    <View style={{ backgroundColor: one.colour, borderRadius: radius.pill, padding: 8 }} />
                  </Pressable>
                );
              })}
            </View>
          </View>

          <Pressable
            accessibilityRole="button"
            accessibilityState={{ disabled: busy }}
            disabled={busy}
            onPress={create}
            style={{
              alignItems: 'center',
              backgroundColor: colors.accent,
              borderRadius: radius.field,
              paddingVertical: 15,
              opacity: busy ? 0.7 : 1,
              ...shadow.accent,
            }}
          >
            <Text style={{ color: colors.onAccent, fontSize: 16, fontWeight: '700' }}>{t('classes.create')}</Text>
          </Pressable>

          {/* What came of the last press, where the thumb that pressed it is already looking. */}
          {said ? (
            <Text
              accessibilityRole="alert"
              style={{ marginTop: 12, fontSize: 13, color: colors.text, textAlign: 'center' }}
            >
              {said}
            </Text>
          ) : null}
        </View>

        <Text
          style={{
            fontSize: 12,
            color: colors.faint,
            textAlign: 'center',
            paddingHorizontal: space.gap,
            paddingTop: space.step,
          }}
        >
          {t('newClass.note')}
        </Text>
      </ScrollView>
    </View>
  );
}
