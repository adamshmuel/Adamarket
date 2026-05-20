import { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  Pressable,
  StyleSheet,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { strings } from '@/lib/i18n';
import { notifyAlert } from '@/lib/alert';
import { useHousehold } from '@/hooks/useHousehold';

type Mode = 'choose' | 'create' | 'join';

export default function JoinHouseholdScreen() {
  const [mode, setMode] = useState<Mode>('choose');
  const [name, setName] = useState('');
  const [code, setCode] = useState('');
  const [busy, setBusy] = useState(false);
  const { createHousehold, joinHousehold } = useHousehold();

  async function onCreate() {
    if (!name.trim()) return;
    setBusy(true);
    try {
      await createHousehold(name.trim());
      router.replace('/(app)');
    } catch (e) {
      notifyAlert(strings.common.error, String((e as Error).message ?? e));
    } finally {
      setBusy(false);
    }
  }

  async function onJoin() {
    const trimmed = code.trim().toUpperCase();
    if (!trimmed) return;
    setBusy(true);
    try {
      await joinHousehold(trimmed);
      router.replace('/(app)');
    } catch {
      notifyAlert(strings.common.error, strings.household.errorBadCode);
    } finally {
      setBusy(false);
    }
  }

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <View style={styles.container}>
          <View style={styles.header}>
            <View style={styles.iconWrap}>
              <Text style={styles.iconEmoji}>🏠</Text>
            </View>
            <Text style={styles.title}>{strings.household.title}</Text>
            <Text style={styles.subtitle}>
              {mode === 'choose'
                ? 'צרו משק בית חדש או הצטרפו לקיים'
                : mode === 'create'
                ? 'בחרו שם לקבוצת הקניות שלכם'
                : 'הכניסו את קוד ההזמנה שקיבלתם'}
            </Text>
          </View>

          <View style={styles.card}>
            {mode === 'choose' && (
              <View style={styles.choiceWrap}>
                <Pressable
                  style={({ pressed }) => [styles.choiceBtn, pressed && styles.pressed]}
                  onPress={() => setMode('create')}
                  accessibilityRole="button"
                  accessibilityLabel={strings.household.chooseCreate}
                >
                  <Text style={styles.choiceBtnIcon}>✨</Text>
                  <Text style={styles.choiceText}>{strings.household.chooseCreate}</Text>
                </Pressable>

                <View style={styles.divider}>
                  <View style={styles.dividerLine} />
                  <Text style={styles.dividerText}>או</Text>
                  <View style={styles.dividerLine} />
                </View>

                <Pressable
                  style={({ pressed }) => [styles.choiceBtnSecondary, pressed && styles.pressed]}
                  onPress={() => setMode('join')}
                  accessibilityRole="button"
                  accessibilityLabel={strings.household.chooseJoin}
                >
                  <Text style={styles.choiceBtnIconSecondary}>🔗</Text>
                  <Text style={styles.choiceTextSecondary}>{strings.household.chooseJoin}</Text>
                </Pressable>
              </View>
            )}

            {mode === 'create' && (
              <>
                <Text style={styles.label}>{strings.household.createName}</Text>
                <TextInput
                  value={name}
                  onChangeText={setName}
                  placeholder={strings.household.createNamePlaceholder}
                  placeholderTextColor="#AAA09A"
                  style={styles.input}
                  editable={!busy}
                  accessibilityLabel={strings.household.createName}
                  onSubmitEditing={onCreate}
                  returnKeyType="done"
                />
                <Pressable
                  style={({ pressed }) => [styles.button, pressed && styles.pressed, busy && styles.buttonDisabled]}
                  onPress={onCreate}
                  disabled={busy}
                  accessibilityRole="button"
                  accessibilityLabel={strings.household.createSubmit}
                >
                  {busy ? <ActivityIndicator color="#FAF7F2" /> : <Text style={styles.buttonText}>{strings.household.createSubmit}</Text>}
                </Pressable>
              </>
            )}

            {mode === 'join' && (
              <>
                <Text style={styles.label}>{strings.household.joinCode}</Text>
                <TextInput
                  value={code}
                  onChangeText={(v) => setCode(v.toUpperCase())}
                  placeholder={strings.household.joinCodePlaceholder}
                  placeholderTextColor="#AAA09A"
                  autoCapitalize="characters"
                  autoCorrect={false}
                  style={[styles.input, styles.inputCode]}
                  editable={!busy}
                  accessibilityLabel={strings.household.joinCode}
                  onSubmitEditing={onJoin}
                  returnKeyType="done"
                />
                <Pressable
                  style={({ pressed }) => [styles.button, pressed && styles.pressed, busy && styles.buttonDisabled]}
                  onPress={onJoin}
                  disabled={busy}
                  accessibilityRole="button"
                  accessibilityLabel={strings.household.joinSubmit}
                >
                  {busy ? <ActivityIndicator color="#FAF7F2" /> : <Text style={styles.buttonText}>{strings.household.joinSubmit}</Text>}
                </Pressable>
              </>
            )}

            {mode !== 'choose' && !busy && (
              <Pressable onPress={() => setMode('choose')} style={styles.backLink}>
                <Text style={styles.backLinkText}>← {strings.common.back}</Text>
              </Pressable>
            )}
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
  iconWrap: {
    width: 64,
    height: 64,
    borderRadius: 20,
    backgroundColor: '#2D6A4F',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
  },
  iconEmoji: { fontSize: 32 },
  title: { fontSize: 34, fontFamily: 'Heebo_700Bold', color: '#1A1208', marginBottom: 6 },
  subtitle: { fontSize: 15, color: '#7A6E64', fontFamily: 'Heebo_400Regular' },

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

  choiceWrap: { gap: 4 },
  choiceBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: '#2D6A4F',
    paddingVertical: 18,
    paddingHorizontal: 20,
    borderRadius: 14,
  },
  choiceBtnIcon: { fontSize: 22 },
  choiceText: { color: '#FAF7F2', fontSize: 17, fontFamily: 'Heebo_700Bold', flex: 1, textAlign: 'center' },
  divider: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 12 },
  dividerLine: { flex: 1, height: 1, backgroundColor: '#E8E0D4' },
  dividerText: { color: '#AAA09A', fontSize: 13, fontFamily: 'Heebo_400Regular' },
  choiceBtnSecondary: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    borderWidth: 1.5,
    borderColor: '#2D6A4F',
    paddingVertical: 18,
    paddingHorizontal: 20,
    borderRadius: 14,
  },
  choiceBtnIconSecondary: { fontSize: 22 },
  choiceTextSecondary: { color: '#2D6A4F', fontSize: 17, fontFamily: 'Heebo_700Bold', flex: 1, textAlign: 'center' },

  label: { fontSize: 13, color: '#5C5249', fontFamily: 'Heebo_500Medium', marginBottom: 8 },
  input: {
    backgroundColor: '#FAF7F2',
    borderWidth: 1.5,
    borderColor: '#E8E0D4',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 13,
    fontSize: 16,
    color: '#1A1208',
  },
  inputCode: { letterSpacing: 6, textAlign: 'center', fontFamily: 'Heebo_700Bold', fontSize: 22 },
  button: {
    marginTop: 20,
    backgroundColor: '#2D6A4F',
    paddingVertical: 15,
    borderRadius: 14,
    alignItems: 'center',
  },
  buttonDisabled: { backgroundColor: '#A8C5B8' },
  buttonText: { color: '#FAF7F2', fontSize: 17, fontFamily: 'Heebo_700Bold' },
  pressed: { opacity: 0.85 },
  backLink: { marginTop: 20, alignItems: 'center' },
  backLinkText: { color: '#2D6A4F', fontSize: 14, fontFamily: 'Heebo_500Medium' },
});
