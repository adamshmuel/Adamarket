# RTL Pre-merge Checklist

Run through this before declaring any UI task done. If any item fails, fix it before merge.

## Code-level (greppable)

- [ ] No `marginLeft` / `marginRight` in changed files (use `marginStart` / `marginEnd`).
- [ ] No `paddingLeft` / `paddingRight` (use `paddingStart` / `paddingEnd`).
- [ ] No `borderLeft*` / `borderRight*` (use `borderStart*` / `borderEnd*`).
- [ ] No bare `left:` or `right:` in absolute positioning (use `start:` / `end:`).
- [ ] No `textAlign: 'left'` or `textAlign: 'right'` (use `'start'` / `'end'`, or omit and let RTL parent decide).
- [ ] No `flexDirection: 'row-reverse'` added "to fix RTL" — leave as `'row'` and let `I18nManager` handle it.
- [ ] All directional icons (back, forward, chevron, send) wrapped in `<DirectionalIcon>`.
- [ ] All mixed-script text rendered through `<BiDiText>`.
- [ ] No raw Hebrew strings inlined in components — every UI string is in `lib/i18n.ts`.
- [ ] Every interactive element has `accessibilityLabel` in Hebrew.

Quick grep to surface issues:

```bash
rg "marginLeft|marginRight|paddingLeft|paddingRight|borderLeft|borderRight|textAlign:\s*['\"](left|right)['\"]|flexDirection:\s*['\"]row-reverse['\"]" app/ components/ hooks/ 2>/dev/null
```

## Visual on real device (`he-IL` locale)

- [ ] Whole screen reads right-to-left at a glance — no element looks "wrong-sided".
- [ ] Back / chevron icons point in the correct RTL direction.
- [ ] Hebrew text is not clipped, truncated mid-word, or rendered with the wrong baseline.
- [ ] Mixed-script lines render in expected visual order ("חלב Tnuva 3%" — Hebrew first visually, English second).
- [ ] Numbers inside Hebrew sentences appear LTR (this is correct Unicode behaviour; do not "fix" it).
- [ ] No layout jumps when the keyboard opens for an RTL-aligned input.
- [ ] All tap targets are ≥ 44pt.

## Accessibility (VoiceOver / TalkBack, Hebrew voice)

- [ ] Every button announces a meaningful Hebrew label.
- [ ] Reading order matches visual order (right column read before left in row layouts).
- [ ] Form fields announce their purpose (e.g. "שדה טקסט: הוסף פריט").
- [ ] No element is announced as "כפתור" / "image" with no name.
