import type { Session } from '@supabase/supabase-js';
import { BookOpen, LogOut, ShieldCheck } from 'lucide-react-native';
import { useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { signOut } from './authService';

export function AuthenticatedShell({ session }: { session: Session }) {
  const [isSigningOut, setIsSigningOut] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSignOut = async () => {
    setError(null);
    setIsSigningOut(true);

    try {
      await signOut();
    } catch (caughtError) {
      setError(caughtError instanceof Error ? caughtError.message : 'Unable to sign out.');
      setIsSigningOut(false);
    }
  };

  return (
    <SafeAreaView style={styles.screen}>
      <View style={styles.header}>
        <View style={styles.logoMark}>
          <BookOpen color="#FFFFFF" size={22} strokeWidth={2.4} />
        </View>
        <View style={styles.headerCopy}>
          <Text style={styles.logoName}>E-Lern</Text>
          <Text numberOfLines={1} style={styles.email}>{session.user.email ?? 'Authenticated user'}</Text>
        </View>
        <Pressable
          accessibilityLabel="Sign out"
          accessibilityRole="button"
          disabled={isSigningOut}
          onPress={() => void handleSignOut()}
          style={styles.signOutButton}
        >
          {isSigningOut ? <ActivityIndicator color="#315E78" size="small" /> : <LogOut color="#315E78" size={19} />}
          <Text style={styles.signOutText}>Sign out</Text>
        </Pressable>
      </View>

      <View style={styles.content}>
        <View style={styles.badge}>
          <ShieldCheck color="#1E684A" size={18} />
          <Text style={styles.badgeText}>Authenticated session</Text>
        </View>
        <Text style={styles.title}>Your account is securely connected.</Text>
        <Text style={styles.copy}>
          The production session is active. Course access will appear here after catalog and entitlement services are connected.
        </Text>
        {error ? <Text style={styles.error}>{error}</Text> : null}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { backgroundColor: '#F6F8FA', flex: 1 },
  header: {
    alignItems: 'center',
    borderBottomColor: '#DCE2E7',
    borderBottomWidth: 1,
    flexDirection: 'row',
    gap: 12,
    paddingHorizontal: 22,
    paddingVertical: 16,
  },
  logoMark: {
    alignItems: 'center',
    backgroundColor: '#315E78',
    borderRadius: 8,
    height: 42,
    justifyContent: 'center',
    width: 42,
  },
  headerCopy: { flex: 1 },
  logoName: { color: '#1F2A33', fontSize: 19, fontWeight: '800' },
  email: { color: '#637281', fontSize: 12, marginTop: 2 },
  signOutButton: { alignItems: 'center', flexDirection: 'row', gap: 7, padding: 8 },
  signOutText: { color: '#315E78', fontSize: 14, fontWeight: '800' },
  content: { alignSelf: 'center', flex: 1, justifyContent: 'center', maxWidth: 560, padding: 28, width: '100%' },
  badge: {
    alignItems: 'center',
    alignSelf: 'flex-start',
    backgroundColor: '#E4F1EA',
    borderRadius: 8,
    flexDirection: 'row',
    gap: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  badgeText: { color: '#1E684A', fontSize: 13, fontWeight: '800' },
  title: { color: '#1F2A33', fontSize: 32, fontWeight: '800', lineHeight: 40, marginTop: 22 },
  copy: { color: '#53616E', fontSize: 16, lineHeight: 25, marginTop: 14 },
  error: { color: '#A12B2B', fontSize: 13, marginTop: 18 },
});
