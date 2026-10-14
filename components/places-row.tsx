import { Pressable, Text, View } from 'react-native';
import { useWords } from '../lib/i18n';
import { colors, space, useAppearance } from '../lib/theme';

/**
 * The places the app has, along the bottom, as the prototype draws them. Home, Classes and
 * Attendance are screens a teacher can be in, so those three are buttons and announced as buttons.
 * The other two are each their own requirement and — like 'Forgot password?' on the login screen —
 * are drawn because the prototype draws them, with nothing behind them yet and deliberately no role
 * of their own: a control that answers nothing should not say it does. Give one a role when you
 * give it a destination.
 */
const places = [
  { key: 'place.home', mark: '⌂', place: 'home' },
  { key: 'place.classes', mark: '◫', place: 'classes' },
  { key: 'place.attendance', mark: '📅', place: 'attendance' },
  { key: 'place.messages', mark: '💬' },
  { key: 'place.more', mark: '⋯' },
] as const;

/** One of the app's own places: where a teacher is now, or where they can go. */
export type Place = 'home' | 'classes' | 'attendance';

/**
 * The row along the bottom of the screens a teacher lives in. It wraps rather than clips, so the
 * phone's largest text makes this row taller and never cuts a word off it.
 */
export function PlacesRow({ here, onGo }: { here: Place; onGo: (place: Place) => void }) {
  const t = useWords();
  // Redrawn the moment a teacher flips Dark Mode in their own profile menu: the colours below are
  // whichever of the two looks the app is wearing. See lib/theme.ts.
  useAppearance();
  return (
    <View
      style={{
        flexDirection: 'row',
        justifyContent: 'space-around',
        alignItems: 'center',
        flexWrap: 'wrap',
        gap: space.snug,
        paddingHorizontal: space.snug,
        paddingVertical: 12,
        backgroundColor: colors.card,
        borderTopWidth: 1,
        borderTopColor: colors.line,
      }}
    >
      {places.map((place) => {
        const standing = 'place' in place && place.place === here;
        const words = (
          <>
            <Text style={{ fontSize: 18, color: standing ? colors.accent : colors.faint }}>{place.mark}</Text>
            <Text style={{ fontSize: 11, fontWeight: standing ? '600' : '400', color: standing ? colors.accent : colors.faint }}>
              {t(place.key)}
            </Text>
          </>
        );
        const sitting = { alignItems: 'center', gap: 4 } as const;
        return 'place' in place ? (
          // Named by the place itself, and not by the mark drawn over the word: Attendance down
          // here and Take Attendance on a class's card on Home are two different things to a
          // finger, to a screen reader and to a check.
          <Pressable
            key={place.key}
            accessibilityRole="button"
            accessibilityLabel={t(place.key)}
            onPress={() => onGo(place.place)}
            style={sitting}
          >
            {words}
          </Pressable>
        ) : (
          <View key={place.key} style={sitting}>
            {words}
          </View>
        );
      })}
    </View>
  );
}
