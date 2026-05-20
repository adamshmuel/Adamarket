---
name: react-native-hebrew-rtl
description: Implement right-to-left (RTL) layouts for Hebrew React Native / Expo applications. Use when working on any UI in this project (Adamarket) or when the user asks about RTL in React Native, I18nManager, mirrored layouts, bidirectional text in RN, mixed Hebrew/English rendering, or "why is my margin/icon on the wrong side". Covers I18nManager.forceRTL, the start/end style props, BiDi text rendering with FSI/PDI marks, directional icon mirroring, Hebrew font loading via expo-font, accessibility labels in Hebrew, and a pre-merge checklist. Do NOT use for web (CSS) RTL — see hebrew-rtl-best-practices for that — or for native iOS/Android RTL outside React Native.
license: MIT
compatibility: Works with Claude Code, Claude.ai, Cursor. Project-private skill — applies to Adamarket only.
---

# React Native Hebrew RTL

This is the source of truth for every UI/layout decision in Adamarket. Read it before writing any component, screen, or style. If you change a rule here, update [`references/rtl-checklist.md`](references/rtl-checklist.md) too.

The project's UI is Hebrew-only and RTL is forced at startup. We don't ship a runtime language switcher, so we don't have to handle the LTR case — but we still write code as if `start`/`end` semantics matter, because that's the only way RN's RTL machinery works correctly.

## Instructions

### Step 1: Force RTL once, at app startup

In `app/_layout.tsx`, before any UI renders:

```ts
import { I18nManager } from 'react-native';

if (!I18nManager.isRTL) {
  I18nManager.allowRTL(true);
  I18nManager.forceRTL(true);
  // Note: on a brand-new install, the first launch picks up forceRTL only
  // after a reload. Expo Go does the reload for you. In a production build,
  // you'd need Updates.reloadAsync() or similar — we don't ship that yet.
}
```

After this, every `flexDirection: 'row'` lays out children right-to-left, `textAlign: 'start'` resolves to right, and so on. **Do not** set `I18nManager.forceRTL(false)` anywhere. Do not gate it behind locale checks — the UI is Hebrew, period.

### Step 2: Use logical (start/end) style props, never physical (left/right)

This is the #1 source of RTL bugs in React Native. Physical props do **not** auto-flip.

| ❌ Don't write | ✅ Write |
|---|---|
| `marginLeft` | `marginStart` |
| `marginRight` | `marginEnd` |
| `paddingLeft` | `paddingStart` |
| `paddingRight` | `paddingEnd` |
| `borderLeftWidth`, `borderLeftColor` | `borderStartWidth`, `borderStartColor` |
| `left: 8` (absolute positioning) | `start: 8` |
| `right: 8` | `end: 8` |
| `textAlign: 'left'` | `textAlign: 'start'` (or omit — RTL parent handles it) |
| `textAlign: 'right'` | `textAlign: 'end'` |
| `flexDirection: 'row-reverse'` to "fix" RTL | leave as `'row'`; RN flips it for you |

If a code review surfaces any physical prop, treat it as a bug. The only legitimate use of physical props is when you genuinely want an absolute screen-side regardless of writing direction (extremely rare — e.g. a debug overlay).

### Step 3: Render mixed Hebrew/English with `<BiDiText>`

Plain `<Text>` works for pure Hebrew. For text that may mix scripts ("חלב Tnuva 3%", "Coca Cola זירו"), wrap in `<BiDiText>`. It:

- Sets `writingDirection: 'rtl'` explicitly.
- Wraps potentially-bidi content in Unicode FSI (U+2068) / PDI (U+2069) — First Strong Isolate / Pop Directional Isolate — so embedded LTR runs render in correct visual order.

```tsx
import { BiDiText } from '@/components/BiDiText';
<BiDiText>{item.name}</BiDiText>
```

Recipe in [`references/bidi-snippets.md`](references/bidi-snippets.md).

### Step 4: Mirror directional icons; don't mirror non-directional ones

| Directional (mirror) | Non-directional (do not mirror) |
|---|---|
| Back / forward chevrons | Home, profile, settings gear |
| Send arrow | Camera, gallery, attachment paperclip |
| Drawer / hamburger arrow toggles | Trash, edit pencil, plus |
| Speech-bubble tail (sometimes) | Clock, calendar, search |

Use `<DirectionalIcon>` (snippet in references) which applies `transform: [{ scaleX: -1 }]` when `I18nManager.isRTL`. **Do not** mirror with `transform: 'rotate(180deg)'` — that flips top-bottom too.

### Step 5: TextInput — let bidi resolve, don't force textAlign

Inside an RTL parent, `<TextInput>` automatically right-aligns Hebrew and lets the user type English (which appears LTR) within the same field. **Don't** add `textAlign="right"` or `writingDirection: 'rtl'` to inputs — they break the auto behaviour for English entry.

Hebrew placeholder is fine: `placeholder="הוסף פריט…"`.

If the user pastes an English string, RN handles the bidi correctly as long as the field's parent is RTL.

### Step 6: Load a Hebrew-aware font and apply it globally

Use Heebo (`assets/fonts/Heebo-Regular.ttf`, `Heebo-Bold.ttf`) via `expo-font`. Apply through a global default in `app/_layout.tsx`:

```ts
import { Text, TextInput } from 'react-native';

// Apply once after fonts load:
const setDefault = (Comp: any, family: string) => {
  Comp.defaultProps = Comp.defaultProps || {};
  Comp.defaultProps.style = [{ fontFamily: family }, Comp.defaultProps.style];
};
setDefault(Text, 'Heebo-Regular');
setDefault(TextInput, 'Heebo-Regular');
```

Why explicit font: iOS system Hebrew is good but inconsistent between phones; Heebo gives identical rendering on iOS and Android and has full Latin coverage so mixed lines look uniform.

### Step 7: Accessibility — Hebrew labels on every touchable

Every `<Pressable>` / `<TouchableOpacity>` / `<Button>` gets `accessibilityLabel="<hebrew text>"`. VoiceOver (iOS) and TalkBack (Android) both read Hebrew when the device locale is `he-IL`. Don't trust the visual children to provide an accessible label — icons-only buttons especially need explicit labels.

See `israeli-accessibility-compliance` skill for full ARIA-equivalent patterns.

### Step 8: Strings live in `lib/i18n.ts`

Never inline Hebrew literals in components. Add the key to `lib/i18n.ts` (e.g. `strings.addItem`) and import. This makes it easy to scan all UI copy for tone / typos, and unblocks any future translation effort (out of scope for v1).

### Step 9: Test on a real device with `he-IL` locale

Most RTL bugs show only on a real device. The iOS simulator with English system locale will silently hide layout issues. Before declaring any UI task done:

1. Set device system language to `עברית` (Hebrew).
2. Load the app in Expo Go on that device.
3. Walk through every screen you touched.
4. Run the checklist in [`references/rtl-checklist.md`](references/rtl-checklist.md).

## Notes on the New Architecture (Fabric / `newArchEnabled: true`)

Adamarket has `newArchEnabled: true` in `app.json`. Fabric handles RTL correctly out of the box, but be aware:

- Some third-party libs published before mid-2024 have RTL bugs under Fabric. Stay on plain-RN primitives where possible.
- `LayoutAnimation` and `Animated` both respect RTL automatically — no manual flipping.
- If you ever need to read the resolved direction at runtime (e.g. for a custom mirror that `transform: scaleX(-1)` can't express), use `I18nManager.getConstants().isRTL` rather than the deprecated `I18nManager.isRTL` property — the constant is stable in Fabric.
