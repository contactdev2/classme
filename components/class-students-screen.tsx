import { useState } from 'react';
import { Pressable, ScrollView, Text, TextInput, View } from 'react-native';
import type { Classroom, ClassroomData } from '../lib/classroom-data';
import { useDirection, useWords } from '../lib/i18n';
import { addStudent, emptyStudent, notReadyFor, type NewStudent } from '../lib/new-student';
import { rosterOf } from '../lib/roster';
import { colors, radius, shadow, space, useAppearance } from '../lib/theme';

/**
 * One class's own students: who is in it, and the way to add somebody to it.
 *
 * This is what the Students tab of a class opens, built to the agreed mockup (Modal Entry): the way
 * back, the class's own name, the `Students` caption, a card for each student, and — over the whole
 * of it when a teacher asks for it — the dialog where a name is typed.
 *
 * Nothing here decides what adding a student means: what is missing, whether somebody in this class
 * already has that name, and the keeping of them are all lib/new-student.ts, and this screen says
 * back what it is told.
 */
export function ClassStudentsScreen({
  classroom,
  data,
  onBack,
  onAdded,
}: {
  classroom: Classroom;
  /** What the phone keeps, as the screen behind this one has it: the list, and what a name is checked against. */
  data: ClassroomData;
  onBack: () => void;
  /** A student was added: everything the phone keeps now, so every screen reads the same thing. */
  onAdded: (kept: ClassroomData) => void;
}) {
  const t = useWords();
  const dir = useDirection();
  // Redrawn the moment a teacher flips Dark Mode in their own profile menu: the colours below are
  // whichever of the two looks the app is wearing. See lib/theme.ts.
  useAppearance();
  // Whether the dialog is in front of the list, and what was said about the last student added.
  const [asking, setAsking] = useState(false);
  const [said, setSaid] = useState<string | null>(null);
  const roster = rosterOf(data, classroom.id);

  return (
    <View style={{ flex: 1, position: 'relative', direction: dir, backgroundColor: colors.background }}>
      <ScrollView style={{ flex: 1 }} contentContainerStyle={{ paddingTop: 20, paddingBottom: space.room, gap: space.snug }}>
        {/* The way back to the class, the class a teacher is in, and — drawn because the mockup
            draws it — the mark for what else can be done with a class, which is its own
            requirement and so has nothing behind it yet and is not announced as a button. */}
        <View
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: space.snug,
            paddingHorizontal: space.step,
          }}
        >
          <Pressable accessibilityRole="button" accessibilityLabel={t('students.back')} onPress={onBack}>
            <Text style={{ fontSize: 22, color: colors.text }}>←</Text>
          </Pressable>
          <Text accessibilityRole="header" style={{ fontSize: 17, fontWeight: '700', color: colors.text }}>
            {classroom.name}
          </Text>
          <Text style={{ fontSize: 18, color: colors.text }}>⋮</Text>
        </View>

        {/* The student that has just been added, said out loud where the list they joined can be seen. */}
        {said ? (
          <View style={{ paddingHorizontal: space.gap }}>
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

        <Text style={{ fontSize: 13, color: colors.muted, paddingHorizontal: space.gap }}>{t('class.students')}</Text>

        {/* The class's own register, one card a name, as the mockup draws them. */}
        <View role="list" accessibilityLabel={t('class.students')} style={{ paddingHorizontal: space.gap, gap: space.snug }}>
          {roster.map((student) => (
            <View
              key={student.id}
              role="listitem"
              accessibilityLabel={student.name}
              style={{
                backgroundColor: colors.card,
                borderRadius: radius.field,
                paddingHorizontal: space.step,
                paddingVertical: 14,
                ...shadow.soft,
              }}
            >
              <Text style={{ fontSize: 15, color: colors.text }}>{student.name}</Text>
            </View>
          ))}
        </View>

        {/* The way to add one: a card with nothing but that on it while the class is empty, and a
            button under the names once there are some. Never both, so a finger is never offered
            the same thing twice. */}
        {roster.length === 0 ? (
          <NoStudents onAdd={() => setAsking(true)} />
        ) : (
          <View style={{ paddingHorizontal: space.gap, paddingTop: space.snug }}>
            <AddStudentButton onAdd={() => setAsking(true)} />
          </View>
        )}
      </ScrollView>

      {/* The dialog, over the whole screen: the list is still behind it and is not to be used until
          the teacher is done here. */}
      {asking ? (
        <AddStudentDialog
          classroom={classroom}
          data={data}
          onClose={() => setAsking(false)}
          onAdded={(kept, saidOfIt) => {
            // Back to the list, with the student on it and the confirmation above it.
            setAsking(false);
            setSaid(saidOfIt);
            onAdded(kept);
          }}
        />
      ) : null}
    </View>
  );
}

/** The one large button there is to press: the way into the dialog, wherever it is drawn. */
function AddStudentButton({ onAdd }: { onAdd: () => void }) {
  const t = useWords();
  useAppearance();
  return (
    <Pressable
      accessibilityRole="button"
      onPress={onAdd}
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        flexWrap: 'wrap',
        gap: 8,
        backgroundColor: colors.accent,
        borderRadius: 14,
        paddingVertical: 16,
        paddingHorizontal: space.step,
        ...shadow.accent,
      }}
    >
      <Text style={{ fontSize: 18, fontWeight: '700', color: colors.onAccent }}>+</Text>
      <Text style={{ fontSize: 15, fontWeight: '700', color: colors.onAccent }}>{t('students.add')}</Text>
    </Pressable>
  );
}

/**
 * A class with nobody in it yet, in the shape the Classes list uses for a teacher with no classes:
 * the emptiness named, a sentence saying what to do about it, and the one button to press.
 */
function NoStudents({ onAdd }: { onAdd: () => void }) {
  const t = useWords();
  useAppearance();
  return (
    <View style={{ paddingHorizontal: space.gap, paddingTop: space.snug }}>
      <View
        style={{
          alignItems: 'center',
          backgroundColor: colors.card,
          borderRadius: 20,
          paddingHorizontal: space.gap,
          paddingVertical: 32,
          ...shadow.card,
        }}
      >
        {/* Round, and round whatever size the phone's text makes it: the corner is larger than the
            patch can ever be rather than a width and a height pinned. */}
        <View style={{ backgroundColor: colors.accentWash, borderRadius: 999, padding: 20, marginBottom: 18 }}>
          <Text style={{ fontSize: 32, color: colors.accent }}>🎓</Text>
        </View>
        <Text style={{ fontSize: 18, fontWeight: '800', color: colors.text, textAlign: 'center', marginBottom: space.snug }}>
          {t('students.noneTitle')}
        </Text>
        <Text style={{ fontSize: 14, color: colors.muted, textAlign: 'center', marginBottom: space.room }}>
          {t('students.noneInvite')}
        </Text>
        <View style={{ alignSelf: 'stretch' }}>
          <AddStudentButton onAdd={onAdd} />
        </View>
      </View>
    </View>
  );
}

/**
 * The dialog the mockup draws: what it is for, the one field there is, what is wrong with what has
 * been typed, and the two ways out — Cancel, which adds nobody, and Add, which does.
 *
 * It is drawn over the screen rather than sent to its own route, which is what the mockup draws: the
 * class's own list stays standing behind it, so the teacher is already looking at the place the
 * name appears in.
 */
function AddStudentDialog({
  classroom,
  data,
  onClose,
  onAdded,
}: {
  classroom: Classroom;
  data: ClassroomData;
  onClose: () => void;
  onAdded: (kept: ClassroomData, said: string) => void;
}) {
  const t = useWords();
  useAppearance();
  const [form, setForm] = useState<NewStudent>(emptyStudent);
  const [said, setSaid] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  /**
   * The Add button: the name typed, handed in to be kept, and the answer said back. What is not yet
   * right is named here before anything is written — nobody waits to be told they have not finished
   * typing — and a name somebody in this class already has is refused by the rules themselves,
   * against what the phone actually keeps.
   */
  async function add() {
    // One press is one student: a second one while the first is still being written is ignored.
    if (busy) return;
    const notReady = notReadyFor(data, classroom.id, form);
    if (notReady) {
      setSaid(notReady);
      return;
    }
    setBusy(true);
    setSaid(t('newStudent.saving'));
    const made = await addStudent(classroom.id, form);
    setBusy(false);
    if (made.added && made.data) {
      // Added and kept. This dialog is done: the list behind it says so and shows the name.
      onAdded(made.data, made.said);
      return;
    }
    // Nobody added, and said so in words of its own — never the words of the thing that failed,
    // and never with any of what was typed in it.
    setSaid(made.said);
  }

  return (
    <View
      style={{
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: colors.scrim,
        justifyContent: 'center',
        paddingHorizontal: space.gap,
      }}
    >
      <ScrollView style={{ flexGrow: 0 }} contentContainerStyle={{ justifyContent: 'center' }}>
        <View style={{ backgroundColor: colors.card, borderRadius: 18, paddingHorizontal: 20, paddingVertical: space.gap, ...shadow.card }}>
          <Text accessibilityRole="header" style={{ fontSize: 17, fontWeight: '800', color: colors.text, marginBottom: 6 }}>
            {t('students.add')}
          </Text>
          <Text style={{ fontSize: 13, color: colors.muted, marginBottom: 18 }}>{t('newStudent.words')}</Text>

          <Text style={{ fontSize: 12, fontWeight: '600', color: colors.muted, marginBottom: 6, textTransform: 'uppercase' }}>
            {t('newStudent.name')}
          </Text>
          <TextInput
            accessibilityLabel={t('newStudent.name')}
            autoCapitalize="words"
            autoCorrect={false}
            placeholder={t('newStudent.namePlaceholder')}
            placeholderTextColor={colors.faint}
            value={form.name}
            onChangeText={(name) => {
              setForm({ name });
              // What was said about the last press is no longer true of what is typed now.
              setSaid(null);
            }}
            style={{
              fontSize: 15,
              color: colors.text,
              backgroundColor: colors.background,
              borderWidth: 1,
              borderColor: colors.line,
              borderRadius: radius.field,
              paddingHorizontal: 14,
              paddingVertical: 14,
            }}
          />

          {/* What came of the last press, where the thumb that pressed it is already looking. */}
          {said ? (
            <Text accessibilityRole="alert" style={{ fontSize: 12, color: colors.alarm, marginTop: 8 }}>
              {said}
            </Text>
          ) : null}

          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: space.snug, marginTop: 18 }}>
            <Pressable
              accessibilityRole="button"
              onPress={onClose}
              style={{
                flexGrow: 1,
                flexBasis: 100,
                alignItems: 'center',
                backgroundColor: colors.background,
                borderRadius: radius.field,
                paddingVertical: 14,
              }}
            >
              <Text style={{ fontSize: 14, fontWeight: '700', color: colors.muted }}>{t('newStudent.cancel')}</Text>
            </Pressable>
            <Pressable
              accessibilityRole="button"
              accessibilityState={{ disabled: busy }}
              disabled={busy}
              onPress={add}
              style={{
                flexGrow: 1,
                flexBasis: 100,
                alignItems: 'center',
                backgroundColor: colors.accent,
                borderRadius: radius.field,
                paddingVertical: 14,
                opacity: busy ? 0.7 : 1,
                ...shadow.accent,
              }}
            >
              <Text style={{ fontSize: 14, fontWeight: '700', color: colors.onAccent }}>{t('newStudent.add')}</Text>
            </Pressable>
          </View>
        </View>
      </ScrollView>
    </View>
  );
}
