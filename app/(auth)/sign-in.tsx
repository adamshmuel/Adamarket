import { useState } from 'react';
import { router } from 'expo-router';
import {
  View,
  Text,
  TextInput,
  Pressable,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { strings } from '@/lib/i18n';
import { supabase } from '@/lib/supabase';

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export default function SignInScreen() {
  const [mode, setMode] = useState<'signin' | 'signup'>('signin');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [status, setStatus] = useState<'idle' | 'loading' | 'error'>('idle');
  const [errorMsg, setErrorMsg] = useState('');

  function clearError() {
    if (status === 'error') setStatus('idle');
  }

  async function onSubmit() {
    if (!EMAIL_RE.test(email)) {
      setStatus('error');
      setErrorMsg(strings.signIn.errorInvalidEmail);
      return;
    }
    if (password.length < 6) {
      setStatus('error');
      setErrorMsg(strings.signIn.errorShortPassword);
      return;
    }
    setStatus('loading');
    setErrorMsg('');

    const { error } =
      mode === 'signin'
        ? await supabase.auth.signInWithPassword({ email: email.trim(), password })
        : await supabase.auth.signUp({ email: email.trim(), password });

    if (error) {
      setStatus('error');
      const msg = error.message?.toLowerCase() ?? '';
      setErrorMsg(
        msg.includes('confirm')
          ? strings.signIn.errorEmailNotConfirmed
          : msg.includes('invalid') || msg.includes('credentials')
          ? strings.signIn.errorInvalidCredentials
          : strings.signIn.errorGeneric,
      );
    } else {
      router.replace('/');
    }
  }

  function switchMode() {
    setMode((m) => (m === 'signin' ? 'signup' : 'signin'));
    setStatus('idle');
    setErrorMsg('');
  }

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <View style={styles.container}>
          {/* Header */}
          <View style={styles.header}>
            <View style={styles.logoMark}>
              <Text style={styles.logoEmoji}>🛒</Text>
            </View>
            <Text style={styles.title}>{strings.signIn.title}</Text>
            <Text style={styles.subtitle}>{strings.signIn.subtitle}</Text>
          </View>

          {/* Form card */}
          <View style={styles.card}>
            <Text style={styles.label}>{strings.signIn.emailLabel}</Text>
            <TextInput
              value={email}
              onChangeText={(v) => { setEmail(v); clearError(); }}
              placeholder={strings.signIn.emailPlaceholder}
              placeholderTextColor="#AAA09A"
              autoCapitalize="none"
              autoCorrect={false}
              keyboardType="email-address"
              inputMode="email"
              style={styles.input}
              editable={status !== 'loading'}
              accessibilityLabel={strings.signIn.emailLabel}
            />

            <Text style={[styles.label, { marginTop: 16 }]}>{strings.signIn.passwordLabel}</Text>
            <TextInput
              value={password}
              onChangeText={(v) => { setPassword(v); clearError(); }}
              placeholder={strings.signIn.passwordPlaceholder}
              placeholderTextColor="#AAA09A"
              secureTextEntry
              style={styles.input}
              editable={status !== 'loading'}
              accessibilityLabel={strings.signIn.passwordLabel}
              onSubmitEditing={onSubmit}
              returnKeyType="done"
            />

            {status === 'error' && (
              <View style={styles.errorBox}>
                <Text style={styles.errorText}>{errorMsg}</Text>
              </View>
            )}

            <Pressable
              style={({ pressed }) => [
                styles.button,
                pressed && styles.buttonPressed,
                status === 'loading' && styles.buttonDisabled,
              ]}
              onPress={onSubmit}
              disabled={status === 'loading'}
              accessibilityRole="button"
              accessibilityLabel={mode === 'signin' ? strings.signIn.submitSignIn : strings.signIn.submitSignUp}
            >
              {status === 'loading' ? (
                <ActivityIndicator color="#FAF7F2" />
              ) : (
                <Text style={styles.buttonText}>
                  {mode === 'signin' ? strings.signIn.submitSignIn : strings.signIn.submitSignUp}
                </Text>
              )}
            </Pressable>

            <Pressable onPress={switchMode} style={styles.switchBtn} accessibilityRole="button">
              <Text style={styles.switchText}>
                {mode === 'signin' ? strings.signIn.switchToSignUp : strings.signIn.switchToSignIn}
              </Text>
            </Pressable>
          </View>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#FAF7F2' },
  flex: { flex: 1 },
  container: { flex: 1, paddingHorizontal: 24, justifyContent: 'center', gap: 32 },

  header: { alignItems: 'flex-end' },
  logoMark: {
    width: 72,
    height: 72,
    borderRadius: 22,
    backgroundColor: '#C7E8D4',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
    shadowColor: '#2D6A4F',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 10,
    elevation: 6,
  },
  logoEmoji: { fontSize: 36 },
  title: {
    fontSize: 34,
    fontFamily: 'Heebo_700Bold',
    color: '#1A1208',
    marginBottom: 6,
  },
  subtitle: { fontSize: 16, color: '#7A6E64', fontFamily: 'Heebo_400Regular' },

  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 24,
    shadowColor: '#1A1208',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 16,
    elevation: 4,
  },

  label: {
    fontSize: 13,
    fontFamily: 'Heebo_500Medium',
    color: '#5C5249',
    marginBottom: 8,
  },
  input: {
    backgroundColor: '#FAF7F2',
    borderWidth: 1.5,
    borderColor: '#E8E0D4',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 13,
    fontSize: 16,
    fontFamily: 'Heebo_400Regular',
    color: '#1A1208',
  },

  errorBox: {
    marginTop: 14,
    backgroundColor: '#FEF0ED',
    borderRadius: 10,
    padding: 12,
  },
  errorText: { color: '#C0392B', fontSize: 14, fontFamily: 'Heebo_400Regular' },

  button: {
    marginTop: 24,
    backgroundColor: '#2D6A4F',
    paddingVertical: 15,
    borderRadius: 14,
    alignItems: 'center',
  },
  buttonPressed: { opacity: 0.85 },
  buttonDisabled: { backgroundColor: '#A8C5B8' },
  buttonText: { color: '#FAF7F2', fontSize: 17, fontFamily: 'Heebo_700Bold' },

  switchBtn: { marginTop: 18, alignItems: 'center', paddingVertical: 4 },
  switchText: { color: '#2D6A4F', fontSize: 14, fontFamily: 'Heebo_500Medium' },
});
