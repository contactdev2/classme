// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest';
import { classroomDataIn, classroomStore, keepClassroomDataIn, type Classroom, type ClassroomData, type Student } from '../lib/classroom-data';
import { setLanguage } from '../lib/i18n';
import { keepLanguageIn, languageFileWith } from '../lib/language-file';
import { sourceLanguage } from '../lib/languages';
import { accountsIn, keepAccountsIn, lockAccount } from '../lib/local-accounts';
import { keepOnboardingIn, onboardingIn } from '../lib/onboarding';
import { open, settle, takePictureOf, visibleText, type Screen } from '../test/screen';
import TheApp from './index';

// This check reads the app in the language its own words are written in, so what it proves is about
// the screen and not about a translation. Which language a screen is in, and that every screen
// follows the one a teacher chose, is proved in app/localise-app.test.tsx.
setLanguage(sourceLanguage);
keepLanguageIn(languageFileWith(null));

// The teacher this phone belongs to, and the password that opens their own record.
const teacher = { email: 'ms.rivera@riversidehigh.edu', name: 'Ms. Rivera' };
const password = 'Spring-2026-attendance';

// Stretching a password is slow on purpose, so a record made for a check says its own smaller
// number. A record carries the number it was made with, so both open alike.
const checkIterations = 1_000;

// How long a check may take altogether. Nothing here waits on anything — it is the browser that
// draws the picture at the end of each one, and a cold browser on a runner has taken fifteen
// seconds. See app/create-classroom.test.tsx, which says the same.
const pictureTakesAWhile = 120_000;

/** The morning this check stands on: a Monday in April, which is a school day. */
const theMorning = new Date('2025-04-21T08:12:00');

// Named as a word and not written into the import itself on purpose: a missing module written in
// plainly is a file that will not even load, and a check file that cannot load says nothing about
// any one criterion. Asked for this way, each check below fails on its own line and names what is
// missing — which is how this file was pushed before a line of the implementation existed.
const theRules = '../lib/new-student';

/** What a teacher fills in to add a student, as this check fills it in. */
type NewStudent = { name: string };

/** The rules a student is added by, asked for when a check runs rather than when this file loads. */
async function rules() {
  return (await import(/* @vite-ignore */ theRules)) as {
    detailsFrom: (typed: NewStudent) => NewStudent;
    sameStudentName: (one: string, other: string) => boolean;
    studentNamedIn: (data: ClassroomData, classroomId: string, name: string) => Student | null;
    nameAlreadyInClass: (data: ClassroomData, classroomId: string, name: string) => boolean;
    nameMissingFrom: (typed: NewStudent) => string | null;
    notReadyFor: (data: ClassroomData, classroomId: string, typed: NewStudent) => string | null;
    dataWithStudent: (data: ClassroomData, student: Student) => ClassroomData;
    addStudent: (
      classroomId: string,
      typed: NewStudent,
    ) => Promise<{ added: boolean; said: string; student?: Student; data?: ClassroomData }>;
  };
}

/** The two classes this teacher has, on the checks that need a second one to compare with. */
const theMaths: Classroom = { id: 'c-maths', name: 'Mathematics', period: '1st Period', subject: '📐', colour: '#2F6FED' };
const theScience: Classroom = { id: 'c-science', name: 'Science', period: '2nd Period', subject: '🔬', colour: '#1FAE63' };

/** The morning the app is opened on, so a day in words is the same day every time. */
function aMondayMorning(): void {
  vi.useFakeTimers({ toFake: ['Date'] });
  vi.setSystemTime(theMorning);
}

/** This phone: the teacher's own account on it, and whatever classes and students it already keeps. */
function aPhoneWith(classrooms: Classroom[], students: Student[] = []): void {
  keepAccountsIn(accountsIn([lockAccount({ email: teacher.email, password }, teacher, checkIterations)]));
  // The teacher of this phone has already been welcomed: the first morning's walkthrough is proved
  // in app/complete-onboarding.test.tsx, and what is being read here is what comes after it.
  keepOnboardingIn(onboardingIn(true));
  keepClassroomDataIn(classroomDataIn({ version: 1, classrooms, students, attendance: [] }));
}

/** A teacher arriving at the app and signing in with their own email and password. */
async function signIn(): Promise<Screen> {
  const screen = open(<TheApp />);
  await screen.type(/Email/i, teacher.email);
  await screen.type(/^Password/i, password);
  await screen.press('Log In');
  await settle();
  return screen;
}

/** Signed in, and standing in one of their own classes: the card in the list opens it. */
async function inTheClass(classroom: Classroom, classrooms: Classroom[], students: Student[] = []): Promise<Screen> {
  aMondayMorning();
  aPhoneWith(classrooms, students);
  const screen = await signIn();
  await screen.press('Classes');
  await settle();
  await screen.press(classroom.name);
  await settle();
  return screen;
}

/** And standing in that class's own list of students, which is where a student is added. */
async function inTheStudentsOf(
  classroom: Classroom,
  classrooms: Classroom[] = [classroom],
  students: Student[] = [],
): Promise<Screen> {
  const screen = await inTheClass(classroom, classrooms, students);
  await screen.press('Students');
  await settle();
  return screen;
}

/** Typing a student's name into the dialog and pressing the button that adds them. */
async function addStudentNamed(screen: Screen, name: string): Promise<void> {
  await screen.press('Add Student');
  await settle();
  await screen.type(/Student Name/i, name);
  // The dialog's own button says 'Add' and nothing else: the one behind it says 'Add Student'.
  await screen.press(/^Add$/);
  await settle();
}

/** Everything a control on this screen says, as a person reads it. */
const controlsOn = (screen: Screen): { words: string; label: string }[] =>
  [...screen.root().querySelectorAll('[role="button"], [role="radio"], [role="link"]')].map((one) => ({
    words: visibleText(one.innerHTML || (one.textContent ?? '')),
    label: one.getAttribute('aria-label') ?? '',
  }));

/** The control a person would press to see these words, and nothing else on the screen. */
const controlSaying = (screen: Screen, words: string) =>
  controlsOn(screen).filter((one) => one.words.includes(words) || one.label.includes(words));

/** Every name standing on the class's own list of students, as a person reads them off it. */
const studentsListed = (screen: Screen): string[] =>
  [...screen.root().querySelectorAll('[role="listitem"]')].map((one) => visibleText(one.innerHTML));

/** Every sentence this screen is saying out loud as something a teacher has to read now. */
const alertsOn = (screen: Screen): string[] =>
  [...screen.root().querySelectorAll('[role="alert"]')].map((one) => visibleText(one.innerHTML));

/** What the phone itself keeps, read back the way the app reads it. */
const keptOnThePhone = (): Promise<ClassroomData> => classroomStore().read();

afterEach(() => {
  vi.useRealTimers();
  keepAccountsIn(accountsIn([]));
});

describe('Add ability to add a new student and ensure uniqueness based on name', () => {
  it("A teacher can enter a new student's name and add them to a classroom.", async () => {
    const screen = await inTheStudentsOf(theMaths);

    // The class's own students, and the one thing there is to do when it has none: a dialog is
    // opened, a name typed into it, and the student is in the class.
    expect(screen.text()).toContain('Students');
    expect(controlSaying(screen, 'Add Student')).toHaveLength(1);

    await screen.press('Add Student');
    await settle();
    // The dialog the mockup draws: what it is for, the field, and the two ways out of it.
    const asked = screen.text();
    expect(asked).toContain('Add Student');
    expect(asked).toContain("Enter the student's name for this classroom.");
    expect(screen.field(/Student Name/i)).toBeTruthy();
    expect(controlSaying(screen, 'Cancel')).toHaveLength(1);

    await screen.type(/Student Name/i, 'Amelia Ruiz');
    await screen.press(/^Add$/);
    await settle();

    // They are in that class on the phone now, under the name that was typed.
    const kept = await keptOnThePhone();
    expect(kept.students).toHaveLength(1);
    expect(kept.students[0].name).toBe('Amelia Ruiz');
    expect(kept.students[0].classroomId).toBe(theMaths.id);
    expect(kept.students[0].id).toBeTruthy();

    // And the teacher is told so, out loud, where they are already looking.
    expect(alertsOn(screen).join(' ')).toContain('Amelia Ruiz');

    // The name is taken as the teacher typed it, with the stray spaces a keyboard adds taken off.
    const { detailsFrom, nameMissingFrom } = await rules();
    expect(detailsFrom({ name: '  Noah Patel  ' }).name).toBe('Noah Patel');
    // A name nobody typed adds nobody: the dialog says what is missing instead.
    expect(nameMissingFrom({ name: '   ' })).toMatch(/name/i);
    expect(nameMissingFrom({ name: 'Noah Patel' })).toBeNull();

    takePictureOf(
      "Add ability to add a new student and ensure uniqueness based on name > A teacher can enter a new student's name and add them to a classroom.",
      screen,
    );
    screen.close();
  }, pictureTakesAWhile);

  it("After adding a student, their name appears in that classroom's student list.", async () => {
    const screen = await inTheStudentsOf(theMaths);
    await addStudentNamed(screen, 'Amelia Ruiz');

    // The name is on the list the teacher is standing in front of.
    expect(studentsListed(screen).join(' · ')).toContain('Amelia Ruiz');
    expect(screen.text()).toContain('Amelia Ruiz');

    // A second name joins the first, and the list reads in the order a register is read in.
    await addStudentNamed(screen, 'Noah Patel');
    expect(studentsListed(screen).join(' · ')).toContain('Noah Patel');
    expect(studentsListed(screen)).toHaveLength(2);
    expect(studentsListed(screen)[0]).toContain('Amelia Ruiz');

    // The class's own card counts them, because the count is counted off what the phone keeps.
    await screen.press('Back to the class');
    await settle();
    await screen.press('Back to My Classes');
    await settle();
    expect(controlSaying(screen, 'Mathematics')[0].words).toContain('2 students');

    // Nothing on the list is pinned to a size, so the phone's largest text makes it taller.
    const again = await inTheStudentsOf(theMaths, [theMaths], [
      { id: 's-1', classroomId: theMaths.id, name: 'Liam Chen' },
    ]);
    expect(studentsListed(again).join(' · ')).toContain('Liam Chen');
    expect(again.markup()).not.toMatch(/[;"](max-height|line-height)\s*:/);
    expect(again.markup()).not.toContain('numberOfLines');

    takePictureOf(
      "Add ability to add a new student and ensure uniqueness based on name > After adding a student, their name appears in that classroom's student list.",
      again,
    );
    again.close();
    screen.close();
  }, pictureTakesAWhile);

  it('Check uniqueness within each classroom only, so the same name can exist in different classrooms.', async () => {
    const { nameAlreadyInClass, studentNamedIn, notReadyFor } = await rules();
    const kept: ClassroomData = {
      version: 1,
      classrooms: [theMaths, theScience],
      students: [{ id: 's-1', classroomId: theMaths.id, name: 'Amelia Ruiz' }],
      attendance: [],
    };

    // The name is taken in the class that has it, and free in the class that has not.
    expect(nameAlreadyInClass(kept, theMaths.id, 'Amelia Ruiz')).toBe(true);
    expect(nameAlreadyInClass(kept, theScience.id, 'Amelia Ruiz')).toBe(false);
    expect(studentNamedIn(kept, theMaths.id, 'amelia ruiz')?.id).toBe('s-1');
    expect(studentNamedIn(kept, theScience.id, 'Amelia Ruiz')).toBeNull();
    expect(notReadyFor(kept, theScience.id, { name: 'Amelia Ruiz' })).toBeNull();

    // And on the phone itself: the same name added to one class and then to another leaves two
    // students, one in each class, and neither of them refused.
    const screen = await inTheStudentsOf(theMaths, [theMaths, theScience]);
    await addStudentNamed(screen, 'Amelia Ruiz');
    expect(studentsListed(screen).join(' · ')).toContain('Amelia Ruiz');

    // Over to the other class, by the row at the top of the class's own dashboard.
    await screen.press('Back to the class');
    await settle();
    await screen.press('Science');
    await settle();
    await screen.press('Students');
    await settle();
    expect(studentsListed(screen).join(' · ')).not.toContain('Amelia Ruiz');
    await addStudentNamed(screen, 'Amelia Ruiz');

    // Both are kept, one in each class, and the second was never refused.
    expect(screen.text()).not.toContain('already exists');
    const both = await keptOnThePhone();
    expect(both.students).toHaveLength(2);
    expect(both.students.map((one) => one.name)).toEqual(['Amelia Ruiz', 'Amelia Ruiz']);
    expect(both.students.map((one) => one.classroomId).sort()).toEqual([theMaths.id, theScience.id]);
    expect(new Set(both.students.map((one) => one.id)).size).toBe(2);
    expect(studentsListed(screen).join(' · ')).toContain('Amelia Ruiz');

    takePictureOf(
      'Add ability to add a new student and ensure uniqueness based on name > Check uniqueness within each classroom only, so the same name can exist in different classrooms.',
      screen,
    );
    screen.close();
  }, pictureTakesAWhile);

  it('The list of students never contains two entries with the exact same name in the same classroom.', async () => {
    const screen = await inTheStudentsOf(theMaths);
    await addStudentNamed(screen, 'Amelia Ruiz');

    // The same name typed again, exactly as it was typed the first time.
    await screen.press('Add Student');
    await settle();
    await screen.type(/Student Name/i, 'Amelia Ruiz');
    await screen.press(/^Add$/);
    await settle();

    // The dialog refuses it, in the words the mockup draws, and says them out loud.
    expect(screen.text()).toContain('A student with this name already exists in this classroom.');
    expect(alertsOn(screen).join(' ')).toContain('A student with this name already exists in this classroom.');

    // Nothing was added: one student stands in the class, and one name on the list.
    expect((await keptOnThePhone()).students).toHaveLength(1);

    takePictureOf(
      'Add ability to add a new student and ensure uniqueness based on name > The list of students never contains two entries with the exact same name in the same classroom.',
      screen,
    );

    // The same holds however the name was typed: one name in a class is one student, with the case
    // and the end spaces set aside, because that is how the teacher reading the list tells two
    // names apart.
    const { sameStudentName, addStudent, dataWithStudent } = await rules();
    expect(sameStudentName('Amelia Ruiz', 'amelia ruiz')).toBe(true);
    expect(sameStudentName('Amelia Ruiz', '  AMELIA RUIZ  ')).toBe(true);
    expect(sameStudentName('Amelia Ruiz', 'Amelia Ruiz II')).toBe(false);

    const again = await addStudent(theMaths.id, { name: '  amelia ruiz ' });
    expect(again.added).toBe(false);
    expect(again.said).toContain('already exists');
    expect(again.student).toBeUndefined();
    expect((await keptOnThePhone()).students).toHaveLength(1);

    // A student added to a class nobody is adding them to is nobody's student: a class the phone
    // does not keep is refused rather than written.
    const nowhere = await addStudent('c-nothing', { name: 'Chloe Kim' });
    expect(nowhere.added).toBe(false);
    expect((await keptOnThePhone()).students).toHaveLength(1);

    // And nothing is changed in place: what was handed in still says what it said.
    const before: ClassroomData = { version: 1, classrooms: [theMaths], students: [], attendance: [] };
    const after = dataWithStudent(before, { id: 's-9', classroomId: theMaths.id, name: 'Chloe Kim' });
    expect(before.students).toHaveLength(0);
    expect(after.students).toHaveLength(1);

    screen.close();
  }, pictureTakesAWhile);

  it('The app keeps a record of every student that was successfully added, including their name and classroom.', async () => {
    const screen = await inTheStudentsOf(theMaths, [theMaths, theScience]);
    await addStudentNamed(screen, 'Amelia Ruiz');
    await addStudentNamed(screen, 'Noah Patel');
    // One name refused along the way is one record not kept.
    await addStudentNamed(screen, 'amelia ruiz');

    // Every student that was added is kept, with the name they were added under and the class they
    // were added to — and nobody else.
    const kept = await keptOnThePhone();
    expect(kept.students.map((one) => ({ name: one.name, classroomId: one.classroomId }))).toEqual([
      { name: 'Amelia Ruiz', classroomId: theMaths.id },
      { name: 'Noah Patel', classroomId: theMaths.id },
    ]);
    for (const one of kept.students) expect(one.id).toBeTruthy();
    expect(new Set(kept.students.map((one) => one.id)).size).toBe(2);

    // It is kept on the phone and not in the screen: the app closed and opened again reads the
    // same two students back into the same class.
    const tomorrow = await signIn();
    await tomorrow.press('Classes');
    await settle();
    await tomorrow.press('Mathematics');
    await settle();
    await tomorrow.press('Students');
    await settle();
    const read = studentsListed(tomorrow).join(' · ');
    expect(read).toContain('Amelia Ruiz');
    expect(read).toContain('Noah Patel');

    // And a phone that will not be written to keeps no record and never says it did.
    const { addStudent } = await rules();
    keepClassroomDataIn({
      async read() {
        return { version: 1, classrooms: [theMaths], students: [], attendance: [] };
      },
      async write() {
        throw new Error('this phone has no room left');
      },
    });
    const refused = await addStudent(theMaths.id, { name: 'Chloe Kim' });
    expect(refused.added).toBe(false);
    expect(refused.student).toBeUndefined();
    expect(refused.said).not.toMatch(/has been added/i);

    takePictureOf(
      'Add ability to add a new student and ensure uniqueness based on name > The app keeps a record of every student that was successfully added, including their name and classroom.',
      tomorrow,
    );
    tomorrow.close();
    screen.close();
  }, pictureTakesAWhile);
});
