import { Pressable, ScrollView, Text, View } from 'react-native';
import { productName } from '../lib/product';
import type { TeacherProfile } from '../lib/local-accounts';
import { colors, radius, shadow, space } from '../lib/theme';

/**
 * What a teacher sees once their record on this phone has opened: the app, as them. The classrooms,
 * the attendance and the week ahead are each their own requirement; what is here is the greeting
 * that proves they are through, and the way back out.
 */
export function SignedInHome({ teacher, onLogOut }: { teacher: TeacherProfile; onLogOut: () => void }) {
  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: colors.background }}
      contentContainerStyle={{ alignItems: 'center', paddingTop: 56, paddingBottom: space.gap, paddingHorizontal: space.gap }}
    >
      <View style={{ alignItems: 'center', marginBottom: 18 }}>
        <View
          style={{
            backgroundColor: colors.accent,
            borderRadius: radius.card,
            paddingHorizontal: 15,
            paddingVertical: 13,
            marginBottom: 12,
            ...shadow.accent,
          }}
        >
          <Text style={{ fontSize: 30 }}>🎓</Text>
        </View>
        <Text accessibilityRole="header" style={{ fontSize: 24, fontWeight: '800', color: colors.text, letterSpacing: 0.3 }}>
          {productName()}
        </Text>
        <Text style={{ fontSize: 12, color: '#7C8A9E', letterSpacing: 1, marginTop: 2 }}>TEACH · TRACK · INSPIRE</Text>
      </View>

      {/* Who is signed in, said plainly, so a teacher can see at a glance it is their own phone. */}
      <View
        style={{
          alignSelf: 'stretch',
          backgroundColor: colors.card,
          borderRadius: radius.card,
          paddingHorizontal: 20,
          paddingVertical: space.gap,
          ...shadow.card,
        }}
      >
        <Text style={{ fontSize: 20, fontWeight: '700', color: colors.text, textAlign: 'center' }}>You are signed in</Text>
        <Text style={{ marginTop: space.tight, fontSize: 15, fontWeight: '600', color: colors.accent, textAlign: 'center' }}>
          {teacher.email}
        </Text>
        <Text style={{ marginTop: space.snug, fontSize: 14, color: colors.muted, textAlign: 'center' }}>
          Your classrooms, your students and every attendance record you take stay on this phone.
        </Text>

        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, marginTop: space.step }}>
          <Text style={{ fontSize: 13 }}>🔐</Text>
          <Text style={{ fontSize: 12, color: colors.faint, textAlign: 'center' }}>Opened from your encrypted local database</Text>
        </View>
      </View>

      {/* The way back out, so signing in is never a door that only opens one way. */}
      <Pressable
        accessibilityRole="button"
        onPress={onLogOut}
        style={{
          alignSelf: 'stretch',
          alignItems: 'center',
          marginTop: space.gap,
          backgroundColor: colors.card,
          borderWidth: 1,
          borderColor: colors.line,
          borderRadius: radius.field,
          paddingVertical: 15,
        }}
      >
        <Text style={{ color: colors.accent, fontSize: 16, fontWeight: '700' }}>Log Out</Text>
      </Pressable>

      <Text style={{ marginTop: space.room, fontSize: 13, color: '#9AA7B8', textAlign: 'center' }}>{productName()} v1.0</Text>
    </ScrollView>
  );
}
