import { useState } from 'react';
import {
  ActivityIndicator,
  Image,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import * as ImagePicker from 'expo-image-picker';
import * as ImageManipulator from 'expo-image-manipulator';

import { strings } from '@/lib/i18n';
import { supabase } from '@/lib/supabase';
import { useHousehold } from '@/hooks/useHousehold';
import { useItems } from '@/hooks/useItems';
import { OcrReviewList } from '@/components/OcrReviewList';
import { DirectionalIcon } from '@/components/DirectionalIcon';
import type { OcrExtractedItem, OcrResponse } from '@/lib/types';

type Stage =
  | { kind: 'idle' }
  | { kind: 'processing'; uri: string }
  | { kind: 'review'; items: OcrExtractedItem[]; warnings: string[]; uri: string }
  | { kind: 'error'; message: string; uri?: string };

const MAX_DIM = 1600;

async function compressImage(uri: string): Promise<{ uri: string; mimeType: string }> {
  const result = await ImageManipulator.manipulateAsync(
    uri,
    [{ resize: { width: MAX_DIM } }],
    { compress: 0.8, format: ImageManipulator.SaveFormat.JPEG },
  );
  return { uri: result.uri, mimeType: 'image/jpeg' };
}

async function uploadAndOcr(localUri: string): Promise<OcrResponse> {
  const { data: userData } = await supabase.auth.getUser();
  const user = userData.user;
  if (!user) throw new Error('not authenticated');

  const compressed = await compressImage(localUri);

  // Read the file as bytes for upload
  const response = await fetch(compressed.uri);
  const arrayBuffer = await response.arrayBuffer();

  const path = `${user.id}/${crypto.randomUUID()}.jpg`;
  const { error: uploadErr } = await supabase.storage
    .from('fridge-scans')
    .upload(path, arrayBuffer, {
      contentType: compressed.mimeType,
      upsert: false,
    });
  if (uploadErr) {
    console.error('[OCR] Storage upload failed:', uploadErr.message, uploadErr);
    throw uploadErr;
  }

  const { data: fnData, error: fnErr } = await supabase.functions.invoke<OcrResponse>('ocr', {
    body: { storage_path: path },
  });
  if (fnErr) {
    console.error('[OCR] Edge function error:', fnErr.message, fnErr);
    if ((fnErr as { context?: { status?: number } }).context?.status === 429) {
      throw new Error('rate_limited');
    }
    throw fnErr;
  }
  if (!fnData) {
    console.error('[OCR] Edge function returned no data');
    throw new Error('empty_response');
  }
  return fnData;
}

export default function ScanScreen() {
  const router = useRouter();
  const { household } = useHousehold();
  const { addItems } = useItems(household?.id ?? null);
  const [stage, setStage] = useState<Stage>({ kind: 'idle' });

  async function pickImage(source: 'camera' | 'library') {
    if (source === 'camera') {
      const perm = await ImagePicker.requestCameraPermissionsAsync();
      if (!perm.granted) return;
    }
    const result =
      source === 'camera'
        ? await ImagePicker.launchCameraAsync({ quality: 1 })
        : await ImagePicker.launchImageLibraryAsync({
            mediaTypes: ['images'],
            quality: 1,
          });

    if (result.canceled || !result.assets?.[0]) return;
    const uri = result.assets[0].uri;
    setStage({ kind: 'processing', uri });

    try {
      const resp = await uploadAndOcr(uri);
      setStage({ kind: 'review', items: resp.items, warnings: resp.warnings, uri });
    } catch (err) {
      console.error('[OCR] Full scan pipeline error:', err);
      const message =
        (err as Error).message === 'rate_limited'
          ? strings.scan.rateLimited
          : strings.scan.failed;
      setStage({ kind: 'error', message, uri });
    }
  }

  async function confirmAdd(rows: { name: string; quantity: string | null }[]) {
    await addItems(rows);
    setStage({ kind: 'idle' });
  }

  if (stage.kind === 'review') {
    return (
      <SafeAreaView style={styles.safe} edges={['top']}>
        <OcrReviewList
          initial={stage.items}
          onCancel={() => setStage({ kind: 'idle' })}
          onConfirm={confirmAdd}
        />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <View style={styles.container}>
        {/* Back nav — pill chip anchored to the start (right in RTL) */}
        <Pressable
          onPress={() => router.navigate('/(app)')}
          style={({ pressed }) => [styles.backPill, pressed && styles.pressed]}
          accessibilityRole="button"
          accessibilityLabel="חזרה לרשימה"
        >
          <DirectionalIcon>
            <Ionicons name="arrow-back" size={15} color="#2D6A4F" />
          </DirectionalIcon>
          <Text style={styles.backPillText}>הרשימה</Text>
        </Pressable>

        <Text style={styles.title}>{strings.scan.title}</Text>
        <Text style={styles.subtitle}>{strings.scan.intro}</Text>

        {stage.kind === 'processing' && (
          <View style={styles.processing}>
            <Image source={{ uri: stage.uri }} style={styles.preview} />
            <View style={styles.processingOverlay}>
              <ActivityIndicator color="#fff" />
              <Text style={styles.processingText}>{strings.scan.processing}</Text>
            </View>
          </View>
        )}

        {stage.kind === 'error' && (
          <View style={styles.errorBox}>
            <Text style={styles.errorText}>{stage.message}</Text>
          </View>
        )}

        {stage.kind !== 'processing' && (
          <View style={styles.buttons}>
            <Pressable
              onPress={() => pickImage('camera')}
              style={({ pressed }) => [styles.btnPrimary, pressed && styles.pressed]}
              accessibilityRole="button"
              accessibilityLabel={strings.scan.capture}
            >
              <Ionicons name="camera" size={22} color="#fff" />
              <Text style={styles.btnPrimaryText}>{strings.scan.capture}</Text>
            </Pressable>
            <Pressable
              onPress={() => pickImage('library')}
              style={({ pressed }) => [styles.btnSecondary, pressed && styles.pressed]}
              accessibilityRole="button"
              accessibilityLabel={strings.scan.pickFromGallery}
            >
              <Ionicons name="images" size={22} color="#2D6A4F" />
              <Text style={styles.btnSecondaryText}>{strings.scan.pickFromGallery}</Text>
            </Pressable>
          </View>
        )}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#FAF7F2' },
  container: { flex: 1, paddingHorizontal: 20, paddingTop: 14 },
  backPill: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    gap: 5,
    backgroundColor: '#E8F4EF',
    paddingVertical: 7,
    paddingHorizontal: 13,
    borderRadius: 20,
    marginBottom: 20,
  },
  backPillText: {
    fontSize: 14,
    fontFamily: 'Heebo_500Medium',
    color: '#2D6A4F',
  },
  title: { fontSize: 28, fontFamily: 'Heebo_700Bold', color: '#1A1208', marginBottom: 4 },
  subtitle: { fontSize: 15, color: '#7A6E64', fontFamily: 'Heebo_400Regular', marginBottom: 28 },
  processing: {
    aspectRatio: 3 / 4,
    borderRadius: 16,
    overflow: 'hidden',
    backgroundColor: '#E8E0D4',
    marginBottom: 16,
  },
  preview: { width: '100%', height: '100%' },
  processingOverlay: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    start: 0,
    end: 0,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(26,18,8,0.6)',
    gap: 12,
  },
  processingText: { color: '#FAF7F2', fontFamily: 'Heebo_500Medium', fontSize: 15 },
  errorBox: {
    backgroundColor: '#FEF0ED',
    padding: 16,
    borderRadius: 12,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#F5C9C0',
  },
  errorText: { color: '#C0392B', fontSize: 14, fontFamily: 'Heebo_400Regular' },
  buttons: { gap: 12, marginTop: 8 },
  btnPrimary: {
    flexDirection: 'row',
    gap: 10,
    backgroundColor: '#2D6A4F',
    paddingVertical: 18,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#1A1208',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  btnPrimaryText: { color: '#FAF7F2', fontSize: 16, fontFamily: 'Heebo_700Bold' },
  btnSecondary: {
    flexDirection: 'row',
    gap: 10,
    borderWidth: 1.5,
    borderColor: '#2D6A4F',
    paddingVertical: 17,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFFFFF',
  },
  btnSecondaryText: { color: '#2D6A4F', fontSize: 16, fontFamily: 'Heebo_700Bold' },
  pressed: { opacity: 0.85 },
});
