# BiDi snippets

Canonical recipes for the two helper components every UI screen uses. If a screen needs a variation, ask whether the helper should evolve before forking it.

## `BiDiText` — safe rendering of mixed Hebrew/English text

```tsx
// components/BiDiText.tsx
import { Text, type TextProps, type StyleProp, type TextStyle } from 'react-native';

const FSI = '⁨'; // First Strong Isolate
const PDI = '⁩'; // Pop Directional Isolate

const HEEBO_DEFAULT: TextStyle = {
  fontFamily: 'Heebo-Regular',
  writingDirection: 'rtl',
};

export function BiDiText({ children, style, ...rest }: TextProps) {
  const content =
    typeof children === 'string' ? `${FSI}${children}${PDI}` : children;
  return (
    <Text {...rest} style={[HEEBO_DEFAULT, style] as StyleProp<TextStyle>}>
      {content}
    </Text>
  );
}
```

When to use it: any text whose value can include English characters (item names, brand names, sometimes quantities). Pure-UI labels from `lib/i18n.ts` can use plain `<Text>` because the strings are Hebrew-only.

The FSI/PDI marks are zero-width and invisible — they only affect bidi layout. They're safe to wrap around any text including pure Hebrew or pure English.

## `DirectionalIcon` — mirror directional icons under RTL

```tsx
// components/DirectionalIcon.tsx
import { I18nManager, View, type ViewProps } from 'react-native';

export function DirectionalIcon({ children, style, ...rest }: ViewProps) {
  const transform = I18nManager.isRTL ? [{ scaleX: -1 as const }] : undefined;
  return (
    <View {...rest} style={[{ transform }, style]}>
      {children}
    </View>
  );
}
```

Usage:

```tsx
import { DirectionalIcon } from '@/components/DirectionalIcon';
import { Ionicons } from '@expo/vector-icons';

<DirectionalIcon>
  <Ionicons name="chevron-back" size={24} />
</DirectionalIcon>
```

Do **not** mirror non-directional icons (camera, trash, home, settings, cart, plus). Mirroring them is a bug — call sites must decide per icon.

## Why FSI/PDI and not LRM/RLM?

The Unicode Bidirectional Algorithm has two families of explicit directionality marks:

- **Embedding / overriding** (LRE, RLE, LRO, RLO + PDF) — older, brittle, can leak.
- **Isolates** (LRI, RLI, FSI + PDI) — newer (Unicode 6.3, 2013), isolate the wrapped run from surrounding bidi context. Recommended.

We use **FSI** (First Strong Isolate) specifically because we don't know in advance whether the wrapped text starts with a Hebrew or Latin character. FSI picks the direction from the first strong character. PDI closes the isolate.

If you find yourself reaching for LRE/RLE/PDF, it's almost always a sign that BiDiText should be doing the work instead.
