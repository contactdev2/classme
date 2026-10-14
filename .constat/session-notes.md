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

## 9 — Complete first-time onboarding (2bbb040a)

What is here now:

- **`components/onboarding-screen.tsx` is the first morning with the app**: the welcome the agreed
  prototype draws (the logo, the product's own name, the tagline, the picture, "A simpler way to
  manage your classroom", the dots, **Get Started**) and then three slides — *Take Attendance in
  Seconds*, *Organize Every Class*, *Gain Insights* — each counted `1/3`, `2/3`, `3/3`, with a way
  back a step, **Next** and **Skip**, and on the last of them **Get Started**, which is the way into
  Home. The drawings are made of this app's own rounded shapes and emoji, never an image file, and
  carry no words a teacher has to read.
- **`lib/onboarding.ts` is whether somebody has been welcomed on this phone**, behind the same kind
  of seam as the accounts: `onboardingIn(false)` in memory for a check, `onboardingOnThisPhone()` —
  the text of `classme-onboarding.json` in the app's own documents folder — installed by
  `app/_layout.tsx`. `finishedOnboarding()` and `rememberOnboardingFinished()` **never throw**: a
  phone that will not answer reads as nobody welcomed, which costs a teacher the welcome once more
  and nothing else.
- **`lib/accounts-file.ts` now exports `textOnThisPhone(name)`**, the generic it already had inside
  it. `accountsTextOnThisPhone()` is that, with the accounts' own file name; the onboarding memory
  is that, with its own. **Anything else that needs a file on the phone should use it** rather than
  writing the expo-file-system dance a third time.
- `app/index.tsx` holds the walkthrough between a teacher signing in — by either way in, the login
  screen or the last step of the signup — and Home. Both ways go through one `signedIn(made)`, which
  **asks the phone whether the walkthrough is finished before the screen changes**, so a returning
  teacher never sees it flash past. **Still no new route**: requirement 1's `No other screen appears
  before the login screen.` is still true and still has not had to be widened.

Decisions taken, so they are not re-decided:

- **The walkthrough comes after signing in, not before the login screen.** The criterion says the
  last slide leads to the Home dashboard, and Home only exists for somebody signed in; and the app
  opening on the login screen and nothing else is requirement 1's own criterion.
- **What is remembered is "somebody has been welcomed on this phone", not which teacher.** An email
  in the clear in that file would say out loud which teacher this phone knows — exactly what the
  sign-in records go to some trouble not to say — and a phone belongs to one teacher, which is an
  approved decision. `lib/onboarding.test.ts` holds that file to it.
- **Skip counts as finished.** A teacher who has decided they do not want the walkthrough should not
  be asked again tomorrow. It is on the slides that have a Next and not on the last one, where the
  button beside it would go to the same place.
- **The second slide is this requirement's own.** The chosen mockup draws 1/3 and 3/3 only; the
  criterion asks for attendance, organisation and insights, so *Organize Every Class* was written to
  the same shape as the two that were drawn.
- `onboard.step` (`{at}/{of}`) is in `wordsAllowedToStay` in `lib/i18n.ts`: a count written as a
  count is the same count in every language the app offers.
- **Seven earlier check files now say out loud that their phone's teacher has already been
  welcomed** (`keepOnboardingIn(onboardingIn(true))`), because they sign in and read Home and the
  walkthrough would otherwise stand in front of it. That is a deliberate widening, not a quiet one:
  the first morning itself is proved in `app/complete-onboarding.test.tsx`. **A new check that signs
  a teacher in and expects Home must do the same**, or walk the four presses.
- `journeys/tapping-get-started-on-the-last-slide-leads-to-the-home-dashboard.walk.yaml` is the walk
  for a real phone: a profile made, the welcome, the three slides, and the dashboard. The signup walk
  that ended on the dashboard was given the same four taps, because that is now the way there on a
  phone nobody has been welcomed on.
- `test/fonts/*.woff2` were gathered again (`node test/fonts/gather-fonts.mjs`) for the characters
  the new catalogues brought. Run it whenever a catalogue gains a character.

Half-true, and waiting for the next requirement:

- **The walkthrough's three slides promise things the app cannot do yet.** Organising classes and
  attendance insights are each their own requirement; the slides say what the app is for, not what
  is behind a button today. The requirements that build them have nothing to change here.
- **The memory is per phone, not per teacher.** Two teachers sharing one phone: the second one is
  never welcomed. That follows the approved decision that a teacher opens the app on their own
  phone; the day that stops being true, the honest fix is a mark of the teacher inside their own
  sealed record, not their email in this file.
- `classroomStore()` is still in memory (requirement 5, 7 and 8's note stands), so a backup made on
  a real phone is still a backup of nothing. `lib/accounts-file.ts` and now `lib/onboarding.ts` both
  show how a thing is kept on the phone.

## 10 — Browse and switch between classes (3e0408cc)

What is here now:

- **`components/classes-screen.tsx` is My Classes**, built to the agreed prototype: the way back to
  Home, the screen's name, the `+` the prototype draws, the three filter tabs — **All**, **Active**,
  **Archived** — and a card for each class with its subject icon on a wash of its own colour, its
  name, `{period} · {n} students`, and the chevron into it. It opens on **Active**, as the prototype
  draws it, and a class put away carries an *Archived* badge on its own card so the All list is
  never a puzzle. An empty list says which emptiness it is (`classes.noneAll` / `noneActive` /
  `noneArchived`) rather than showing nothing.
- **`components/class-attendance-screen.tsx` is one class's dashboard**, which is what a card opens:
  the class's name, *Last 30 days*, the row of pills that **switches straight to another class**,
  the Overview / Students / Trends tabs with Overview the one in use, the ring with the share
  present and the three counts beside it, the weekly trend, and one sentence of *Key Insights*.
- **`lib/classes.ts`** is the reading of a teacher's classes: `classesShown(data, filter)`,
  `studentsInClass`, `classroomWithId`, `classesToSwitchTo`, and `periodOrder`, which is how a list
  sorts itself ('1st Period' before '2nd Period', 'Period 10' after 'Period 9'; a period with no
  number in it sorts last, by name). **Neither screen holds a rule of its own** — add a filter here,
  not in a screen.
- **`lib/attendance-stats.ts`** is every number on the dashboard: `dayText` (a mark's own
  '2025-04-21'), `lastDays`, `theDaysBefore`, `tallyFor`, `weeklyTrend` and `monthOnMonth`. Nothing
  is stored: a rate is worked out from the daily marks each time it is read, which is an approved
  decision. **The requirement that marks attendance should write records and nothing else** — every
  summary in the app already follows from them.
- `components/places-row.tsx` is the row along the bottom, **now shared by Home and Classes**. Home
  and Classes are buttons in it; Attendance, Messages and More are still drawn with nothing behind
  them and deliberately no role. `HomeScreen` gained `onOpenClasses`.
- `app/index.tsx` holds where a teacher is standing (`place`) and which class they have opened, and
  **reads the classroom data once, as they sign in** (`theirTeaching()`, which never throws), handing
  it down. **Still no new route**: requirement 1's `No other screen appears before the login screen.`
  is still true and still has not had to be widened. The requirement that *creates* a classroom will
  need the data read again after it writes — give `ClassesScreen` a `reload` and call it there.

Decisions taken, so they are not re-decided:

- **`Classroom` gained one optional field, `archived`.** Optional on purpose, the way requirement 4
  added a teacher's name: a classroom made before it existed — in a backup file — still reads as one
  being taught. `classroomDataIfWhole` accepts it only as a boolean.
- **`lib/theme.ts` gained `markColours`** (#22C55E, #EF4444, #F59E0B — the prototype's own three).
  The agreed palette names one colour for text, one for what does something and one for what is
  behind it; present, absent and late have to be told apart at a glance, and one accent cannot do
  it. **Use these three wherever a mark is coloured**, and nowhere else.
- **The donut is a ring, and the trend bars lie on their side.** React Native draws no conic
  gradient without a drawing package, and a bar chart pinned to a height cannot grow with the
  phone's largest text: the ring is a thick round border sized by the number written inside it, and
  each week of the trend is a row — label, bar, percentage — that grows taller rather than clipping.
  Nothing on either screen is pinned to a `line-height` or a `max-height`, and the checks hold that.
- **`tally.present` / `tally.absent` / `tally.late` are the legend's words, not a mark's.** They are
  plural nouns in the languages that want them ('Présences', 出勤). The requirement that marks a
  student Present, Absent or Late should write its own `mark.*` keys for the buttons.
- The dashboard's `⋯`, the list's `+`, and the Students and Trends tabs are drawn because the
  prototype draws them and are **not announced as buttons**: each is its own requirement.
- `classes.meta` (`{period} · {students}`) and `class.rate` (`{rate}%`) are in `wordsAllowedToStay`:
  a count written as a count is the same count in every language.
- `test/fonts/*.woff2` were gathered again for the characters the new catalogues brought
  (`node test/fonts/gather-fonts.mjs`). Run it whenever a catalogue gains a character.

Half-true, and waiting for the next requirement:

- **Nothing on the phone creates a classroom yet** (requirement 5, 7, 8 and 9's note stands), and
  `classroomStore()` is still in memory, so on a real phone the Classes list is empty and says so.
  Everything on both screens is real and proved against data a check hands over; what is missing is
  the screen that makes a class and a store that outlasts the app. `lib/accounts-file.ts` and
  `lib/onboarding.ts` both show how a thing is kept on a phone.
- **Home still says "No classes yet" even when the phone has classes.** Home's own card is the
  classroom requirement's to fill (requirement 4's note), and filling it from this requirement would
  have been building that one. It now has `lib/classes.ts` to fill it from.
- **The dashboard's Students and Trends tabs go nowhere**, and the `+` on My Classes makes nothing.
  Both are their own requirements; the screens have the place ready for them.
- The class pills switch between the classes being taught, plus the open one if it was archived. A
  teacher with twenty classes gets a wrapped block of pills rather than a row that scrolls sideways:
  it reads at the largest text size, which a sideways scroll would not.

## 11 — See every student marked Present by default (ec0a04c7)

What is here now:

- **`components/take-attendance-screen.tsx` is today's register**, built to the agreed prototype:
  the way back, *Take Attendance*, the class card (its subject icon on a wash of its own colour, its
  name, `{period} · {day}, {date}`), the four filters with their counts — **All (24)**,
  **Present (24)**, **Absent (0)**, **Late (0)** — the search, a row for each student with their
  initials and their mark, and along the foot *Present: 24 · Absent: 0 · Late: 0* with the
  **Save Attendance** button the prototype draws. It opens with **every student on the roster marked
  Present**, which is this requirement's whole point.
- **`lib/roster.ts` is the reading of one class's register**: `rosterOf` (the class's students, in
  the order a register is read in — by name), `markToStartWith` (`'Present'`), `everyonePresent`,
  `markOf`, `tallyOfRoster`, `countedBy`, `rosterShown` (the filter and the search together),
  `initialsOf`, and `classToMarkIn` — the class a teacher is marking, being the one they opened or
  else the first of their own day. **The screen holds no rule of its own**: add one here.
- **The row along the bottom now has a destination behind Attendance.** `Place` is
  `'home' | 'classes' | 'attendance'`, `HomeScreen` takes `onGo` instead of `onOpenClasses`, and
  `app/index.tsx` remembers where a teacher was standing (`before`) so the way out of a register is
  the way they came into it. Messages and More are still drawn with nothing behind them and
  deliberately no role. **Still no new route**: requirement 1's check has still not had to be widened.
- `lib/week.ts` gained `dayName` (every day of the week, `day.sun`…`day.sat` — two new keys) and
  `dateLabel`, which `lib/attendance-stats.ts` now imports rather than keeping a second copy of.
- `lib/theme.ts` gained **`avatarWashes`**, the prototype's own seven pale washes with the ink for
  each. A register is a column of two dozen faces and one wash down the whole of it reads as a wall;
  each student takes the next wash along by their place in the roster. **Use these for a person's
  initials**, and nowhere else.
- `test/react-native-dom.tsx` now says `accessibilityLabel` on a plain `View` or `Text` as
  `aria-label`, which is react-native-web's own translation. A row of the register is a `role="list"`
  / `role="listitem"` named by the student standing on it — `role` and not `accessibilityRole`,
  because React Native's ARIA `role` prop has `list` and `listitem` and `accessibilityRole` does not.

Decisions taken, so they are not re-decided:

- **Present is where a register starts, and it is not read off a saved mark.** Nothing on the phone
  is consulted for today: `everyonePresent(roster)` is the opening state, full stop. The check
  `Each student's status starts as Present.` holds that by giving the phone a term of marks with
  **nothing for today** and reading the screen. **The requirement that saves attendance has to
  decide, on purpose, what a register re-opened after a save shows** — the saved marks, or Present
  again. Today's answer is Present because today has never been saved.
- **`mark.present` / `mark.absent` / `mark.late` are a register's words for one student**
  ('Présent(e)', 出席), beside `tally.*`, which stay the legend's plural nouns. The marking
  requirement should use `mark.*` for its buttons.
- `roster.counted` (`{name} ({many})`) and `roster.tally` (`{name}: {many}`) are in
  `wordsAllowedToStay`: a count written as a count is the same count in every language.
- **The status pill on a row, the `⋮`, the `▾` on the class card and `Save Attendance` are drawn
  and deliberately not announced as buttons**, like the `+` on My Classes before them. Marking a
  student, choosing another class from the card, and saving the register are each their own
  requirement: **give each of them a role the moment you give it something to do.**
- **The filters and the search do work**, because both are only a reading of the marks already in
  hand and the screen is unreadable without them at 24 names. The empty answers say which emptiness
  they are (`roster.noneTitle` with `roster.noneMarked` / `roster.noneFound`).
- The avatar is initials, never the student's photo. A photo is kept against a student
  (`lib/classroom-data.ts`) and drawing it needs an `Image` the checks' stand-in has not got;
  **that is the photo requirement's to add**, here and on the class's own Students tab.
- **No walk was written for this requirement.** A phone still cannot make a classroom, so a walk
  could only reach the register and read "No classes yet" — it could not show one student, let alone
  twenty-four. The three criteria are proved in `app/students-present-by-default.test.tsx`, which
  was pushed red first.

Half-true, and waiting for the next requirement:

- **`classroomStore()` is still in memory** (requirements 5, 7, 8, 9 and 10's note stands), so on a
  real phone the register says "No classes yet" and offers `roster.noClassWords`. Everything on the
  screen is real and proved against data a check hands over; what is missing is the screen that
  makes a class, the one that adds students to it, and a store that outlasts the app.
  `lib/accounts-file.ts` and `lib/onboarding.ts` both show how a thing is kept on a phone.
- **The marks are held in the screen and nowhere else.** `useState(() => everyonePresent(roster))`
  is seeded once, so a teacher who leaves the register and comes back is back at everybody present,
  and a class switched to from the card would not re-seed. The marking requirement should lift that
  state to where it can be changed and saved, and re-seed it when the class changes.
- **The register is always today's.** There is no way to take a past day's attendance, and the
  class is the one opened or the first of the day — the `▾` on the card is where choosing another
  belongs.

## 12 — Mark exceptions like Absent or Late (8da3f0c0)

What is here now:

- **A student's status on the register is a button now**, and pressing it takes that one student
  round the three marks: Present → Absent → Late → Present. The round is `markOrder` in
  `lib/roster.ts`, with `nextMarkAfter` and `markedAs` (one student's mark changed, nobody else's,
  nothing changed in place) beside it. **The screen still holds no rule of its own** — a fourth
  mark, or another order, is one line in `lib/roster.ts`.
- One new word key, `roster.change` (`'{name} — {mark}. Tap to change.'`), in all five catalogues:
  what the button is called to a screen reader. **It is named by the student standing on it**, which
  is what makes Chloe Kim's and Hannah Kim's two different buttons to a finger and to a check —
  `screen.press(/^Chloe Kim\b/)` is how the checks tap one.
- `components/take-attendance-screen.tsx` now keeps the marks **beside the class they were seeded
  for** (`seededFor`), and re-seeds when that changes. Requirement 11's note said a class switched
  to from the card would not re-seed; it does now, so the `▾` requirement has nothing to fix here.
- **The Late pill draws the prototype's own ⏰** (`markLook.Late.before`). The clock is beside the
  word and never instead of it, and it is not in the accessibility label: the word carries the
  meaning on its own.
- `test/fonts/*.woff2` were gathered again (`node test/fonts/gather-fonts.mjs`) for the characters
  the new catalogue line brought.

Decisions taken, so they are not re-decided:

- **One button that goes round, not three buttons on every row.** A register is marked with a thumb
  in the seconds between the bell and the lesson, and the exceptions are two or three names in
  twenty-four. Three buttons a row would not read at the phone's largest text size, and a wrong tap
  here is undone by tapping on round rather than by finding an undo. **If a later requirement wants
  a sheet of three, `nextMarkAfter` is what it replaces, not the round itself.**
- **Nothing is written to the phone.** The marks are held in the screen, exactly as before — this
  requirement changes them, it does not keep them. The screen's own doc comment says so.

Half-true, and waiting for the next requirement:

- **Saving the register is still its own requirement.** `Save Attendance` is drawn and still
  deliberately not announced as a button, and a teacher who leaves the register and comes back is
  back at everybody present. That requirement has `marks`/`setMarks` in
  `components/take-attendance-screen.tsx` to lift or to read, `AttendanceRecord` in
  `lib/classroom-data.ts` to write, and requirement 11's open question to answer on purpose: **what
  a register re-opened after a save shows — the saved marks, or Present again.**
- **`classroomStore()` is still in memory** (requirements 5, 7, 8, 9, 10 and 11's note stands), so
  on a real phone the register still says "No classes yet". `lib/accounts-file.ts` and
  `lib/onboarding.ts` both show how a thing is kept on a phone.
- **No walk was written**, for requirement 11's reason: a phone still cannot make a classroom, so a
  walk could not reach one student to tap. The three criteria are proved in
  `app/mark-exceptions.test.tsx`, which was pushed red first — all three failing with
  `0 buttons saying /^Chloe Kim\b/ on this screen`, which is the register as requirement 11 left it.

## 13 — Review the attendance summary before saving (7bc7b74b)

What is here now:

- **The summary bar at the foot of the register is a named group of its own** — `role="group"`,
  called `roster.summary` (*Attendance summary*) to a screen reader — holding Present, Absent and
  Late with the count against each, in the prototype's own order. It was already drawn (requirement
  11 put it there); what this requirement added is that **it can be told apart from the filter pills
  above it**, which say counts of their own, and that **each count is one phrase to a screen
  reader** ('Present: 20'), not a number loose on the screen. A check finds the bar by that group
  and nothing else: `[role="group"]` is the summary bar and there is exactly one of it.
- **Each count's number is written in that mark's own colour** (`markColours`), with the words
  around it in the screen's ink, as the agreed prototype draws it. That needed the phrase cut in
  two, so **`lib/i18n.ts` gained `sayAround(key, around, filling)`**: a key's words cut around one
  of its fillings — `{ before, piece, after }` — made in *this language's own* phrase, so a language
  that writes the number first is cut where its own number falls. `say` and it share one `fillIn`.
  Use it wherever one filling has to be drawn differently from the words round it; the whole phrase
  still goes on the element as its `accessibilityLabel`, which is what keeps it one phrase to ears
  and keeps `screen.readable()` honest.
- **`lib/roster.ts` gained `summaryMarks` and `summaryOfRoster`** — `{ counts, total, addsUp }`.
  `summaryMarks` is the three the bar writes; a check holds **every mark in `markOrder`** to having
  a column in it, so a fourth mark cannot be added later and go uncounted, and `addsUp` says out
  loud that the counts come to the class rather than leaving it assumed. The screen reads the bar
  off `summaryOfRoster` and holds no rule of its own. Nothing is stored — a summary is worked out
  from the marks in hand each time it is read, which is the approved decision and is also why the
  bar follows a tap in the same breath.
- **`test/react-native-dom.tsx`: a `Text` inside another `Text` is now drawn inline**, which is
  react-native-web's own translation (a `createContext` says whether words are already inside
  words). Without it the browser put 'Present:' and the 20 on two lines and the picture showed a
  screen nobody holding the phone would see. **This screen is the only one that nests `Text`**, so
  nothing else moved.

Decisions taken, so they are not re-decided:

- **The bar adds up the whole class, never the part of it on the screen.** A filter or a search
  changes which rows are drawn and nothing else; the checks hold that (asked for the 2 absent, the
  bar still says 20 / 2 / 2). A summary that followed the filter would be a different number every
  time a teacher looked something up, which is the opposite of a check before saving.
- **No total is written on the bar.** The prototype draws three numbers and the filter row above
  already says `All (24)`; criterion 3 is about the three *adding up* to the class, and that is
  proved rather than printed.
- `roster.summary` is new in all five catalogues, and `test/fonts/*.woff2` were gathered again
  (`node test/fonts/gather-fonts.mjs`) for the characters it brought.

Half-true, and waiting for the next requirement:

- **Saving is still its own requirement**, and this one deliberately did not start it: `Save
  Attendance` is drawn, sits under the summary bar in the same unscrolling foot, and is **still not
  announced as a button**. Give it a role the moment it does something. The open question from
  requirement 11 is still open and still has to be answered on purpose: **what a register re-opened
  after a save shows — the saved marks, or Present again.**
- **`classroomStore()` is still in memory** (requirements 5, 7, 8, 9, 10, 11 and 12's note stands),
  so on a real phone the register says "No classes yet" and the summary bar reads 0 / 0 / 0 under
  it. Everything proved here is proved against data a check hands over.
- **No walk was written**, for requirement 11 and 12's reason: a phone cannot yet make a classroom,
  so a walk could not reach a register with a student on it. The three criteria are proved in
  `app/review-attendance-summary.test.tsx`, pushed red first — all three failing with
  `0 summary bars on this screen, wanted exactly one`.

## 14 — Save the day's attendance and see confirmation (1da3283e)

What is here now:

- **`Save Attendance` is a button, and it keeps the day.** One press turns the marks under the
  teacher's thumb into one `AttendanceRecord` for **every student on the roster** — including the
  ones nobody touched, because a day with twenty-two marks in a class of twenty-four is two students
  nobody can say anything about afterwards — writes them to `classroomStore()`, and puts the
  confirmation in front of the register. It is disabled while the write is happening (one press is
  one save) and on a class with nobody in it.
- **`lib/attendance-save.ts` is the whole of the keeping.** `recordsForRegister` makes the day's
  records; `dataWithRegister` puts them **in place of** whatever was kept for that class on that day,
  so a day saved twice is one day's register and every other day and class are untouched;
  `savedRegisterFor` reads a saved day back as marks; `keepRegister` does the read-change-write and
  **never throws** — it answers `null`, and the register stays open saying `roster.couldNotSave`.
  `dayOfRegister`/`dayFromText` are a day and its way back. The screen holds no rule of its own.
- **`components/attendance-saved-screen.tsx` is *Attendance Saved!***, built to the agreed
  prototype: the way back to the register, *Attendance*, the `⋮`, and the card — the green tick,
  the words, `{class} — {period}`, the day in words, who saved it, and the three tiles (Present,
  Absent, Late) in `markColours` on a wash of themselves — then **View Class Report** into that
  class's own dashboard, **Back to Home**, and the prototype's own note about editing today again.
- **`AttendanceRecord` gained one optional field, `savedBy`** — the teacher's own name, from
  `nameOf(teacher)`, which is the approved decision that who saved a day is kept with it. Optional
  the way requirement 4 added a teacher's name and requirement 10 added `archived`: every mark made
  before it existed — in a backup file — still reads as a mark, and `classroomDataIfWhole` accepts
  it only as a string. **Add a field the same way.**
- `app/index.tsx` hands the register the teacher and three ways on, and takes back what the phone
  keeps the moment it is written (`onSaved={setTeaching}`), so the class report and the Classes list
  show the day that has just been saved without reading the phone again. **Still no new route**:
  requirement 1's `No other screen appears before the login screen.` is still true.
- Eleven new word keys in all five catalogues (`roster.saving`, `roster.couldNotSave`, `saved.*`),
  and `test/fonts/*.woff2` were gathered again (`node test/fonts/gather-fonts.mjs`).

Decisions taken, so they are not re-decided:

- **A register re-opened on a day already saved opens at what was saved**, not at everybody present.
  That is requirement 11 and 13's open question, answered on purpose: the day is on the phone, the
  confirmation says it can be edited again, and opening it all-present would be the app quietly
  marking a class it was told nothing new about. `openAt()` in the screen is
  `{...everyonePresent(roster), ...savedRegisterFor(...)}`, so a student added since is Present and
  everybody else is where they were left. Requirement 11's `Each student's status starts as Present.`
  still reads word for word: its phone has a term of marks and **nothing for today**.
- **The confirmation is a screen the register shows, not a route and not app/index's.** The marks
  are the register's, and so is the save; `TakeAttendanceScreen` returns `<AttendanceSavedScreen/>`
  in its own place, which is why the way back at its top left is the same marks again.
- **Nothing ever says 'Attendance Saved!' over nothing saved.** A phone that will not be written to
  leaves the register open with `roster.couldNotSave` in an `accessibilityRole="alert"`, and nothing
  is logged on the way past. That is the one lie this screen must not tell.
- **The confirmation says who saved it** (`saved.by`), which the mockup does not draw. The approved
  decision keeps the teacher's name on every record, and a criterion about what the record holds
  reads better with the name on the screen than only in the store. A record that keeps no name of
  its own is not named — `recordsForRegister` leaves `savedBy` out rather than inventing one.
- **The tiles read `tally.*`** (the legend's plural nouns), not `mark.*`, and are labelled with
  `roster.tally` so a screen reader hears 'Present: 20' as one phrase. The tick is drawn out of
  padding and a round corner, never a pinned height, so the phone's largest text grows it.
- **No walk was written**, for requirements 11, 12 and 13's reason: a phone still cannot make a
  classroom, so a walk could not reach a register with a student on it to save. The three criteria
  are proved in `app/save-attendance.test.tsx`, pushed red first — all three failing with
  `Cannot find module '../lib/attendance-save'`.

Half-true, and waiting for the next requirement:

- **`classroomStore()` is still in memory** (requirements 5, 7, 8, 9, 10, 11, 12 and 13's note
  stands), so on a real phone a register saved this morning is forgotten when the app closes — and
  the register still says "No classes yet" because nothing can make a classroom. **This is now the
  most expensive of the half-truths on this branch**: everything above it is real and proved, and
  all of it is written to a store that does not outlast the app. `lib/accounts-file.ts` and
  `lib/onboarding.ts` both show how a thing is kept on a phone; the line to replace is
  `let store = ...` in `lib/classroom-data.ts`.
- **The register is always today's**, and the `▾` on the class card still chooses nothing. A day
  taken late — yesterday's register, on a morning after — has nowhere to be entered.
- **Nothing edits a saved day from the Class Report**, which the confirmation's own last line
  promises. The way back into today is the register itself, which now opens at what was saved; the
  report's Students and Trends tabs are still their own requirements.

## 15 — Check a student's attendance history (6f34165c)

What is here now:

- **A student's name on the register opens their own profile.** Their initials and their name
  together are one `Pressable`, announced as a **link** (`accessibilityRole="link"`,
  `student.open` — *Open Chloe Kim's profile*) and deliberately not as a button: the status beside
  it on the same row is a button and changes a mark, and a register marked with a thumb must never
  have two things on one row that look alike and do different things. **It is also why requirement
  12's `[role="listitem"] [role="button"]` is still exactly 24** — if you make a name a button,
  that check goes red and it is right to. `test/screen.tsx` presses a link now as well as a button
  and a radio row.
- **`components/student-profile-screen.tsx` is Student Profile**, built to the agreed prototype:
  the way back to the register, the name of the screen, the `⋮`, the student's card (initials, name,
  `{class} · {period}`), the Overview / Attendance / Notes tabs, the three tiles — **Attendance
  Rate**, **Absences**, **Late** — *Recent Attendance* with the five most recent days and
  **View All**, and then the one thing each tab has of its own: the Teacher Note card on Overview,
  and the month added up (*April Summary*: Days Tracked, Present, Absent, Late) on Attendance.
- **`components/student-history-screen.tsx` is Full Attendance Record**, which is what View All
  opens: the student's card with their rate on it, the three counts of the whole record, and every
  day the phone has a mark against their name, newest first, under the month each falls in — with
  the places row along the foot, Attendance lit, as the prototype draws it on that screen.
- **`lib/student-history.ts` is the whole of the reading**: `studentWithId`, `historyOf` (the days
  against one student's name, newest first), `tallyOfHistory`, `recentDays`/`recentlyShown`,
  `historyByMonth` and `latestMonth`. **Neither screen holds a rule of its own** — a sixth recent
  day, or another order, is one line here. Nothing is stored: every rate, count and month summary is
  worked out from the daily records each time it is read, which is the approved decision.
- `components/student-look.ts` is what the two screens share: `dayLook` (each mark's word, colour
  and sign — ✓ ✕ ⏰), `dateInWords` ('Apr 21, 2025'), `dayInWords` ('Apr 21, 2025 — Absent'),
  `monthInWords` ('April 2025') and `washFor` (a student's own wash, by their place in their class's
  register, so the same face is the same colour on every screen).
- Twenty-four new `student.*` keys and **`monthFull.1`…`monthFull.12`** (a month written out, which
  the record's headings and *April Summary* need) in all five catalogues; `student.in` and
  `student.monthOf` are in `wordsAllowedToStay` — both are nothing but braces, and French writes a
  month beside its year exactly as English does. `test/fonts/*.woff2` were gathered again.

Decisions taken, so they are not re-decided:

- **'View All' opens the whole record from either tab.** The prototype's Overview sends it to the
  Attendance tab and only that tab's own View All to the full list; the criterion says View All
  shows the complete attendance history, and a requirement's own lines win over the mockup. Both
  tabs are one tap from the record and the Attendance tab is still one tap from its own tab.
- **The profile is a screen the register shows, not a route** — the same decision the confirmation
  took in requirement 14. `TakeAttendanceScreen` returns it in its own place, so the register stays
  mounted with the teacher's marks standing behind it: looking a student up never costs a register.
  `app/index.tsx` gained nothing but `onGo={goTo}` on the register, which is what the places row at
  the foot of the full record goes through. **Still no new route**: requirement 1's check holds.
- **The Teacher Note card says there is no note.** Nothing on the phone keeps a note against a
  student, so Notes is drawn without a role (like the `⋮` and the `+` before it) and the card says
  `student.noNote` rather than showing prose about a student that nobody wrote. **The notes
  requirement has the card and the tab waiting for it.**
- **The line under a student's name is their class and period**, where the prototype writes *Grade
  10 · Student ID #1042*. A `Student` is a name and a photo (`lib/classroom-data.ts`) and nothing
  else; a grade and a school id would have had to be invented. **A requirement that adds either
  should put it here.**
- **A rate is present ÷ every mark, rounded** (`rateOf`, shared with the class dashboard), so a
  student late all term is not counted present. A student with nothing marked is 0% of nothing, and
  the screen says `student.none` rather than drawing an empty month.

Half-true, and waiting for the next requirement:

- **`classroomStore()` is still in memory** (requirements 5, 7, 8, 9, 10, 11, 12, 13 and 14's note
  stands): on a real phone a register saved this morning is forgotten when the app closes, and a
  profile opened tomorrow has nothing in it. This is still the most expensive half-truth on the
  branch. The line to replace is `let store = ...` in `lib/classroom-data.ts`.
- **A name is only pressable on the register.** The class report's Students tab is still its own
  requirement and still goes nowhere; when it arrives, it should open the same
  `StudentProfileScreen` rather than a second profile — and it will need a way in that is not the
  register, so the profile's `onBack` and its places row are worth making the caller's business.
- **The photo is still initials.** A photo is kept against a student and drawing it needs an
  `Image` the checks' stand-in has not got; that is the photo requirement's to add, here, on the
  register, and at the top of the full record.
- **No walk was written**, for requirements 11 to 14's reason: a phone still cannot make a classroom
  or add a student, so a walk could not reach a name to press. The four criteria are proved in
  `app/student-attendance-history.test.tsx`, pushed red first — all four failing with
  `Cannot find module '../lib/student-history'`.
