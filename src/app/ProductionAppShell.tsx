import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';
import { AuthenticatedShell } from '../features/auth/AuthenticatedShell';
import { AuthProvider, useAuth } from '../features/auth/AuthProvider';
import { SignInScreen } from '../features/auth/SignInScreen';
import { supabaseConfigurationError } from '../../utils/supabase';

export function ProductionAppShell() {
  if (supabaseConfigurationError) {
    return (
      <View style={styles.centered}>
        <Text accessibilityRole="alert" style={styles.errorTitle}>Production configuration required</Text>
        <Text style={styles.errorCopy}>{supabaseConfigurationError}</Text>
      </View>
    );
  }

  return (
    <AuthProvider>
      <AuthGate />
    </AuthProvider>
  );
}

function AuthGate() {
  const { initializationError, isInitializing, session } = useAuth();

  if (isInitializing) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator color="#315E78" size="large" />
        <Text style={styles.statusText}>Restoring your secure session…</Text>
      </View>
    );
  }

  if (initializationError) {
    return (
      <View style={styles.centered}>
        <Text accessibilityRole="alert" style={styles.errorTitle}>Unable to start E-Lern</Text>
        <Text style={styles.errorCopy}>{initializationError}</Text>
      </View>
    );
  }

  if (!session) return <SignInScreen />;

  return <AuthenticatedShell session={session} />;
}

const styles = StyleSheet.create({
  centered: {
    alignItems: 'center',
    backgroundColor: '#F6F8FA',
    flex: 1,
    justifyContent: 'center',
    padding: 28,
  },
  statusText: { color: '#53616E', fontSize: 15, marginTop: 14 },
  errorTitle: { color: '#1F2A33', fontSize: 22, fontWeight: '800', textAlign: 'center' },
  errorCopy: { color: '#A12B2B', fontSize: 14, lineHeight: 21, marginTop: 10, maxWidth: 460, textAlign: 'center' },
});
