import { I18nManager, View, type ViewProps } from 'react-native';

export function DirectionalIcon({ children, style, ...rest }: ViewProps) {
  const transform = I18nManager.isRTL ? [{ scaleX: -1 as const }] : undefined;
  return (
    <View {...rest} style={[{ transform }, style]}>
      {children}
    </View>
  );
}
