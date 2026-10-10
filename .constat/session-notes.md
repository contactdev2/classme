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
