import { Pressable, ScrollView, Text, View } from 'react-native';
import { rememberAppearance, theOtherLook } from '../lib/appearance';
import { initialsOf, nameOf } from '../lib/greeting';
import { useDirection, useWords } from '../lib/i18n';
import type { TeacherProfile } from '../lib/local-accounts';
import { productName } from '../lib/product';
import { appearanceNow, colors, radius, shadow, space, useAppearance } from '../lib/theme';

/** A little round badge with something in it, as the prototype draws beside each row. */
function Mark({ children, tint }: { children: string; tint: string }) {
  return (
    <View style={{ backgroundColor: tint, borderRadius: radius.field, paddingHorizontal: 9, paddingVertical: 7 }}>
      <Text style={{ fontSize: 17 }}>{children}</Text>
    </View>
  );
}

/** The inside of one row of the menu: its mark, its words, and the arrow where it leads somewhere. */
function RowInside({ mark, says, onward }: { mark: string; says: string; onward: boolean }) {
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, padding: space.step }}>
      <Mark tint={colors.accentWash}>{mark}</Mark>
      <Text style={{ flex: 1, fontSize: 15, fontWeight: '600', color: colors.text }}>{says}</Text>
      {onward ? <Text style={{ fontSize: 14, color: colors.chevron }}>›</Text> : null}
    </View>
  );
}

/**
 * One option of the menu, named to a screen reader by the words on it — so the menu can be read as
 * the list of options it is, whether or not an option leads anywhere yet.
 *
 * An option with a screen behind it is a button inside its row, as a row of the register is. An
 * option with nothing behind it is drawn and deliberately not announced as a button: a control that
 * answers nothing should not say that it does. Give one a role the moment you give it a destination.
 */
function Option({ mark, says, go, last = false }: { mark: string; says: string; go?: () => void; last?: boolean }) {
  const inside = <RowInside mark={mark} says={says} onward={go !== undefined} />;
  return (
    <View
      role="listitem"
      accessibilityLabel={says}
      style={last ? {} : { borderBottomWidth: 1, borderBottomColor: colors.hairline }}
    >
      {go ? (
        <Pressable accessibilityRole="button" accessibilityLabel={says} onPress={go}>
          {inside}
        </Pressable>
      ) : (
        inside
      )}
    </View>
  );
}

/**
 * The Dark Mode switch, which is the one row of this menu that changes the app rather than opening
 * another screen. It is announced as the switch it is, so a screen reader says which way it is set,
 * and pressing it puts the whole app into the other look at once — and keeps the choice on this
 * phone, so tomorrow morning opens the way tonight was left (lib/appearance.ts).
 */
function DarkModeRow({ label, hint, on, flip }: { label: string; hint: string; on: boolean; flip: () => void }) {
  return (
    <Pressable
      accessibilityRole="switch"
      accessibilityLabel={label}
      accessibilityState={{ checked: on }}
      onPress={flip}
      style={{ flexDirection: 'row', alignItems: 'center', gap: 12, padding: space.step }}
    >
      <Mark tint={colors.accentWash}>🌙</Mark>
      <View style={{ flex: 1 }}>
        <Text style={{ fontSize: 15, fontWeight: '600', color: colors.text }}>{label}</Text>
        <Text style={{ fontSize: 12, color: colors.muted }}>{hint}</Text>
      </View>
      {/* The switch itself: drawn out of padding and a corner, never a fixed size, so the phone's
          largest text grows it with the words beside it. */}
      <View
        style={{
          flexDirection: 'row',
          justifyContent: on ? 'flex-end' : 'flex-start',
          backgroundColor: on ? colors.accent : colors.switchOff,
          borderRadius: 20,
          padding: 3,
          paddingHorizontal: 4,
        }}
      >
        <View style={{ backgroundColor: colors.card, borderRadius: 20, paddingHorizontal: 10, paddingVertical: 10, ...shadow.soft }} />
      </View>
    </Pressable>
  );
}

/** A card the menu's rows sit in, as the prototype draws them: white, rounded, gently lifted. */
const menuCard = () => ({
  backgroundColor: colors.card,
  borderRadius: radius.card,
  marginHorizontal: space.gap,
  marginBottom: space.gap,
  ...shadow.card,
});

/**
 * The teacher's own profile menu: what their avatar on Home opens, and where they manage their
 * account and sign out when they are done for the day.
 *
 * At the top is the card that says whose phone this is — the name and the school kept inside their
 * own locked record, read out of it when they signed in and nowhere else. Under it the menu the
 * agreed prototype draws, then Help & Support and the Dark Mode switch, and at the foot the way out
 * of the app.
 *
 * Nothing on this screen asks anything of a network, and nothing of what it shows leaves the phone.
 */
export function ProfileScreen({
  teacher,
  onBack,
  onOpenSettings,
  onOpenReports,
  onLogOut,
}: {
  teacher: TeacherProfile;
  onBack: () => void;
  onOpenSettings: () => void;
  onOpenReports: () => void;
  onLogOut: () => void;
}) {
  const t = useWords();
  const dir = useDirection();
  // Redrawn the moment a teacher flips Dark Mode in their own profile menu: the colours below are
  // whichever of the two looks the app is wearing. See lib/theme.ts.
  useAppearance();
  const dark = appearanceNow() === 'dark';

  return (
    <ScrollView
      style={{ flex: 1, direction: dir, backgroundColor: colors.background }}
      contentContainerStyle={{ paddingTop: 20, paddingBottom: space.gap }}
    >
      {/* The screen, and the way back to where the teacher came from. */}
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 12,
          paddingHorizontal: space.gap,
          paddingBottom: space.step,
        }}
      >
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={t('settings.back')}
          onPress={onBack}
          style={{ backgroundColor: colors.card, borderRadius: radius.field, paddingHorizontal: 10, paddingVertical: 7, ...shadow.soft }}
        >
          <Text style={{ fontSize: 17, color: colors.accent }}>{dir === 'rtl' ? '→' : '←'}</Text>
        </Pressable>
        <Text accessibilityRole="header" style={{ fontSize: 16, fontWeight: '700', color: colors.text }}>
          {t('profile.title')}
        </Text>
        {/* The prototype keeps the name of the screen in the middle, with nothing on the other side. */}
        <View style={{ paddingHorizontal: 10 }} />
      </View>

      {/* Whose phone this is: the name and the school their own record keeps, and nothing the app
          made up for them — a record kept without a school says so rather than showing one. */}
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          gap: 14,
          backgroundColor: colors.card,
          borderRadius: radius.card,
          padding: space.step,
          marginHorizontal: space.gap,
          marginBottom: space.gap,
          ...shadow.card,
        }}
      >
        <View style={{ backgroundColor: colors.accentSoft, borderRadius: 30, paddingHorizontal: 13, paddingVertical: 14 }}>
          <Text style={{ fontSize: 17, fontWeight: '700', color: colors.accent }}>{initialsOf(teacher)}</Text>
        </View>
        <View style={{ flex: 1 }}>
          <Text style={{ fontSize: 17, fontWeight: '700', color: colors.text }}>{nameOf(teacher)}</Text>
          <Text style={{ fontSize: 13, color: colors.muted, marginTop: 2 }}>
            {teacher.school ? t('profile.at', { school: teacher.school }) : t('profile.noSchool')}
          </Text>
        </View>
        {/* The prototype's own pencil. Changing what is inside a locked record takes the password
            that locks it, which is its own requirement: drawn, and deliberately not a button. */}
        <View style={{ backgroundColor: colors.background, borderRadius: radius.pill, paddingHorizontal: 8, paddingVertical: 6 }}>
          <Text style={{ fontSize: 14, color: colors.accent }}>✎</Text>
        </View>
      </View>

      {/* The menu itself, read as the list of options it is. */}
      <View role="list" accessibilityLabel={t('profile.menu')} style={menuCard()}>
        <Option mark="👤" says={t('profile.title')} />
        <Option mark="⚙️" says={t('settings.title')} go={onOpenSettings} />
        <Option mark="🎓" says={t('class.students')} />
        <Option mark="📋" says={t('profile.reports')} go={onOpenReports} />
        <Option mark="🔔" says={t('settings.notifications')} last />
      </View>

      <View style={menuCard()}>
        <Option mark="❓" says={t('settings.help')} />
        <View style={{ borderTopWidth: 1, borderTopColor: colors.hairline }}>
          <DarkModeRow
            label={t('settings.darkMode')}
            hint={t('settings.darkModeHint')}
            on={dark}
            flip={() => {
              // The app is in the other look before this press is over; keeping the choice on the
              // phone happens behind it and cannot fail in front of a teacher.
              void rememberAppearance(theOtherLook());
            }}
          />
        </View>
      </View>

      <View style={{ marginHorizontal: space.gap }}>
        {/* Signing out, where the prototype puts it: the foot of this screen. */}
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={t('settings.logout')}
          onPress={onLogOut}
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 8,
            backgroundColor: colors.card,
            borderWidth: 1,
            borderColor: colors.alarmEdge,
            borderRadius: radius.card,
            padding: space.step,
            ...shadow.soft,
          }}
        >
          <Text style={{ fontSize: 16, color: colors.alarm }}>↪</Text>
          <Text style={{ fontSize: 15, fontWeight: '700', color: colors.alarm }}>{t('settings.logout')}</Text>
        </Pressable>

        {/* Which way the switch above is set, said in words as well as drawn, where there is room
            to read it. */}
        <Text style={{ textAlign: 'center', fontSize: 11, color: colors.faintest, marginTop: 18 }}>
          {t(dark ? 'profile.darkModeOn' : 'profile.darkModeOff')}
        </Text>
        <Text style={{ textAlign: 'center', fontSize: 11, color: colors.faintest, marginTop: 4 }}>
          {t('settings.foot', { product: productName() })}
        </Text>
      </View>
    </ScrollView>
  );
}
