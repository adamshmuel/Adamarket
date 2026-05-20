import { useCallback, useEffect, useRef, useState } from 'react';
import { supabase } from '@/lib/supabase';
import type { Item } from '@/lib/types';
import { normalizeHebrew } from '@/lib/hebrew';

type State = {
  items: Item[];
  loading: boolean;
};

export function useItems(householdId: string | null) {
  const [state, setState] = useState<State>({ items: [], loading: true });
  const itemsRef = useRef<Item[]>([]);
  itemsRef.current = state.items;

  // Initial fetch
  useEffect(() => {
    if (!householdId) {
      setState({ items: [], loading: false });
      return;
    }
    let cancelled = false;
    setState((s) => ({ ...s, loading: true }));
    supabase
      .from('items')
      .select('*')
      .eq('household_id', householdId)
      .order('created_at', { ascending: false })
      .then(({ data, error }) => {
        if (cancelled) return;
        if (error) {
          console.warn('useItems fetch error', error);
          setState({ items: [], loading: false });
        } else {
          setState({ items: (data ?? []) as Item[], loading: false });
        }
      });
    return () => {
      cancelled = true;
    };
  }, [householdId]);

  // Unique channel name per hook instance — prevents conflicts when multiple
  // screens mount useItems concurrently (e.g. list tab + scan tab).
  const channelName = useRef(`items-${Math.random().toString(36).slice(2)}`);

  // Realtime subscription
  useEffect(() => {
    if (!householdId) return;
    const channel = supabase
      .channel(channelName.current)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'items',
          filter: `household_id=eq.${householdId}`,
        },
        (payload) => {
          setState((s) => {
            const items = s.items.slice();
            if (payload.eventType === 'INSERT') {
              const row = payload.new as Item;
              if (!items.find((it) => it.id === row.id)) items.unshift(row);
            } else if (payload.eventType === 'UPDATE') {
              const row = payload.new as Item;
              const idx = items.findIndex((it) => it.id === row.id);
              if (idx >= 0) items[idx] = row;
            } else if (payload.eventType === 'DELETE') {
              const old = payload.old as { id: string };
              const idx = items.findIndex((it) => it.id === old.id);
              if (idx >= 0) items.splice(idx, 1);
            }
            return { ...s, items };
          });
        },
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [householdId]);

  const addItem = useCallback(
    async (name: string, quantity?: string | null) => {
      if (!householdId) return;
      const trimmed = name.trim();
      if (!trimmed) return;
      const normalized = normalizeHebrew(trimmed);

      // Dedup: if an UNCHECKED item with the same normalised name already
      // exists, treat the add as a no-op. The user already has it on the list.
      // Checked (purchased) items don't block a new add — that's the user
      // intentionally re-adding something they bought before.
      const existing = itemsRef.current.find(
        (it) => it.name_normalized === normalized && !it.checked,
      );
      if (existing) {
        console.log('[addItem] duplicate skipped:', trimmed);
        return { skipped: true as const, existing };
      }

      const { data: user } = await supabase.auth.getUser();
      if (!user.user) return;

      // Optimistic update — item appears instantly in the list.
      const tempId = `temp-${Date.now()}-${Math.random().toString(36).slice(2)}`;
      const tempItem: Item = {
        id: tempId,
        household_id: householdId,
        name: trimmed,
        name_normalized: normalized,
        quantity: quantity?.trim() || null,
        checked: false,
        checked_at: null,
        created_by: user.user.id,
        created_at: new Date().toISOString(),
      };
      setState((s) => ({ ...s, items: [tempItem, ...s.items] }));

      const { data, error } = await supabase
        .from('items')
        .insert({
          household_id: householdId,
          name: trimmed,
          name_normalized: normalized,
          quantity: quantity?.trim() || null,
          created_by: user.user.id,
        })
        .select()
        .single();

      if (error) {
        console.warn('addItem error', error);
        // Revert — remove the temp item.
        setState((s) => ({ ...s, items: s.items.filter((it) => it.id !== tempId) }));
      } else {
        // Replace temp row with the real DB row (Realtime INSERT will also arrive
        // but the dedup check `!items.find(it => it.id === row.id)` handles it).
        setState((s) => ({
          ...s,
          items: s.items.map((it) => (it.id === tempId ? (data as Item) : it)),
        }));
      }
    },
    [householdId],
  );

  const addItems = useCallback(
    async (rows: { name: string; quantity?: string | null }[]) => {
      if (!householdId) return;
      const { data: user } = await supabase.auth.getUser();
      if (!user.user) return;

      // Existing UNCHECKED items block re-adds. Checked items (purchased) don't.
      const existingUnchecked = new Set(
        itemsRef.current.filter((it) => !it.checked).map((it) => it.name_normalized),
      );
      const seenInBatch = new Set<string>();
      const skipped: string[] = [];

      const payload = rows
        .map((r) => ({
          household_id: householdId,
          name: r.name.trim(),
          name_normalized: normalizeHebrew(r.name),
          quantity: r.quantity?.trim() || null,
          created_by: user.user!.id,
        }))
        .filter((r) => {
          if (!r.name.length) return false;
          // Skip duplicates of items already on the list
          if (existingUnchecked.has(r.name_normalized)) {
            skipped.push(r.name);
            return false;
          }
          // Skip duplicates within this same batch (OCR may extract the same
          // word twice from a noisy photo)
          if (seenInBatch.has(r.name_normalized)) {
            skipped.push(r.name);
            return false;
          }
          seenInBatch.add(r.name_normalized);
          return true;
        });

      if (skipped.length) {
        console.log(`[addItems] skipped ${skipped.length} duplicate(s):`, skipped);
      }
      if (!payload.length) return { skippedCount: skipped.length };

      // Optimistic update — all confirmed items appear instantly.
      const now = new Date().toISOString();
      const tempIds = payload.map((_, i) => `temp-${Date.now()}-${i}`);
      const tempItems: Item[] = payload.map((p, i) => ({
        id: tempIds[i],
        household_id: householdId,
        name: p.name,
        name_normalized: p.name_normalized,
        quantity: p.quantity,
        checked: false,
        checked_at: null,
        created_by: user.user!.id,
        created_at: now,
      }));
      setState((s) => ({ ...s, items: [...tempItems, ...s.items] }));

      const { data, error } = await supabase.from('items').insert(payload).select();
      if (error) {
        console.warn('addItems error', error);
        // Revert all temp rows.
        setState((s) => ({ ...s, items: s.items.filter((it) => !tempIds.includes(it.id)) }));
      } else {
        // Swap temp rows for real DB rows (prepend; Realtime dedup handles duplicates).
        const realItems = (data ?? []) as Item[];
        setState((s) => ({
          ...s,
          items: [...realItems, ...s.items.filter((it) => !tempIds.includes(it.id))],
        }));
      }
    },
    [householdId],
  );

  const toggleChecked = useCallback(async (item: Item) => {
    const next = !item.checked;
    const checkedAt = next ? new Date().toISOString() : null;
    // Optimistic update — UI responds instantly; Realtime confirms later.
    setState((s) => {
      const items = s.items.slice();
      const idx = items.findIndex((it) => it.id === item.id);
      if (idx >= 0) items[idx] = { ...items[idx], checked: next, checked_at: checkedAt };
      return { ...s, items };
    });
    const { error } = await supabase
      .from('items')
      .update({ checked: next, checked_at: checkedAt })
      .eq('id', item.id);
    if (error) {
      console.warn('toggleChecked error', error);
      // Revert on failure.
      setState((s) => {
        const items = s.items.slice();
        const idx = items.findIndex((it) => it.id === item.id);
        if (idx >= 0) items[idx] = item;
        return { ...s, items };
      });
    }
  }, []);

  const deleteItem = useCallback(async (item: Item) => {
    // Optimistic remove — item disappears instantly.
    setState((s) => ({ ...s, items: s.items.filter((it) => it.id !== item.id) }));
    const { error } = await supabase.from('items').delete().eq('id', item.id);
    if (error) {
      console.warn('deleteItem error', error);
      // Revert — put it back at the top.
      setState((s) => ({ ...s, items: [item, ...s.items] }));
    }
  }, []);

  return {
    items: state.items,
    loading: state.loading,
    addItem,
    addItems,
    toggleChecked,
    deleteItem,
  };
}
