# Session notes

What each requirement on this branch left for the next one. Add to the end; don't rewrite history.

## 1 — See the login screen on open (8bd736b3)

What is here now:

- `app/index.tsx` is the login screen itself. It is the route at `/`, so the app opens on it with
  nothing in front: no splash, no redirect, no second route. The check
  `See the login screen on open > No other screen appears before the login screen.` holds that
  shape — it fails if another route file appears in `app/`, or if `_layout.tsx` grows a `Redirect`,
  an `initialRouteName` or a `SplashScreen` call. **If a later requirement adds routes (a home
  screen, classrooms, a tab layout), that check must be widened deliberately, not deleted:** the
  honest change is to let other routes exist while still proving `/` is the login screen and that
  nothing is drawn before it.
- `lib/theme.ts` holds the agreed look (round 3): `colors`, `radius`, `space`, `shadow`. Every new
  screen should read from it rather than repeating hex codes. Dark mode (an approved decision, not
  yet asked for) belongs here when it is asked for.
- `test/react-native-dom.tsx` — the checks' stand-in for React Native — gained `TextInput`,
  `Pressable` and `ScrollView`, plus two translations react-native-web also does: the four shadow
  words become one `boxShadow`, and a border width implies a solid border *on that side only*
  (a bare `border-style: solid` gives a browser three black pixels on every side nobody asked about).
  Add a primitive here the moment a screen needs one; the app itself always imports `react-native`.

Decisions taken, so they are not re-decided:

- The screen says **ClassMe**, from `productName()`, not the prototype's "ClassMate", and the footer
  reads `ClassMe v1.0` — the prototype's "Riverside High" is one school's sample data, not a word of
  the product. The rest of the prototype's words are kept as written.
- Sizes are padding, never a fixed `height` or `lineHeight`, and the screen is a `ScrollView`, so it
  still works at the phone's largest text size. `app/index.test.tsx` enforces this on `/` already.
- The email field is `keyboardType="email-address"`, the password field `secureTextEntry` with a
  show/hide button. Both carry an `accessibilityLabel`, which is what the checks read them by.

Half-true, and waiting for the next requirement:

- **Log In does not log anybody in yet.** Pressing it with an empty field says "Enter your email and
  password to log in."; with both filled it does nothing. The requirement that signs a teacher in
  against the phone's own encrypted records should replace the body of `logIn()` in `app/index.tsx`.
- **"Forgot password?" is plain text, not a control.** It is in the prototype, so it is drawn, but
  nothing is behind it. There is no sign-in service to recover from (an approved decision), so
  whatever it does will have to be decided for the device.
- **"Remember me" toggles, and that is all it does.** Nothing reads it yet; the requirement that
  keeps a teacher's login details locally and encrypted should.
- **"Verified against your encrypted local database" is a promise the code has not kept yet.** It is
  the prototype's own wording; make it true in the sign-in requirement, or change the wording.

## 2 — Enter credentials and submit (37d893a1)

What is here now:

- `lib/sign-in.ts` is **the one place a submission goes**. `missingFrom()` says what a teacher has
  still to fill in, `credentialsFrom()` turns what was typed into the pair to be checked (the email
  trimmed, the password untouched — a space inside a password is part of it), and `submitSignIn()`
  answers a submission. `app/index.tsx` goes through all three and holds no sign-in rule of its own,
  so **the requirement that keeps teacher accounts locally and encrypted has one function to teach:
  `submitSignIn`.** Nothing else on the login screen has to change for a real sign-in to work.
- `test/screen.tsx` is the checks' hands and eyes: `open(<Screen />)` mounts a screen on a real DOM
  and hands back `type()`, `press()`, `field()`, `text()` and `markup()`, so a check proves what a
  screen *does* and not only what it draws. `takePictureOf(name, screen)` photographs it with what
  was typed showing. A test file that uses it must start with `// @vitest-environment jsdom`; the
  older markup-only checks stay in the default node environment.
- **jsdom** is a new devDependency, and the only new package: typing and pressing cannot be proved
  by rendering markup to a string. Nothing shipped imports it.
- `test/react-native-dom.tsx`: a `disabled` Pressable no longer answers a click, as a disabled
  Pressable on a phone does not answer a press.

Decisions taken, so they are not re-decided:

- **`submitSignIn` answers "No account on this phone matches that email and password."** That is not
  a placeholder — with no account kept on the phone yet, it is the only true answer. Replace the
  body, not the sentence's place: the screen already says back whatever it is told.
- One press is one submission. While an answer is awaited the screen says "Checking your details…"
  and the button is disabled, so a double tap cannot submit twice.
- What the screen says after a submission is a `Text` with `accessibilityRole="alert"`, so a screen
  reader announces it. Put any later sign-in message there rather than inventing a second place.
- **No message ever contains the password or the error's own words.** A thrown error is answered
  with "Your details could not be checked just now. Try again." and nothing is logged: personal data
  in logs is an approved "never". Keep it that way when real verification can fail for real reasons.

Still half-true, and waiting:

- **"Remember me" still does nothing**, and "Forgot password?" is still plain text, not a control.
  Both are drawn because the prototype draws them (see requirement 1's note).
- **"Verified against your encrypted local database" is still a promise ahead of the code.** The
  submission now goes to one honest place, but nothing encrypted is read yet.
- The password field has no "return key submits" behaviour: `onSubmitEditing` is deliberately not
  wired, because the DOM stand-in strips it and it would ship untested. If a later requirement wants
  it, teach `test/react-native-dom.tsx` to turn Enter into `onSubmitEditing` first.

## 3 — Verify login against local encrypted data (da161aa0)

What is here now:

- `lib/crypto.ts` is SHA-256, HMAC-SHA256 and PBKDF2-HMAC-SHA256 written out in plain TypeScript,
  plus UTF-8 both ways, hex both ways, a constant-time `sameBytes` and `unguessableBytes`. **No new
  package**: the same arithmetic has to run on a phone, in a browser and in a check, and Node's own
  crypto is none of those. `lib/crypto.test.ts` holds every piece to the published answers of
  FIPS 180-4, RFC 4231 and the PBKDF2-SHA256 vectors, *and* to what `node:crypto` answers for input
  at every length a block boundary falls on. Touch that file and those checks will tell you.
- `lib/local-accounts.ts` is the encrypted local database the login screen has been promising since
  requirement 1. One account is one `AccountRecord`: `{ version, salt, iterations, nonce, locked,
  seal }`, all hex, **and nothing in the clear — not the password, not even the email**. The password
  is stretched with PBKDF2 into two keys (one locks, one seals); the blob is locked with an
  HMAC-SHA256 keystream counted from the record's own nonce and sealed with HMAC-SHA256 over every
  stored field. `openAccount` checks the seal *before* reading anything, then only answers when the
  email inside matches the one typed. Wrong password, another teacher's record and an edited record
  are all answered with the same `null`, on purpose: told apart, they would say out loud which
  teachers this phone knows.
- `submitSignIn` in `lib/sign-in.ts` now asks `teacherMatching()` and nothing else. Its outcome
  carries `teacher` when somebody signed in. The sentence for "no" is the one requirement 2 chose,
  unchanged, so the earlier checks still read.
- `app/index.tsx` gained a gate at the top: the route is the login screen until a record opens, and
  `components/signed-in-home.tsx` from then on. **No new route file** — `app/` is still
  `_layout.tsx` and `index.tsx`, so requirement 1's `No other screen appears before the login
  screen.` still holds and did not have to be widened. When a real home screen arrives, that is the
  moment to widen it deliberately, as requirement 1 asked.

Decisions taken, so they are not re-decided:

- **50,000 stretches** (`stretchedTimes`), not the 600,000 a native implementation would use: pure-JS
  PBKDF2 costs ~8µs an iteration on a CI runner and more on a phone, so this is about a second of a
  teacher's morning. A record carries the number it was made with, so raising it later leaves older
  records opening as they did. Checks pass `1_000` as the third argument rather than waiting.
- The sign-in blocks the JS thread while it stretches. The button is already disabled and the screen
  already says "Checking your details…", so it reads as working rather than stuck.
- The signed-in screen is a **component, not a route**, for the reason above. It greets the teacher
  by the email read out of their own record and has a Log Out that only forgets them in memory —
  logging out *securely* is its own requirement.
- `unguessableBytes` throws rather than falling back to anything guessable when a device offers no
  `crypto.getRandomValues`. Node and the browser both have it; if a phone build ever does not, that
  throw is the bug report, not a record anybody could open.

Half-true, and waiting for the next requirement:

- **No account is ever written.** `accountsFile()` is a seam with `accountsIn([])` behind it — the
  records live in memory for as long as the app runs, and nothing enrols a teacher. So on a real
  phone there is no record to match and nobody can sign in yet. The requirement that keeps a
  teacher's login details locally and encrypted has **one line to replace** (the `let file = ...` in
  `lib/local-accounts.ts`) and one screen to add; `lockAccount` already makes the record for it. No
  storage package has been chosen yet: `expo-file-system` writing the records as one file is the
  obvious candidate, and it needs its sentence in the pull request.
- **"Remember me" still does nothing**, and "Forgot password?" is still plain text. Both are drawn
  because the prototype draws them.
- An error on the login screen is in the ordinary text colour: the agreed palette (round 3) has no
  colour for alarm, and inventing one was not this requirement's to do.

## 4 — Land on greeted Home screen (de5e9b36)

What is here now:

- `components/home-screen.tsx` is **Home**, built to the agreed prototype: the top row (menu,
  notifications, the teacher's own avatar), the greeting, the Mon–Fri strip with today picked out,
  the day's classes, and the row of the app's places along the bottom with Home current. It takes
  `now` as a prop (defaulting to the phone's clock) so a check can arrive on a particular morning.
  It **replaces `components/signed-in-home.tsx`**, which is gone — it was the placeholder this
  screen was always going to be.
- `lib/greeting.ts` is the words and nothing else: `partOfDay()` turns the hour into "Good morning"
  / "Good afternoon" / "Good evening" (noon and six are where it changes), and `nameOf()` says what
  to call a teacher. `lib/week.ts` is `schoolWeekOf()`, Monday to Friday of the week a day falls in.
  Both are written out rather than asked of a locale, so every phone and every check reads the same.
- `lib/local-accounts.ts` now keeps a teacher's **name inside the locked blob**, beside their email.
  `TeacherProfile.name` is optional on purpose: a record that keeps none opens exactly as it did,
  and `nameOf()` then greets that teacher by the email the record does keep. That is what keeps
  requirement 3's `Entering the correct email and password lets the teacher continue past the login
  screen.` passing word for word — its record has no name, so Home greets it by its email. **If you
  add a field to a record, add it the same way: optional, inside the lock, and old records still
  open.**
- `app/index.tsx` hands the teacher it signed in to Home. **Still no new route** — `app/` is
  `_layout.tsx` and `index.tsx` — so requirement 1's `No other screen appears before the login
  screen.` is still true and still has not had to be widened. The first requirement that needs a
  second route (Classes, Settings, Attendance) is the one that must widen it deliberately.
- `lib/theme.ts` gained one colour, `accentSoft` (#CBD9F7): the accent quietened, behind the avatar.

Decisions taken, so they are not re-decided:

- **The prototype's Mathematics, Science and English are not in the app.** No classroom can be made
  yet, so Home shows "No classes yet" in the same card shape instead. Shipping one school's sample
  data as if it were the teacher's would be a lie on the first screen they see — the same reasoning
  requirement 1 used to drop "Riverside High". **The requirement that creates classrooms should fill
  that card**: it is one `View` in `components/home-screen.tsx`, under the comment that says so.
- **The bottom row and the header's ☰ and 🔔 are drawn with nothing behind them**, as "Forgot
  password?" is on the login screen. They are deliberately **not** announced as buttons: a control
  that answers nothing should not say it does. Give them a role when you give them a destination.
- **The avatar is the only control on Home, and it logs out.** The prototype sends it to Settings,
  and logging out securely belongs there — but Settings is its own requirement and until it exists
  this is the app's only way back out, so it carries requirement 3's Log Out rather than losing it.
  Its `accessibilityLabel` is "Your account — log out", so a screen reader is not surprised by it.
  **When Settings arrives: the avatar goes there, and the log out moves inside it.**
- Nothing on Home is pinned to a size — no `height`, no `lineHeight`, no `numberOfLines` — and the
  bottom row wraps rather than clips, so the phone's largest text makes it taller. The checks hold
  that shape on Home the way `app/index.test.tsx` holds it on `/`.
- The checks that photograph a screen carry a 120-second timeout (`pictureTakesAWhile`). Nothing in
  them waits on anything; it is the browser drawing the picture, and a cold one on a runner has
  taken fifteen seconds. The two seconds a teacher waits is measured on its own with
  `performance.now()` around the press, at the app's real `stretchedTimes` — about 450ms here.
  **Copy that timeout into any new check that takes a picture**, or it will flake rather than fail.

Half-true, and waiting for the next requirement:

- **Still no account is ever written** (requirement 3's note stands, unchanged): `accountsFile()` is
  `accountsIn([])`, so on a real phone there is no record to open and Home is reachable only from a
  check. The requirement that keeps a teacher's login details locally and encrypted replaces that
  one line — and it is now also the one that should ask a teacher for their **name**, because that
  is what Home greets them by. Until then, a real enrolment would be greeted by its email.
- **"Remember me" still does nothing**, and "Forgot password?" is still plain text.
- Home has no dark mode. It reads every colour from `lib/theme.ts`, so the requirement that adds one
  has one file to change and no hex codes to hunt for in a screen.

## 5 — Back up data to a file (dc68ccb7)

What is here now:

- `components/settings-screen.tsx` is **Classroom Settings**, built to the agreed prototype: the
  teacher's card, **Data & Privacy**, **Preferences**, **Account**, and the footer. It is reached
  from Home's own avatar, which no longer logs out — **Logout now lives in Settings**, where the
  prototype puts it, exactly as requirement 4's note said it should when this screen arrived.
  `app/index.tsx` holds which of the two signed-in screens is in front. **Still no new route**, so
  requirement 1's `No other screen appears before the login screen.` is still true and still has not
  had to be widened. `HomeScreen`'s prop is now `onOpenSettings`, not `onLogOut`.
- `lib/sealed-box.ts` is the lock a backup file and a teacher's sign-in record now **share**:
  `sealBox`/`openBox`, a domain string keeping one kind of box's keys apart from another's, and
  `stretchedTimes` (50,000), which moved here from `lib/local-accounts.ts` and is still re-exported
  from it. `lockAccount`/`openAccount` are now thin: the record format is byte-for-byte what it was,
  and `lib/local-accounts.test.ts` proves it still opens the same way.
- `lib/classroom-data.ts` is **the shape of a teacher's teaching**: `Classroom`, `Student`,
  `AttendanceRecord` (`Present` | `Absent` | `Late`), and `ClassroomData` holding all three. Behind
  a seam (`classroomStore()`), like the accounts. `classroomDataIfWhole()` is what anything read off
  a file goes through before a word of it is put back on the phone. **The requirement that creates
  classrooms should write into this store rather than inventing its own shape**; add a field the way
  requirement 4 added a teacher's name — optional, so older backups still open.
- `lib/backup.ts` makes and opens the file. A backup is `{ product, kind, version, madeAt, box }`:
  only `box` holds any of the teacher's data, and what is beside it is what lets the app recognise a
  file and a teacher tell two of them apart. `backupFileName()` names them so a folder sorts itself.
- `lib/backup-files.ts` is where the file goes, behind a seam: `backupFilesIn({})` for a check, and
  the phone's own documents folder otherwise.

Decisions taken, so they are not re-decided:

- **A backup is locked with a backup password the teacher chooses, not with their sign-in password.**
  Nothing in the app can open a backup, and there is no server to ask (both approved decisions), so
  the key can only be something a person knows. The sign-in password was not reused because the app
  deliberately does not keep it after a submission — see requirement 2's note — and widening that to
  carry it into Settings would be the wrong trade. At least 8 characters; the field is emptied the
  moment a backup is made or opened, so it is never left on screen for the next person holding the
  phone. **A teacher who forgets it has a file nobody can open. That is the honest price.**
- **The screen does not say "AES-256", which the prototype's card does.** The app does not use AES:
  it is PBKDF2-HMAC-SHA256 stretching and an HMAC-SHA256 keystream, written out in `lib/crypto.ts`,
  and the row says so. Same reasoning as dropping "Riverside High" in requirement 1 — a prototype's
  sample words are not a licence to claim something untrue. "Last Backup" says `None yet · on device
  only` until there is one, then the day the newest was saved.
- **`expo-file-system` is a new package**, the only one this requirement adds, with its sentence in
  the pull request. React Native has no way to write a file. It is `import()`ed inside
  `lib/backup-files.ts` at the moment a backup is written, never at module load, so a check never
  loads a native module it has no phone for.
- **Restore replaces what is on the phone with what is in the file**, and the screen says so before a
  teacher presses it. Merging two sets of attendance records is a question nobody has answered yet.
- The Dark Mode and Notifications switches flip and do nothing else — drawn because the prototype
  draws them, like "Remember me" on the login screen. Edit Profile and Help & Support are rows with
  nothing behind them and are deliberately not announced as buttons.
- `test/screen.tsx`'s `visibleText` now turns `&amp;` back into `&` before a check reads it: a
  screen saying "Data & Privacy" should read as "Data & Privacy", not as the DOM's own spelling.
  A section's title is drawn in capitals with `textTransform`, not written in them, so a screen
  reader hears the words.

Half-true, and waiting for the next requirement:

- **Nothing on the phone creates a classroom, a student or an attendance mark yet**, and
  `classroomStore()` is in memory, so on a real phone a backup made today is a backup of nothing and
  a restore is forgotten when the app closes. The lock, the file and both screens are real and
  proved; what is missing is the data to put in them and a store that outlasts the app. The same
  single-line swap requirement 3 left for the accounts (`accountsFile()`) is now waiting in two
  places: `let store = ...` in `lib/classroom-data.ts` and `let file = ...` in `lib/local-accounts.ts`.
- **A backup never leaves the phone by itself**, which is the point — but a teacher whose phone is
  lost needs the file to be somewhere else. Moving it off is the phone's own sharing (`expo-sharing`
  would be the package), and that was not this requirement's to decide.
- `app/verify-login.test.tsx`'s first check still carries vitest's default 5-second timeout and takes
  a picture. On a cold runner the browser alone has taken longer than that. Every check written since
  requirement 4 carries `pictureTakesAWhile` (120s); **that one should be given it too** the next
  time anybody is in that file.

## 7 — Make a profile on a phone (5708497f)

What is here now:

- **`lib/crypto.ts`'s `unguessableBytes()` answers on a phone.** This is the whole of the reported
  bug: a sealed box asks for a salt and a nonce, there was one source for them
  (`globalThis.crypto.getRandomValues`), a browser has it and **Hermes has not** — so every check
  passed and every teacher saw "Your profile could not be created just now." Where there is no Web
  Crypto the bytes now come from `globalThis.expo.uuidv4`, expo-modules-core's own native UUID,
  which on Android is `java.util.UUID.randomUUID()` and so `SecureRandom`. Enough are gathered to
  cover the bytes asked for and folded together with HMAC-SHA256, so nothing handed back is a UUID
  written out. **No package was added**, deliberately: a new native module changes the app's
  fingerprint, and the attempt would then have no test app to be walked in.
- **`lib/accounts-file.ts` is the one line requirement 3 left waiting.** `accountsFile()` is no
  longer `accountsIn([])` on a phone: `app/_layout.tsx` hands the store
  `accountsOnThisPhone()`, which keeps the records as the text of one file in the app's documents
  folder (`expo-file-system`, `import()`ed only when a record is read or written). The seam is
  `KeptText`, so a check hands over text of its own and never loads a native module. **The same
  swap is still waiting in `lib/classroom-data.ts`**, and `accountsKeptIn` is the shape to copy.
- **The signup has a third step, "Done"**, built to this requirement's mockup: the three steps
  ticked, *Profile Created*, the teacher's own name and email, what became of them, and **Go to
  Dashboard**, which signs them in. `SignUpScreen`'s prop is now `onDone(teacher)`, not
  `onCreated(said)`, and the login screen's `told` is gone with it — nobody is sent back to type
  what they have just typed.

Decisions taken, so they are not re-decided:

- **The duplicate-email refusal says "An account with this email already exists."** — this
  requirement's own words, in all five catalogues, in place of "A profile already uses that email".
- `journeys/*.walk.yaml` are the first walks this repository has. The screen's own name and the
  submit button **both** say "Create Profile", so a walk taps `text: Create Profile, index: 1`.
  Give a new control words of its own if you would rather not count.
- The checks in `app/create-profile-on-a-phone.test.tsx` take the browser's Web Crypto away and
  leave the app with a phone's before they touch a screen. **Any check that is about what a phone
  really does should do the same** — a browser is a generous machine and hides exactly this class
  of bug.

Half-true, and waiting for the next requirement:

- **A teacher's classrooms, students and attendance still do not outlast the app**:
  `classroomStore()` is still in memory, so a backup made on a real phone is still a backup of
  nothing. The accounts now show how it is done.
- The accounts file is written whole on every change. Two of them at once would be the last one
  written, and a phone killed mid-write loses the file: the records then read as none, and a
  teacher can sign up again but not back into what was there. Writing beside and moving over would
  fix it the day anything else writes to that file.

## 8 — Make a profile on a phone, again (a11b52ef)

Attempt 7 found one reason the signup said "Your profile could not be created just now." and fixed
it. A judge held a phone afterwards and read the same sentence. This is what was still wrong, and
how to tell next time.

What is here now:

- **`hermes-engine-cli` is how you find out what a phone does.** `npm install --no-save --prefix
  /tmp/h hermes-engine-cli` gives you a linux `hermes` binary; `npx esbuild` a probe that imports
  `lib/crypto.ts` and run it there, and you are looking at the engine the app really runs, with no
  `globalThis.crypto` and no `globalThis.expo`. That is how both findings below were measured, and
  it costs about a minute. `npx expo export:embed --platform android --bundle-output /tmp/b.js` is
  the other half: it shows what Metro actually compiled, which is how `import('expo-file-system')`
  was ruled out (it becomes `asyncRequire` over a module that is in the bundle, and resolves).
- **`unguessableBytes()` no longer refuses, ever.** Web Crypto, then `globalThis.expo.uuidv4`, then
  a seed folded out of the clock, a run counter and a long spread of `Math.random()`. The reasoning
  is in the comment and it matters: a salt and a nonce have to be **unique**, not secret — they are
  written beside the record in the clear — so the last resort costs a record nothing, while
  throwing cost a teacher their whole profile. **Do not put the throw back.**
- **`addAccount` answers `boolean` and never throws**, and never writes over a file it could not
  read (that file could be another teacher's). `submitSignUp`'s outcome carries `saved`, and the
  third step says `signUp.doneSaved` or `signUp.doneNotSaved` accordingly. A phone with no folder of
  its own now reads as keeping no records rather than throwing, so a first profile can be made on
  it. **`teacherMatching` was deliberately left strict**: a phone that cannot be read should tell a
  teacher signing in that it could not check, not that their password is wrong.
- **`lib/crypto.ts` is about four times faster and gives the same answers.** `compress()` is the one
  place a block is hashed; `keyStates()`/`stretchOnce()` compress the password's two HMAC block
  states once per PBKDF2 call instead of once per round. Locking a record went from 18.8s to 4.3s
  under Hermes on a CI machine. The rotations are written out inline because a helper call cost
  about half the throughput — if you tidy that back into a function, measure it.
- **The checks in `app/create-profile-on-a-phone.test.tsx` now take everything away**: no Web
  Crypto, no `globalThis.expo.uuidv4`, and in two of them no file the phone will read or write.
  All seven were pushed red first, with the judge's own sentence in the failure output. **A check
  that hands the app a source of unguessable bytes proves nothing about a phone** — that was the
  whole of why attempt 7 passed CI and failed in a hand.

Half-true, and waiting for the next requirement:

- **Four seconds on a CI machine is ten to twenty on a phone**, and the JS thread is blocked for all
  of it — the screen says "Creating your profile…" and the button is disabled, so it reads as
  working, but it is not quick. The next halving is `markOf`: it stretches the email a second full
  50,000 times, deliberately (see its comment), so cutting it is a security decision somebody has
  to take on purpose. Doing the stretching off the JS thread needs a native module, which changes
  the app's fingerprint and leaves an attempt with no test app to be walked in.
- **The exact reason attempt 7 failed on the judge's phone was never identified**, only the three
  seams that could cause it, all of which are now closed. If this sentence is ever read on a phone
  again, DoneMark's try strip now carries the error's own words from `createProfile`'s catch — read
  the strip before guessing.
- `classroomStore()` is still in memory (requirement 5 and 7's note stands). `lib/accounts-file.ts`
  is the shape to copy, and it now shows how to fail softly as well.
