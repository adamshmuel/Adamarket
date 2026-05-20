import { useEffect, useRef, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { normalizeHebrew } from '@/lib/hebrew';

type Suggestion = { name: string; name_normalized: string };

const DEBOUNCE_MS = 150;
const LIMIT = 5;

export function useItemHistory(householdId: string | null, query: string) {
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (timer.current) clearTimeout(timer.current);
    if (!householdId) {
      setSuggestions([]);
      return;
    }
    const trimmed = query.trim();
    if (trimmed.length < 1) {
      setSuggestions([]);
      return;
    }
    const prefix = normalizeHebrew(trimmed);
    if (!prefix) {
      setSuggestions([]);
      return;
    }
    timer.current = setTimeout(async () => {
      const { data, error } = await supabase
        .from('item_history')
        .select('name, name_normalized, last_used_at')
        .eq('household_id', householdId)
        .ilike('name_normalized', `${prefix}%`)
        .order('last_used_at', { ascending: false })
        .limit(LIMIT);
      if (error) {
        console.warn('useItemHistory error', error);
        setSuggestions([]);
        return;
      }
      // Exclude an exact match — if the user already typed the full word, no point suggesting it.
      const out = (data ?? [])
        .filter((r) => (r.name_normalized as string) !== prefix)
        .map((r) => ({ name: r.name as string, name_normalized: r.name_normalized as string }));
      setSuggestions(out);
    }, DEBOUNCE_MS);

    return () => {
      if (timer.current) clearTimeout(timer.current);
    };
  }, [householdId, query]);

  return suggestions;
}
