import { useMemo, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { strings } from '@/lib/i18n';
import type { OcrExtractedItem } from '@/lib/types';

type Draft = {
  id: number;
  name: string;
  quantity: string;
  selected: boolean;
  confidence: OcrExtractedItem['confidence'];
};

type Props = {
  initial: OcrExtractedItem[];
  onCancel: () => void;
  onConfirm: (rows: { name: string; quantity: string | null }[]) => Promise<void> | void;
};

export function OcrReviewList({ initial, onCancel, onConfirm }: Props) {
  const [drafts, setDrafts] = useState<Draft[]>(() =>
    initial.map((it, i) => ({
      id: i,
      name: it.name_raw,
      quantity: it.quantity ?? '',
      selected: true,
      confidence: it.confidence,
    })),
  );
  const [submitting, setSubmitting] = useState(false);

  const selectedCount = useMemo(() => drafts.filter((d) => d.selected).length, [drafts]);

  function toggle(id: number) {
    setDrafts((ds) => ds.map((d) => (d.id === id ? { ...d, selected: !d.selected } : d)));
  }
  function setName(id: number, name: string) {
    setDrafts((ds) => ds.map((d) => (d.id === id ? { ...d, name } : d)));
  }
  function setQuantity(id: number, quantity: string) {
    setDrafts((ds) => ds.map((d) => (d.id === id ? { ...d, quantity } : d)));
  }
  function remove(id: number) {
    setDrafts((ds) => ds.filter((d) => d.id !== id));
  }

  function selectAll() {
    setDrafts((ds) => ds.map((d) => ({ ...d, selected: true })));
  }
  function deselectAll() {
    setDrafts((ds) => ds.map((d) => ({ ...d, selected: false })));
  }
  function deleteSelected() {
    setDrafts((ds) => ds.filter((d) => !d.selected));
  }

  async function confirm() {
    const rows = drafts
      .filter((d) => d.selected && d.name.trim().length > 0)
      .map((d) => ({ name: d.name.trim(), quantity: d.quantity.trim() || null }));
    if (!rows.length) return;
    setSubmitting(true);
    try {
      await onConfirm(rows);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <View style={styles.container}>
      {/* Header: close button on start (right in RTL), title flows to end */}
      <View style={styles.headerBar}>
        <Pressable
          onPress={onCancel}
          style={({ pressed }) => [styles.closeBtn, pressed && styles.pressed]}
          accessibilityRole="button"
          accessibilityLabel={strings.scan.cancel}
          hitSlop={8}
        >
          <Ionicons name="close" size={18} color="#7A6E64" />
        </Pressable>
        <View style={styles.headerText}>
          <Text style={styles.title}>{strings.scan.reviewTitle}</Text>
          <Text style={styles.hint}>{strings.scan.reviewHint}</Text>
        </View>
      </View>

      <View style={styles.toolbar}>
        <Pressable onPress={selectAll} hitSlop={6} accessibilityRole="button" accessibilityLabel={strings.scan.selectAll}>
          <Text style={styles.toolbarBtn}>{strings.scan.selectAll}</Text>
        </Pressable>
        <Pressable onPress={deselectAll} hitSlop={6} accessibilityRole="button" accessibilityLabel={strings.scan.deselectAll}>
          <Text style={styles.toolbarBtn}>{strings.scan.deselectAll}</Text>
        </Pressable>
        <Pressable
          onPress={deleteSelected}
          hitSlop={6}
          disabled={selectedCount === 0}
          accessibilityRole="button"
          accessibilityLabel={strings.scan.deleteSelected}
        >
          <Text style={[styles.toolbarBtn, styles.toolbarDestructive, selectedCount === 0 && styles.toolbarDisabled]}>
            {strings.scan.deleteSelected}
          </Text>
        </Pressable>
      </View>

      <FlatList
        data={drafts}
        keyExtractor={(d) => String(d.id)}
        renderItem={({ item }) => (
          <View style={[styles.row, item.confidence === 'low' && styles.rowLowConf]}>
            <Pressable
              onPress={() => toggle(item.id)}
              hitSlop={8}
              style={[styles.checkbox, item.selected && styles.checkboxChecked]}
              accessibilityRole="checkbox"
              accessibilityState={{ checked: item.selected }}
              accessibilityLabel={item.name}
            >
              {item.selected && <Ionicons name="checkmark" size={18} color="#fff" />}
            </Pressable>

            <View style={styles.fields}>
              <TextInput
                value={item.name}
                onChangeText={(v) => setName(item.id, v)}
                style={styles.nameInput}
                accessibilityLabel={item.name}
              />
              <TextInput
                value={item.quantity}
                onChangeText={(v) => setQuantity(item.id, v)}
                placeholder="כמות (אופציונלי)"
                placeholderTextColor="#bbb"
                style={styles.qtyInput}
              />
              {item.confidence === 'low' && (
                <View style={styles.warnRow}>
                  <Ionicons name="warning" size={14} color="#b07e00" />
                  <Text style={styles.warnText}>{strings.scan.confidenceLow}</Text>
                </View>
              )}
            </View>

            <Pressable
              onPress={() => remove(item.id)}
              hitSlop={8}
              style={styles.removeBtn}
              accessibilityRole="button"
              accessibilityLabel={strings.common.delete}
            >
              <Ionicons name="close" size={20} color="#bbb" />
            </Pressable>
          </View>
        )}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Text style={styles.emptyText}>{strings.scan.failed}</Text>
          </View>
        }
        contentContainerStyle={drafts.length === 0 ? { flexGrow: 1 } : undefined}
      />

      <View style={styles.footer}>
        <Pressable
          onPress={onCancel}
          style={({ pressed }) => [styles.btnSecondary, pressed && styles.pressed]}
          accessibilityRole="button"
          accessibilityLabel={strings.scan.cancel}
        >
          <Text style={styles.btnSecondaryText}>{strings.scan.cancel}</Text>
        </Pressable>
        <Pressable
          onPress={confirm}
          disabled={submitting || selectedCount === 0}
          style={({ pressed }) => [
            styles.btnPrimary,
            pressed && styles.pressed,
            (submitting || selectedCount === 0) && styles.btnDisabled,
          ]}
          accessibilityRole="button"
          accessibilityLabel={strings.scan.confirmAddCount(selectedCount)}
        >
          {submitting ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.btnPrimaryText}>{strings.scan.confirmAddCount(selectedCount)}</Text>
          )}
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FAF7F2' },
  headerBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingStart: 20,
    paddingEnd: 16,
    paddingTop: 16,
    paddingBottom: 12,
    gap: 12,
  },
  closeBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#F0EBE4',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerText: { flex: 1 },
  title: { fontSize: 22, fontFamily: 'Heebo_700Bold', color: '#1A1208' },
  hint: { fontSize: 13, color: '#9A9087', fontFamily: 'Heebo_400Regular', marginTop: 2 },
  pressed: { opacity: 0.82 },
  toolbar: {
    flexDirection: 'row',
    gap: 16,
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#F0EBE4',
    backgroundColor: '#FFFFFF',
  },
  toolbarBtn: { color: '#2D6A4F', fontSize: 14, fontFamily: 'Heebo_500Medium' },
  toolbarDestructive: { color: '#C0392B' },
  toolbarDisabled: { color: '#C8BFB8' },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 12,
    gap: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F0EBE4',
    backgroundColor: '#FFFFFF',
  },
  rowLowConf: { backgroundColor: '#FFF9EC' },
  checkbox: {
    width: 26,
    height: 26,
    borderRadius: 8,
    borderWidth: 2,
    borderColor: '#C8BFB8',
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkboxChecked: { backgroundColor: '#2D6A4F', borderColor: '#2D6A4F' },
  fields: { flex: 1 },
  nameInput: {
    fontSize: 16,
    paddingVertical: 4,
    color: '#1A1208',
    fontFamily: 'Heebo_400Regular',
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: 'transparent',
  },
  qtyInput: {
    fontSize: 13,
    color: '#9A9087',
    paddingVertical: 2,
    marginTop: 2,
    fontFamily: 'Heebo_400Regular',
  },
  warnRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 4 },
  warnText: { color: '#A07800', fontSize: 12, fontFamily: 'Heebo_400Regular' },
  removeBtn: { padding: 4 },
  empty: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 32 },
  emptyText: { fontSize: 14, color: '#9A9087', textAlign: 'center', fontFamily: 'Heebo_400Regular' },
  footer: {
    flexDirection: 'row',
    gap: 10,
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderTopWidth: 1,
    borderTopColor: '#F0EBE4',
    backgroundColor: '#FFFFFF',
  },
  btnSecondary: {
    paddingVertical: 14,
    paddingHorizontal: 20,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: '#2D6A4F',
  },
  btnSecondaryText: { color: '#2D6A4F', fontFamily: 'Heebo_500Medium' },
  btnPrimary: {
    flex: 1,
    backgroundColor: '#2D6A4F',
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
  },
  btnPrimaryText: { color: '#FAF7F2', fontFamily: 'Heebo_700Bold', fontSize: 16 },
  btnDisabled: { backgroundColor: '#A8C5B8' },
});
