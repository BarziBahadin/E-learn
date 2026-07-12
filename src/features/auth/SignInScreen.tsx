import { BookOpen, LogIn, ShieldCheck } from 'lucide-react-native';
import { useState } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { signInWithPassword } from './authService';

export function SignInScreen() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const canSubmit = email.trim().length > 0 && password.length > 0 && !isSubmitting;

  const submit = async () => {
    if (!canSubmit) return;

    setError(null);
    setIsSubmitting(true);

    try {
      await signInWithPassword(email, password);
    } catch (caughtError) {
      setError(caughtError instanceof Error ? caughtError.message : 'Unable to sign in. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <SafeAreaView style={styles.screen}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={styles.keyboardView}
      >
        <View style={styles.card}>
          <View style={styles.brandRow}>
            <View style={styles.logoMark}>
              <BookOpen color="#FFFFFF" size={22} strokeWidth={2.4} />
            </View>
            <View>
              <Text style={styles.logoName}>E-Lern</Text>
              <Text style={styles.logoTag}>Secure learning access</Text>
            </View>
          </View>

          <View style={styles.badge}>
            <ShieldCheck color="#1E684A" size={17} />
            <Text style={styles.badgeText}>Server-backed authentication</Text>
          </View>

          <Text style={styles.title}>Welcome back</Text>
          <Text style={styles.copy}>Sign in with the account provided by your school or administrator.</Text>

          <Text style={styles.label}>Email address</Text>
          <TextInput
            accessibilityLabel="Email address"
            autoCapitalize="none"
            autoComplete="email"
            editable={!isSubmitting}
            keyboardType="email-address"
            onChangeText={setEmail}
            onSubmitEditing={() => undefined}
            placeholder="name@example.com"
            placeholderTextColor="#8A96A0"
            returnKeyType="next"
            style={styles.input}
            textContentType="emailAddress"
            value={email}
          />

          <Text style={styles.label}>Password</Text>
          <TextInput
            accessibilityLabel="Password"
            autoCapitalize="none"
            autoComplete="current-password"
            editable={!isSubmitting}
            onChangeText={setPassword}
            onSubmitEditing={() => void submit()}
            placeholder="Enter your password"
            placeholderTextColor="#8A96A0"
            returnKeyType="go"
            secureTextEntry
            style={styles.input}
            textContentType="password"
            value={password}
          />

          {error ? (
            <Text accessibilityLiveRegion="polite" style={styles.error}>
              {error}
            </Text>
          ) : null}

          <Pressable
            accessibilityRole="button"
            disabled={!canSubmit}
            onPress={() => void submit()}
            style={({ pressed }) => [
              styles.button,
              !canSubmit && styles.buttonDisabled,
              pressed && canSubmit && styles.buttonPressed,
            ]}
          >
            {isSubmitting ? <ActivityIndicator color="#FFFFFF" /> : <LogIn color="#FFFFFF" size={18} />}
            <Text style={styles.buttonText}>{isSubmitting ? 'Signing in…' : 'Sign in'}</Text>
          </Pressable>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { backgroundColor: '#F6F8FA', flex: 1 },
  keyboardView: { flex: 1, justifyContent: 'center', padding: 24 },
  card: {
    alignSelf: 'center',
    backgroundColor: '#FFFFFF',
    borderColor: '#DCE2E7',
    borderRadius: 16,
    borderWidth: 1,
    maxWidth: 460,
    padding: 28,
    width: '100%',
  },
  brandRow: { alignItems: 'center', flexDirection: 'row', gap: 12 },
  logoMark: {
    alignItems: 'center',
    backgroundColor: '#315E78',
    borderRadius: 9,
    height: 44,
    justifyContent: 'center',
    width: 44,
  },
  logoName: { color: '#1F2A33', fontSize: 21, fontWeight: '800' },
  logoTag: { color: '#637281', fontSize: 13, fontWeight: '600', marginTop: 2 },
  badge: {
    alignItems: 'center',
    alignSelf: 'flex-start',
    backgroundColor: '#E4F1EA',
    borderRadius: 8,
    flexDirection: 'row',
    gap: 7,
    marginTop: 28,
    paddingHorizontal: 10,
    paddingVertical: 7,
  },
  badgeText: { color: '#1E684A', fontSize: 12, fontWeight: '800' },
  title: { color: '#1F2A33', fontSize: 30, fontWeight: '800', marginTop: 18 },
  copy: { color: '#53616E', fontSize: 15, lineHeight: 23, marginBottom: 20, marginTop: 8 },
  label: { color: '#34424E', fontSize: 14, fontWeight: '700', marginBottom: 7, marginTop: 12 },
  input: {
    backgroundColor: '#FFFFFF',
    borderColor: '#B8C3CC',
    borderRadius: 8,
    borderWidth: 1,
    color: '#1F2A33',
    fontSize: 16,
    minHeight: 50,
    paddingHorizontal: 14,
  },
  error: { color: '#A12B2B', fontSize: 13, lineHeight: 19, marginTop: 14 },
  button: {
    alignItems: 'center',
    backgroundColor: '#315E78',
    borderRadius: 8,
    flexDirection: 'row',
    gap: 9,
    justifyContent: 'center',
    marginTop: 22,
    minHeight: 50,
    paddingHorizontal: 18,
  },
  buttonDisabled: { backgroundColor: '#93A1AA' },
  buttonPressed: { opacity: 0.88 },
  buttonText: { color: '#FFFFFF', fontSize: 15, fontWeight: '800' },
});
