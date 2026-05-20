import { useCallback, useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import type { Household } from '@/lib/types';
import { useSession } from './useSession';

export function useHousehold() {
  const { session } = useSession();
  const [household, setHousehold] = useState<Household | null>(null);
  const [loading, setLoading] = useState(true);

  const fetch = useCallback(async () => {
    if (!session) {
      setHousehold(null);
      setLoading(false);
      return;
    }
    setLoading(true);
    const { data, error } = await supabase
      .from('household_members')
      .select('households(*)')
      .eq('user_id', session.user.id)
      .order('joined_at', { ascending: true })
      .limit(1);
    if (error) {
      console.warn('useHousehold fetch error', error);
      setHousehold(null);
    } else {
      const first = data?.[0] as unknown as { households: Household | null } | undefined;
      setHousehold(first?.households ?? null);
    }
    setLoading(false);
  }, [session]);

  useEffect(() => {
    fetch();
  }, [fetch]);

  const createHousehold = useCallback(async (name: string) => {
    const { data, error } = await supabase.rpc('create_household', {
      household_name: name,
    });
    if (error) throw error;
    const h = data as Household;
    setHousehold(h);
    return h;
  }, []);

  const joinHousehold = useCallback(async (code: string) => {
    const { data, error } = await supabase.rpc('join_household_by_code', {
      code,
    });
    if (error) throw error;
    const h = data as Household;
    setHousehold(h);
    return h;
  }, []);

  return { household, loading, refetch: fetch, createHousehold, joinHousehold };
}
