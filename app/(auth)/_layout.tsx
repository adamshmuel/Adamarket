import { Redirect, Stack } from 'expo-router';
import { useSession } from '@/hooks/useSession';
import { useHousehold } from '@/hooks/useHousehold';

export default function AuthLayout() {
  const { session, loading: sessionLoading } = useSession();
  const { household, loading: householdLoading } = useHousehold();

  if (!sessionLoading && !householdLoading && session && household) {
    return <Redirect href="/(app)" />;
  }

  return <Stack screenOptions={{ headerShown: false }} />;
}
