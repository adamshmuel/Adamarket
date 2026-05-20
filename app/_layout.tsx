import 'react-native-reanimated';
import 'react-native-url-polyfill/auto';

import { I18nManager, Platform, Text, TextInput } from 'react-native';
import { ThemeProvider, DefaultTheme } from '@react-navigation/native';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';
import * as SplashScreen from 'expo-splash-screen';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import {
  useFonts,
  Heebo_400Regular,
  Heebo_500Medium,
  Heebo_700Bold,
} from '@expo-google-fonts/heebo';
// Force RTL once, in module scope, before the React root mounts.
// Hebrew-only UI — no runtime language switch, so we do not gate this on locale.
if (!I18nManager.isRTL) {
  I18nManager.allowRTL(true);
  I18nManager.forceRTL(true);
}

// iOS Safari only exposes env(safe-area-inset-*) to CSS when the viewport meta
// tag includes viewport-fit=cover. Expo's default web template doesn't set it,
// which means the bottom tab bar overlaps the Home Indicator. Patch the meta
// tag at module load so it's set before the first paint.
if (Platform.OS === 'web' && typeof document !== 'undefined') {
  const meta = document.querySelector('meta[name="viewport"]');
  if (meta && !meta.getAttribute('content')?.includes('viewport-fit')) {
    meta.setAttribute(
      'content',
      `${meta.getAttribute('content') ?? 'width=device-width, initial-scale=1'}, viewport-fit=cover`,
    );
  }
}

SplashScreen.preventAutoHideAsync().catch(() => {});

let defaultsApplied = false;
function applyHeeboDefaults() {
  if (defaultsApplied) return;
  defaultsApplied = true;
  const set = (Comp: any, family: string) => {
    Comp.defaultProps = Comp.defaultProps || {};
    Comp.defaultProps.style = [{ fontFamily: family }, Comp.defaultProps.style];
  };
  set(Text, 'Heebo_400Regular');
  set(TextInput, 'Heebo_400Regular');
}

export default function RootLayout() {
  const [fontsLoaded] = useFonts({
    Heebo_400Regular,
    Heebo_500Medium,
    Heebo_700Bold,
  });

  useEffect(() => {
    if (fontsLoaded) {
      applyHeeboDefaults();
      SplashScreen.hideAsync().catch(() => {});
    }
  }, [fontsLoaded]);

  if (!fontsLoaded) return null;

  return (
    <SafeAreaProvider>
      <ThemeProvider value={DefaultTheme}>
        <Stack screenOptions={{ headerShown: false }}>
          <Stack.Screen name="(auth)" />
          <Stack.Screen name="(app)" />
        </Stack>
        <StatusBar style="auto" />
      </ThemeProvider>
    </SafeAreaProvider>
  );
}
