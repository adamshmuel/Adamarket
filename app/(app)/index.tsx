import { useMemo } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  SectionList,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { strings } from '@/lib/i18n';
import { useHousehold } from '@/hooks/useHousehold';
import { useItems } from '@/hooks/useItems';
import { ItemRow } from '@/components/ItemRow';
import { AddItemInput } from '@/components/AddItemInput';
import type { Item } from '@/lib/types';

export default function ListScreen() {
  const { household } = useHousehold();
  const { items, loading, addItem, toggleChecked, deleteItem } = useItems(household?.id ?? null);

  const sections = useMemo(() => {
    const toBuy: Item[] = [];
    const bought: Item[] = [];
    for (const it of items) (it.checked ? bought : toBuy).push(it);
    const out = [];
    if (toBuy.length) out.push({ title: strings.list.sectionToBuy, data: toBuy });
    if (bought.length) out.push({ title: strings.list.sectionBought, data: bought });
    return out;
  }, [items]);

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 80 : 0}
      >
        <View style={styles.header}>
          <Text style={styles.title}>{strings.list.title}</Text>
          {household && <Text style={styles.householdName}>{household.name}</Text>}
        </View>

        {loading ? (
          <View style={styles.center}>
            <ActivityIndicator color="#2D6A4F" />
          </View>
        ) : sections.length === 0 ? (
          <View style={styles.center}>
            <Text style={styles.emptyIcon}>🛒</Text>
            <Text style={styles.emptyTitle}>{strings.list.empty}</Text>
            <Text style={styles.emptyHint}>הוסיפו פריט בתיבה למטה</Text>
          </View>
        ) : (
          <SectionList
            sections={sections}
            keyExtractor={(item) => item.id}
            renderItem={({ item }) => (
              <ItemRow item={item} onToggle={toggleChecked} onDelete={deleteItem} />
            )}
            renderSectionHeader={({ section }) => (
              <View style={styles.sectionHeader}>
                <Text style={styles.sectionHeaderText}>{section.title}</Text>
              </View>
            )}
            stickySectionHeadersEnabled={false}
            contentContainerStyle={styles.listContent}
          />
        )}

        <AddItemInput householdId={household?.id ?? null} onSubmit={addItem} />
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#FAF7F2' },
  flex: { flex: 1 },
  header: {
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 12,
  },
  title: { fontSize: 28, fontFamily: 'Heebo_700Bold', color: '#1A1208' },
  householdName: { fontSize: 13, color: '#9A9087', fontFamily: 'Heebo_400Regular', marginTop: 2 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24, gap: 8 },
  emptyIcon: { fontSize: 48, marginBottom: 8 },
  emptyTitle: { fontSize: 17, color: '#5C5249', fontFamily: 'Heebo_500Medium' },
  emptyHint: { fontSize: 14, color: '#AAA09A', fontFamily: 'Heebo_400Regular' },
  listContent: { paddingBottom: 8 },
  sectionHeader: {
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 8,
    backgroundColor: '#FAF7F2',
  },
  sectionHeaderText: {
    fontSize: 12,
    color: '#9A9087',
    fontFamily: 'Heebo_700Bold',
    letterSpacing: 0.5,
    textTransform: 'uppercase',
  },
});
