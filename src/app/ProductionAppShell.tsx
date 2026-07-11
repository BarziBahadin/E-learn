import { BookOpen, LockKeyhole, ShieldCheck } from 'lucide-react-native';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

export function ProductionAppShell() {
  return (
    <SafeAreaView style={styles.screen}>
      <View style={styles.header}>
        <View style={styles.logoMark}>
          <BookOpen color="#FFFFFF" size={22} strokeWidth={2.4} />
        </View>
        <View>
          <Text style={styles.logoName}>E-Lern</Text>
          <Text style={styles.logoTag}>Production app shell</Text>
        </View>
      </View>

      <View style={styles.content}>
        <View style={styles.badge}>
          <ShieldCheck color="#1E684A" size={18} />
          <Text style={styles.badgeText}>Demo flows disabled</Text>
        </View>

        <Text style={styles.title}>Production access is server-backed only.</Text>
        <Text style={styles.copy}>
          This build does not expose prototype role selection, demo OTPs, or simulated payments. Connect
          the Supabase Auth, entitlement, and payment flows before enabling customer sign-in.
        </Text>

        <Pressable accessibilityRole="button" disabled style={styles.disabledButton}>
          <LockKeyhole color="#6C7782" size={18} />
          <Text style={styles.disabledButtonText}>Sign in unavailable</Text>
        </Pressable>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: {
    backgroundColor: '#F6F8FA',
    flex: 1,
  },
  header: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 12,
    paddingHorizontal: 22,
    paddingVertical: 18,
  },
  logoMark: {
    alignItems: 'center',
    backgroundColor: '#315E78',
    borderRadius: 8,
    height: 42,
    justifyContent: 'center',
    width: 42,
  },
  logoName: {
    color: '#1F2A33',
    fontSize: 21,
    fontWeight: '800',
  },
  logoTag: {
    color: '#637281',
    fontSize: 13,
    fontWeight: '600',
    marginTop: 2,
  },
  content: {
    alignSelf: 'center',
    flex: 1,
    justifyContent: 'center',
    maxWidth: 560,
    padding: 28,
    width: '100%',
  },
  badge: {
    alignItems: 'center',
    alignSelf: 'flex-start',
    backgroundColor: '#E4F1EA',
    borderColor: '#B9D8C8',
    borderRadius: 8,
    borderWidth: 1,
    flexDirection: 'row',
    gap: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  badgeText: {
    color: '#1E684A',
    fontSize: 13,
    fontWeight: '800',
  },
  title: {
    color: '#1F2A33',
    fontSize: 34,
    fontWeight: '800',
    lineHeight: 42,
    marginTop: 22,
  },
  copy: {
    color: '#53616E',
    fontSize: 16,
    fontWeight: '500',
    lineHeight: 25,
    marginTop: 14,
  },
  disabledButton: {
    alignItems: 'center',
    alignSelf: 'flex-start',
    backgroundColor: '#E1E6EA',
    borderColor: '#CAD2D9',
    borderRadius: 8,
    borderWidth: 1,
    flexDirection: 'row',
    gap: 8,
    marginTop: 28,
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  disabledButtonText: {
    color: '#6C7782',
    fontSize: 15,
    fontWeight: '800',
  },
});
