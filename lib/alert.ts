// Cross-platform alert helpers.
// React Native's `Alert.alert()` is a no-op on react-native-web — clicking the
// confirm button just does nothing. These helpers fall back to the browser's
// native confirm/alert on web so destructive flows actually work.

import { Alert, Platform } from 'react-native';

type ConfirmOpts = {
  title: string;
  message?: string;
  confirmLabel: string;
  cancelLabel: string;
  destructive?: boolean;
  onConfirm: () => void | Promise<void>;
};

/** Yes/no confirmation. Works on iOS, Android, and web. */
export function confirmAlert(opts: ConfirmOpts): void {
  if (Platform.OS === 'web') {
    const msg = opts.message ? `${opts.title}\n\n${opts.message}` : opts.title;
    if (typeof window !== 'undefined' && window.confirm(msg)) {
      void opts.onConfirm();
    }
    return;
  }
  Alert.alert(opts.title, opts.message, [
    { text: opts.cancelLabel, style: 'cancel' },
    {
      text: opts.confirmLabel,
      style: opts.destructive ? 'destructive' : 'default',
      onPress: () => void opts.onConfirm(),
    },
  ]);
}

/** Single-button notification. Works on iOS, Android, and web. */
export function notifyAlert(title: string, message?: string): void {
  if (Platform.OS === 'web') {
    const msg = message ? `${title}\n\n${message}` : title;
    if (typeof window !== 'undefined') window.alert(msg);
    return;
  }
  Alert.alert(title, message);
}
