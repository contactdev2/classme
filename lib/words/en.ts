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
  'home.noClasses': 'No classes yet',
  'home.noClassesWords': 'Your periods, and the students in them, show here once you have a classroom.',
  'home.account': 'Your account — settings',
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
  'roster.search': 'Search students',
  'roster.searchPlaceholder': 'Search students...',
  'roster.noneTitle': 'No students to show',
  'roster.noneMarked': 'Nobody in this class is marked that way.',
  'roster.noneFound': 'No student in this class has that name.',
  'roster.noClassWords':
    'Once you have a classroom with students in it, its register opens here with everybody present.',
  'roster.save': 'Save Attendance',

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
