import { Tabs } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { strings } from '@/lib/i18n';

export default function AppLayout() {
  // iOS Safari (and PWA "Add to Home Screen") sits the tab bar inside the
  // Home-Indicator safe area, cutting off labels. Pad the bar by the bottom
  // inset so labels clear the indicator. Falls back to a small floor of 8px
  // when the inset is 0 (Android, desktop web) so there's still breathing room.
  const insets = useSafeAreaInsets();
  const bottomPad = Math.max(insets.bottom, 8);

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: '#2D6A4F',
        tabBarInactiveTintColor: '#9A9087',
        tabBarStyle: {
          backgroundColor: '#FFFFFF',
          borderTopColor: '#F0EBE4',
          borderTopWidth: 1,
          height: 56 + bottomPad,
          paddingBottom: bottomPad,
          paddingTop: 6,
        },
        tabBarLabelStyle: { fontFamily: 'Heebo_500Medium', fontSize: 11, marginTop: 2 },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: strings.tabs.list,
          tabBarIcon: ({ color, size }) => <Ionicons name="list" color={color} size={size} />,
        }}
      />
      <Tabs.Screen
        name="scan"
        options={{
          title: strings.tabs.scan,
          tabBarIcon: ({ color, size }) => <Ionicons name="camera" color={color} size={size} />,
        }}
      />
      <Tabs.Screen
        name="settings"
        options={{
          title: strings.tabs.settings,
          tabBarIcon: ({ color, size }) => <Ionicons name="settings" color={color} size={size} />,
        }}
      />
    </Tabs>
  );
}
