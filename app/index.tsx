import { Redirect } from 'expo-router';
import { View, ActivityIndicator, StyleSheet } from 'react-native';
import { useSession } from '@/hooks/useSession';
import { useHousehold } from '@/hooks/useHousehold';

export default function Index() {
  const { session, loading: sessionLoading } = useSession();
  const { household, loading: householdLoading } = useHousehold();

  if (sessionLoading || (session && householdLoading)) {
    return (
      <View style={styles.center}>
        <ActivityIndicator />
      </View>
    );
  }

  if (!session) return <Redirect href="/(auth)/sign-in" />;
  if (!household) return <Redirect href="/(auth)/join-household" />;
  return <Redirect href="/(app)" />;
}

const styles = StyleSheet.create({
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: '#fff' },
});
