// Every word the app says, in the language it was written in. This is the source: a translation is
// a file beside this one with the same keys and the words of another language against them, and a
// key with no word in a catalogue falls back to the English here rather than showing a teacher a
// key. Nothing on a screen is written in a screen: a screen asks for a key, and gets words.
//
// A word in braces is filled in when the sentence is said — {name} is a teacher's own name, {many}
// a number the app counted — so a translation can put it where its own grammar wants it.
export const english = {
  // The login screen, which is the screen the app opens on.
  'login.tagline': 'TEACH · TRACK · INSPIRE',
  'login.welcome': 'Welcome back',
  'login.invite': 'Sign in to manage your classrooms and track attendance securely.',
  'login.email': 'Email Address',
  // An address, written the same way in every language.
  'login.emailPlaceholder': 'you@school.edu',
  'login.password': 'Password',
  'login.passwordPlaceholder': 'Your password',
  'login.showPassword': 'Show password',
  'login.hidePassword': 'Hide password',
  'login.remember': 'Remember me',
  'login.forgot': 'Forgot password?',
  'login.logIn': 'Log In',
  'login.checking': 'Checking your details…',
  'login.couldNotCheck': 'Your details could not be checked just now. Try again.',
  'login.verified': 'Verified against your encrypted local database',
  'login.or': 'OR',
  'login.noProfile': 'New here?',
  'login.signUp': 'Create a profile',
  'login.promiseTitle': 'Your data stays on this device',
  'login.promiseWords':
    'All classroom records are stored in an encrypted on-device database. Nothing is synced externally.',

  // What a submission came to, said back to the teacher who made it.
  'signIn.missingBoth': 'Enter your email and password to log in.',
  'signIn.missingEmail': 'Enter your email address to log in.',
  'signIn.missingPassword': 'Enter your password to log in.',
  'signIn.noMatch': 'No account on this phone matches that email and password.',
  'signIn.signedIn': 'Signed in.',

  // Making a profile: the two steps of it, and what each one asks for.
  'signUp.title': 'Create Profile',
  'signUp.backToLogin': 'Back to sign in',
  'signUp.backToName': 'Back to your name',
  'signUp.stepName': 'Name',
  'signUp.stepAccount': 'Account',
  'signUp.stepDone': 'Done',
  'signUp.nameTitle': 'What should we call you?',
  'signUp.nameWords': 'Use the name your students know you by. It greets you every time you sign in.',
  'signUp.name': 'Your Name',
  // A sample name, so the field shows the shape of an answer rather than an empty box.
  'signUp.namePlaceholder': 'Ms. Patel',
  'signUp.school': 'Your School (optional)',
  'signUp.schoolPlaceholder': 'Riverside High',
  'signUp.continue': 'Continue',
  'signUp.greeting': 'Hi, {name}',
  'signUp.accountWords': 'Now set your email and password to finish signup.',
  'signUp.passwordPlaceholder': 'At least {least} characters',
  'signUp.passwordHint': 'Password must be at least {least} characters.',
  'signUp.create': 'Create Profile',
  'signUp.haveProfile': 'Already have a profile?',
  'signUp.signIn': 'Sign In',
  'signUp.onThisPhone': 'Your profile is made on this phone and stays on it. No connection needed.',

  // What a submission came to, said back to the teacher who made it.
  'signUp.missingName': 'Enter your name to carry on.',
  'signUp.missingEmail': 'Enter your email address to create your profile.',
  'signUp.badEmail': 'Enter an email address in the form name@school.edu.',
  'signUp.missingPassword': 'Choose a password to create your profile.',
  'signUp.shortPassword': 'Choose a password of at least {least} characters.',
  'signUp.emailTaken': 'An account with this email already exists. Sign in with it instead.',
  'signUp.making': 'Creating your profile…',
  'signUp.created': 'Profile Created',
  'signUp.doneWords': 'Your account is ready. Welcome to {app}, {name}.',
  'signUp.doneSaved': 'Your details have been saved and will be available when you reopen the app.',
  'signUp.doneNotSaved': 'Your profile is ready on this phone. This phone could not write it down, so you may have to make it again when you reopen the app.',
  'signUp.toDashboard': 'Go to Dashboard',
  'signUp.couldNotCreate': 'Your profile could not be created just now. Try again.',

  // The first morning: the welcome a teacher is met with, and the three slides that say what the
  // app is for before they are put to work.
  'onboard.getStarted': 'Get Started',
  'onboard.next': 'Next',
  'onboard.skip': 'Skip',
  'onboard.back': 'Back a step',
  // Which slide of how many, written as a count: 1/3.
  'onboard.step': '{at}/{of}',
  'onboard.welcomeTitle': 'A simpler way to manage your classroom',
  'onboard.welcomeWords': 'Take attendance, manage classes, and stay connected — all in one place.',
  'onboard.attendanceTitle': 'Take Attendance in Seconds',
  'onboard.attendanceWords': 'Mark your class, track progress, and never miss a day.',
  'onboard.organiseTitle': 'Organize Every Class',
  'onboard.organiseWords': 'Keep your classrooms, periods and students in order.',
  'onboard.insightsTitle': 'Gain Insights',
  'onboard.insightsWords': "View attendance trends and support every student's success.",

  // Home.
  'home.greetingMorning': 'Good morning',
  'home.greetingAfternoon': 'Good afternoon',
  'home.greetingEvening': 'Good evening',
  'home.greetingLine': '{part},',
  'home.greetingName': '{name} 👋',
  'home.here': "Here's what's happening today.",
  'home.todayLabel': 'Today',
  // The day being viewed, where it is not today: 'Wed, Apr 23'. It also names each date in the
  // selector to a screen reader, which is how one of the five is picked by name.
  'home.dayHeading': '{day}, {date}',
  // The way into the register of the class the teacher is standing in.
  'home.take': 'Take Attendance',
  // Said on a day that is not today, where that button would be.
  'home.notToday': 'Attendance is taken on the day itself.',
  'home.noClasses': 'No classes yet',
  'home.noClassesWords': 'Your periods, and the students in them, show here once you have a classroom.',
  'home.account': 'Your account — profile',
  'place.home': 'Home',
  'place.classes': 'Classes',
  'place.attendance': 'Attendance',
  'place.messages': 'Messages',
  'place.more': 'More',

  // The school week along the top of Home.
  'day.mon': 'Mon',
  'day.tue': 'Tue',
  'day.wed': 'Wed',
  'day.thu': 'Thu',
  'day.fri': 'Fri',
  'day.sat': 'Sat',
  'day.sun': 'Sun',
  'month.1': 'Jan',
  'month.2': 'Feb',
  'month.3': 'Mar',
  'month.4': 'Apr',
  'month.5': 'May',
  'month.6': 'Jun',
  'month.7': 'Jul',
  'month.8': 'Aug',
  'month.9': 'Sep',
  'month.10': 'Oct',
  'month.11': 'Nov',
  'month.12': 'Dec',
  // A month written out in full, as the heading over the days of it and in a month's own summary.
  'monthFull.1': 'January',
  'monthFull.2': 'February',
  'monthFull.3': 'March',
  'monthFull.4': 'April',
  'monthFull.5': 'May',
  'monthFull.6': 'June',
  'monthFull.7': 'July',
  'monthFull.8': 'August',
  'monthFull.9': 'September',
  'monthFull.10': 'October',
  'monthFull.11': 'November',
  'monthFull.12': 'December',
  'week.date': '{month} {day}',

  // The Classes list: all of a teacher's own classes, and the way into any one of them.
  'classes.title': 'My Classes',
  'classes.back': 'Back to Home',
  'classes.all': 'All',
  'classes.active': 'Active',
  'classes.archived': 'Archived',
  // A class card's second line: the period it meets in, and how many are in it.
  'classes.meta': '{period} · {students}',
  'classes.noneAll': 'No classes yet',
  'classes.noneActive': 'No classes being taught',
  'classes.noneArchived': 'No classes put away',
  'classes.noneWords': 'Your classes show here, with the period each one meets in and how many students are in it.',
  // Making one: the way to the form from a teacher's own list, and the form itself.
  'classes.newClass': 'New classroom',
  'classes.create': 'Create Classroom',
  'classes.noneInvite': 'Create your first classroom to start adding students and tracking attendance.',
  'classes.noneFoot': 'Your classrooms will appear here',
  // A class whose teacher left the period empty, on its own card.
  'classes.noPeriod': 'No period set',
  'newClass.title': 'New Classroom',
  'newClass.back': 'Back to My Classes',
  'newClass.preview': 'Your new classroom',
  'newClass.name': 'Classroom Name',
  'newClass.namePlaceholder': 'e.g. Mathematics',
  'newClass.period': 'Period',
  'newClass.periodPlaceholder': 'e.g. 1st Period',
  'newClass.subject': 'Subject Icon',
  'newClass.colour': 'Colour',
  'newClass.note': 'Only the name is needed. You can add students once the classroom is made.',
  'newClass.saving': 'Creating this classroom…',
  'newClass.missingName': 'Type a name for this classroom to create it.',
  // Said in these words: the teacher already has a class of their own by this name.
  'newClass.nameTaken': 'A classroom with this name already exists',
  'newClass.couldNotSave': 'This classroom could not be saved on this phone just now. Try again.',
  'newClass.created': '{name} has been created.',
  // What each subject icon stands for, so a finger can find the icon by its name.
  'subject.maths': 'Maths',
  'subject.science': 'Science',
  'subject.language': 'Languages',
  'subject.humanities': 'Humanities',
  'subject.arts': 'Arts',
  'subject.music': 'Music',
  // And the colours, for the same reason: a colour nobody can name is nobody's choice.
  'colour.blue': 'Blue',
  'colour.green': 'Green',
  'colour.purple': 'Purple',
  'colour.amber': 'Amber',
  'colour.red': 'Red',

  // One class's own attendance, on the dashboard behind its card.
  'class.back': 'Back to My Classes',
  'class.range': 'Last 30 days',
  'class.overview': 'Overview',
  'class.students': 'Students',
  'class.trends': 'Trends',
  'class.overall': 'Overall Attendance',
  // A share of a class, written as a share: 92% is 92% in every language.
  'class.rate': '{rate}%',
  'class.trend': 'Attendance Trend',
  'class.weekly': 'Weekly',
  'class.weekEmpty': 'Nothing marked',
  'class.insights': 'Key Insights',
  'class.insightUp': 'Attendance is up {points}% on the thirty days before.',
  'class.insightDown': 'Attendance is down {points}% on the thirty days before.',
  'class.insightSteady': 'Attendance is holding steady against the thirty days before.',
  'class.insightNone': 'Nothing is marked for this class yet. Once you take attendance, its rate and its trend show here.',
  // One class's own list of students, and the dialog where a teacher adds one to it.
  'students.back': 'Back to the class',
  'students.add': 'Add Student',
  'students.noneTitle': 'No students yet',
  'students.noneInvite': 'Add your first student to this classroom to start taking attendance.',
  'newStudent.words': "Enter the student's name for this classroom.",
  'newStudent.name': 'Student Name',
  'newStudent.namePlaceholder': 'e.g. Chloe Kim',
  'newStudent.cancel': 'Cancel',
  'newStudent.add': 'Add',
  'newStudent.saving': 'Adding this student…',
  'newStudent.missingName': "Type the student's name to add them.",
  // Said in these words: somebody in this class already has this name.
  'newStudent.nameTaken': 'A student with this name already exists in this classroom.',
  'newStudent.couldNotSave': 'This student could not be saved on this phone just now. Try again.',
  'newStudent.noClass': 'This classroom is no longer on this phone.',
  'newStudent.added': '{name} has been added to {class}.',

  'tally.present': 'Present',
  'tally.absent': 'Absent',
  'tally.late': 'Late',
  // Taking attendance: one class's register, with everybody on it present until the teacher says
  // otherwise.
  'roster.title': 'Take Attendance',
  'roster.back': 'Go back',
  // Which register this is: the period the class meets in, and the day it is being taken on.
  'roster.when': '{period} · {day}, {date}',
  'roster.all': 'All',
  // A filter, with how many of the class stand at it: a count written as a count.
  'roster.counted': '{name} ({many})',
  // The same, at the foot of the screen, where the class is added up.
  'roster.tally': '{name}: {many}',
  // The bar along the foot of the register, where the class is added up for a teacher's one look
  // before they keep it: what that bar is called to a screen reader.
  'roster.summary': 'Attendance summary',
  'roster.search': 'Search students',
  'roster.searchPlaceholder': 'Search students...',
  'roster.noneTitle': 'No students to show',
  'roster.noneMarked': 'Nobody in this class is marked that way.',
  'roster.noneFound': 'No student in this class has that name.',
  'roster.noClassWords':
    'Once you have a classroom with students in it, its register opens here with everybody present.',
  'roster.save': 'Save Attendance',
  // What a student's own status is called to a screen reader: whose mark it is, what it stands at
  // now, and that pressing it changes it.
  'roster.change': '{name} — {mark}. Tap to change.',

  // What a teacher is told while the register is being kept, and if the phone would not keep it.
  'roster.saving': 'Saving…',
  'roster.couldNotSave': "Today's attendance could not be saved on this phone. Try again.",

  // The confirmation that follows a register being kept: that it is saved, which register it was,
  // the day it was taken on, who saved it, and the two ways on from it.
  'saved.title': 'Attendance',
  'saved.back': 'Back to the register',
  'saved.done': 'Attendance Saved!',
  // Which register was kept: the class, and the period it meets in.
  'saved.where': '{class} — {period}',
  // The day it was taken on, as this language writes a day and a date together.
  'saved.when': '{day}, {date}',
  'saved.by': 'Saved by {name}',
  'saved.report': 'View Class Report',
  'saved.home': 'Back to Home',
  'saved.editWords': "You can edit today's attendance anytime from Class Report.",

  // A student's own profile, opened from the register by their name: their attendance over time.
  'student.open': "Open {name}'s profile",
  'student.title': 'Student Profile',
  'student.back': 'Back to the register',
  // Which class of the teacher's own this student is in, and when it meets.
  'student.in': '{class} · {period}',
  'student.overview': 'Overview',
  'student.attendance': 'Attendance',
  'student.notes': 'Notes',
  // The three numbers at the top of a profile: what the group of them is called to a screen
  // reader, and what each of them is a number of.
  'student.summary': 'Attendance summary',
  'student.rate': 'Attendance Rate',
  'student.absences': 'Absences',
  'student.lates': 'Late',
  'student.recent': 'Recent Attendance',
  'student.viewAll': 'View All',
  // What the list of a student's days is called to a screen reader.
  'student.history': 'Attendance history',
  // One day of it: the date it was taken on, and what the student was marked as.
  'student.day': '{date} — {mark}',
  // A day with the year on it, which a term read back in a later one needs.
  'student.dayDate': '{date}, {year}',
  'student.none': 'Nothing is marked against this student yet. Once you take attendance, their days show here.',
  // The month a profile adds up at the foot of its Attendance tab.
  'student.monthSummary': '{month} Summary',
  'student.tracked': 'Days Tracked',
  // The note a teacher keeps about a student, which nothing on the phone keeps yet.
  'student.noteTitle': 'Teacher Note',
  'student.noNote': 'No note has been kept for this student yet.',
  // The whole record, behind 'View All'.
  'student.fullTitle': 'Full Attendance Record',
  'student.fullBack': 'Back to the profile',
  // A month, as the heading over the days of it: 'April 2025'.
  'student.monthOf': '{month} {year}',

  // The three marks, as a register says them of one student.
  'mark.present': 'Present',
  'mark.absent': 'Absent',
  'mark.late': 'Late',

  // Classroom Settings.
  'settings.title': 'Classroom Settings',
  'settings.back': 'Back to Home',
  'settings.teacher': 'Teacher',
  'settings.dataPrivacy': 'Data & Privacy',
  'settings.localStorage': 'Local Encrypted Storage',
  'settings.localStorageWords': 'All classroom data is encrypted on-device',
  'settings.active': 'Active',
  'settings.standard': 'Encryption Standard',
  // The arithmetic's own name, which is the same in every language.
  'privacy.standardValue': 'PBKDF2 · HMAC-SHA256',
  'settings.externalSync': 'External Sync',
  'settings.disabled': 'Disabled',
  'settings.lastBackup': 'Last Backup',
  'settings.noBackupYet': 'None yet · on device only',
  'settings.backupOn': '{when} · on this device',
  'settings.saved': 'Saved',
  'settings.backupTitle': 'Encrypted Backup File',
  'settings.backupWords': 'Keeps your classrooms, students and attendance if this phone is lost or replaced',
  'settings.backupChoose':
    'Choose a password for the file. Only that password opens it — the app keeps no copy of it, and the backup is written to this phone and sent nowhere.',
  'settings.backupPassword': 'Backup password',
  'settings.backupPasswordPlaceholder': 'A password only you know',
  'settings.showBackupPassword': 'Show backup password',
  'settings.hideBackupPassword': 'Hide backup password',
  'settings.createBackup': 'Create Encrypted Backup',
  'settings.restoreTitle': 'Restore from a backup',
  'settings.restoreWords':
    'Enter the password a backup was saved with, then restore it. What is on this phone now is replaced by what is in the file.',
  'settings.restore': 'Restore',
  'settings.restoreNamed': 'Restore {name}',
  'settings.savedWhen': 'Saved {when}',
  'settings.noBackups': 'No backup files on this phone yet. The ones you make show here, ready to restore.',
  'settings.promise':
    'Your student and attendance data never leaves this device. Everything is stored in a secure local database.',
  'settings.preferences': 'Preferences',
  'settings.darkMode': 'Dark Mode',
  'settings.darkModeHint': 'Easier viewing in low light',
  'settings.notifications': 'Notifications',
  'settings.notificationsHint': 'Attendance reminders & alerts',
  'settings.account': 'Account',
  'settings.editProfile': 'Edit Profile',
  'settings.help': 'Help & Support',
  'settings.logout': 'Logout',
  'settings.foot': '{product} v1.0 · Data stored securely on this device',

  // ─── The profile menu ────────────────────────────────────────────────────────────────────────
  'profile.title': 'Profile',
  'profile.menu': 'Profile menu',
  'profile.at': 'Teacher · {school}',
  'profile.noSchool': 'School not added yet',
  'profile.reports': 'Attendance Reports',
  'profile.darkModeOn': 'Dark Mode is on',
  'profile.darkModeOff': 'Dark Mode is off',

  // The backup itself, as a teacher is told about it.
  'backup.chooseLonger': 'Choose a backup password of at least 8 characters. Only this password opens the file.',
  'backup.making': 'Making your backup…',
  'backup.saved': 'Backup saved to {where}. It holds {classrooms}, {students} and {attendance}.',
  'backup.failed': 'That backup could not be saved just now. Try again.',
  'backup.needPassword': 'Enter the password this backup was saved with.',
  'backup.opening': 'Opening your backup…',
  'backup.wrongPassword': 'That password does not open this backup file.',
  'backup.restored': 'Restored {classrooms}, {students} and {attendance} from this backup.',
  'backup.unreadable': 'That backup file could not be read. Try another one.',
  'backup.wherePhone': 'this phone',
  'backup.whereFolder': 'the {folder} folder on this phone',
  'counted.classroom.one': '{many} classroom',
  'counted.classroom.many': '{many} classrooms',
  'counted.student.one': '{many} student',
  'counted.student.many': '{many} students',
  'counted.record.one': '{many} attendance record',
  'counted.record.many': '{many} attendance records',

  // The language picker, inside Classroom Settings.
  'language.title': 'App Language',
  'language.note': 'Language applies to all screens immediately and is remembered next time you open the app.',
  'language.default': 'Default',
  'language.rtl': 'Right-to-left',
  'language.name.zh-Hans': 'Simplified Chinese',
  'language.name.fr': 'French',
  'language.name.ar': 'Arabic',
  'language.name.ja': 'Japanese',
  'language.name.en': 'English',
  // One language in the picker, with what is worth saying about it beside its own name.
  'language.withDefault': '{language} · Default',
  'language.withRtl': '{language} · Right-to-left',

  // A screen that failed to draw, as a teacher is told about it.
  'error.wrong': 'Something went wrong on this screen.',
  'error.retry': 'Try again',
} as const;

/** A key a screen asks for. */
export type WordKey = keyof typeof english;

/** One language's words: the same keys as the English above, with its own words against them. */
export type Words = Record<WordKey, string>;
