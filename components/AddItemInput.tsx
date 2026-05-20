import { useState } from 'react';
import { Pressable, StyleSheet, TextInput, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { BiDiText } from './BiDiText';
import { strings } from '@/lib/i18n';
import { useItemHistory } from '@/hooks/useItemHistory';

type Props = {
  householdId: string | null;
  onSubmit: (name: string) => void | Promise<void>;
};

export function AddItemInput({ householdId, onSubmit }: Props) {
  const [value, setValue] = useState('');
  const suggestions = useItemHistory(householdId, value);

  function commit(name?: string) {
    const trimmed = (name ?? value).trim();
    if (!trimmed) return;
    onSubmit(trimmed);
    setValue('');
  }

  return (
    <View style={styles.outer}>
      {suggestions.length > 0 && (
        <View style={styles.suggestions}>
          {suggestions.map((s) => (
            <Pressable
              key={s.name_normalized}
              onPress={() => commit(s.name)}
              style={({ pressed }) => [styles.suggestionRow, pressed && styles.pressed]}
              accessibilityRole="button"
              accessibilityLabel={s.name}
            >
              <Ionicons name="time-outline" size={14} color="#9A9087" style={styles.suggestionIcon} />
              <BiDiText style={styles.suggestionText}>{s.name}</BiDiText>
            </Pressable>
          ))}
        </View>
      )}
      <View style={styles.wrap}>
        <TextInput
          value={value}
          onChangeText={setValue}
          placeholder={strings.list.addPlaceholder}
          placeholderTextColor="#AAA09A"
          style={styles.input}
          returnKeyType="done"
          onSubmitEditing={() => commit()}
          blurOnSubmit={false}
          accessibilityLabel={strings.list.addPlaceholder}
        />
        <Pressable
          onPress={() => commit()}
          style={({ pressed }) => [styles.btn, pressed && styles.pressed, !value.trim() && styles.btnDisabled]}
          disabled={!value.trim()}
          accessibilityRole="button"
          accessibilityLabel={strings.list.addButton}
        >
          <Ionicons name="add" size={26} color="#FAF7F2" />
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  outer: {
    backgroundColor: '#FFFFFF',
    borderTopWidth: 1,
    borderTopColor: '#F0EBE4',
    shadowColor: '#1A1208',
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 8,
  },
  suggestions: {
    paddingHorizontal: 20,
    paddingTop: 8,
    paddingBottom: 4,
    borderBottomWidth: 1,
    borderBottomColor: '#F0EBE4',
  },
  suggestionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
  },
  suggestionIcon: { marginLeft: 6 },
  suggestionText: { fontSize: 15, color: '#5C5249' },
  wrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 20,
    paddingVertical: 12,
  },
  input: {
    flex: 1,
    backgroundColor: '#FAF7F2',
    borderWidth: 1.5,
    borderColor: '#E8E0D4',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 11,
    fontSize: 16,
    color: '#1A1208',
  },
  btn: {
    backgroundColor: '#2D6A4F',
    width: 46,
    height: 46,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  btnDisabled: { backgroundColor: '#A8C5B8' },
  pressed: { opacity: 0.75 },
});
