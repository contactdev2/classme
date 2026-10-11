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
  'login.promiseTitle': 'Your data stays on this device',
  'login.promiseWords':
    'All classroom records are stored in an encrypted on-device database. Nothing is synced externally.',

  // What a submission came to, said back to the teacher who made it.
  'signIn.missingBoth': 'Enter your email and password to log in.',
  'signIn.missingEmail': 'Enter your email address to log in.',
  'signIn.missingPassword': 'Enter your password to log in.',
  'signIn.noMatch': 'No account on this phone matches that email and password.',
  'signIn.signedIn': 'Signed in.',

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
