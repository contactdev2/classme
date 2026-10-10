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
