import { Pressable, StyleSheet, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import type { Item } from '@/lib/types';
import { BiDiText } from './BiDiText';
import { strings } from '@/lib/i18n';

type Props = {
  item: Item;
  onToggle: (item: Item) => void;
  onDelete: (item: Item) => void;
};

export function ItemRow({ item, onToggle, onDelete }: Props) {
  return (
    <View style={[styles.row, item.checked && styles.rowChecked]}>
      <Pressable
        onPress={() => onToggle(item)}
        style={({ pressed }) => [styles.checkbox, item.checked && styles.checkboxChecked, pressed && styles.pressed]}
        hitSlop={8}
        accessibilityRole="checkbox"
        accessibilityState={{ checked: item.checked }}
        accessibilityLabel={item.name}
      >
        {item.checked && <Ionicons name="checkmark" size={16} color="#FAF7F2" />}
      </Pressable>

      <View style={styles.textWrap}>
        <BiDiText style={[styles.name, item.checked && styles.nameChecked]}>{item.name}</BiDiText>
        {item.quantity ? (
          <BiDiText style={[styles.quantity, item.checked && styles.nameChecked]}>{item.quantity}</BiDiText>
        ) : null}
      </View>

      <Pressable
        onPress={() => onDelete(item)}
        style={({ pressed }) => [styles.deleteBtn, pressed && styles.pressed]}
        hitSlop={8}
        accessibilityRole="button"
        accessibilityLabel={strings.list.delete}
      >
        <Ionicons name="close" size={18} color="#C8BFB8" />
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 20,
    gap: 14,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#F0EBE4',
  },
  rowChecked: { backgroundColor: '#F7F5F2' },
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
  textWrap: { flex: 1 },
  name: { fontSize: 17, color: '#1A1208', fontFamily: 'Heebo_400Regular' },
  nameChecked: { color: '#B5ADA6', textDecorationLine: 'line-through' },
  quantity: { fontSize: 13, color: '#9A9087', marginTop: 2 },
  deleteBtn: { padding: 4 },
  pressed: { opacity: 0.6 },
});
