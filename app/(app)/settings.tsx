import { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import * as Clipboard from 'expo-clipboard';
import { router } from 'expo-router';

import { strings } from '@/lib/i18n';
import { supabase } from '@/lib/supabase';
import { confirmAlert } from '@/lib/alert';
import { useHousehold } from '@/hooks/useHousehold';

export default function SettingsScreen() {
  const { household } = useHousehold();
  const [copied, setCopied] = useState(false);

  async function copyInviteCode() {
    if (!household) return;
    await Clipboard.setStringAsync(household.invite_code);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  }

  function signOut() {
    confirmAlert({
      title: strings.settings.signOutConfirm,
      confirmLabel: strings.settings.signOut,
      cancelLabel: strings.common.cancel,
      destructive: true,
      onConfirm: async () => {
        await supabase.auth.signOut();
        router.replace('/');
      },
    });
  }

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <View style={styles.container}>
        <Text style={styles.title}>{strings.settings.title}</Text>

        {household && (
          <>
            <View style={styles.card}>
              <Text style={styles.cardLabel}>{strings.settings.householdName}</Text>
              <Text style={styles.cardValue}>{household.name}</Text>
            </View>

            <View style={styles.card}>
              <Text style={styles.cardLabel}>{strings.household.inviteCodeLabel}</Text>
              <Text style={styles.cardHint}>{strings.household.inviteCodeHint}</Text>
              <View style={styles.codeRow}>
                <Text style={styles.codeText}>{household.invite_code}</Text>
                <Pressable
                  onPress={copyInviteCode}
                  style={({ pressed }) => [styles.copyBtn, pressed && styles.pressed, copied && styles.copyBtnDone]}
                  accessibilityRole="button"
                  accessibilityLabel={strings.household.inviteCodeCopy}
                >
                  <Ionicons name={copied ? 'checkmark' : 'copy-outline'} size={16} color={copied ? '#FAF7F2' : '#2D6A4F'} />
                  <Text style={[styles.copyText, copied && styles.copyTextDone]}>
                    {copied ? strings.household.inviteCodeCopied : strings.household.inviteCodeCopy}
                  </Text>
                </Pressable>
              </View>
            </View>
          </>
        )}

        <View style={styles.flex} />

        <Pressable
          onPress={signOut}
          style={({ pressed }) => [styles.signOutBtn, pressed && styles.pressed]}
          accessibilityRole="button"
          accessibilityLabel={strings.settings.signOut}
        >
          <Ionicons name="log-out-outline" size={20} color="#C0392B" />
          <Text style={styles.signOutText}>{strings.settings.signOut}</Text>
        </Pressable>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#FAF7F2' },
  container: { flex: 1, paddingHorizontal: 20, paddingTop: 16 },
  title: { fontSize: 28, fontFamily: 'Heebo_700Bold', color: '#1A1208', marginBottom: 24 },

  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 18,
    marginBottom: 14,
    shadowColor: '#1A1208',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 2,
  },
  cardLabel: { fontSize: 12, color: '#9A9087', fontFamily: 'Heebo_500Medium', marginBottom: 4, textTransform: 'uppercase', letterSpacing: 0.5 },
  cardValue: { fontSize: 20, fontFamily: 'Heebo_700Bold', color: '#1A1208' },
  cardHint: { fontSize: 13, color: '#AAA09A', fontFamily: 'Heebo_400Regular', marginBottom: 12 },

  codeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  codeText: { fontSize: 26, fontFamily: 'Heebo_700Bold', color: '#1A1208', letterSpacing: 4 },
  copyBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 10,
    backgroundColor: '#EEF5F1',
  },
  copyBtnDone: { backgroundColor: '#2D6A4F' },
  copyText: { color: '#2D6A4F', fontFamily: 'Heebo_500Medium', fontSize: 13 },
  copyTextDone: { color: '#FAF7F2' },

  flex: { flex: 1 },
  signOutBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 15,
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: '#C0392B',
    marginBottom: 16,
    backgroundColor: '#FEF0ED',
  },
  signOutText: { color: '#C0392B', fontFamily: 'Heebo_700Bold', fontSize: 16 },
  pressed: { opacity: 0.75 },
});
