---
name: qa-testing
description: >
  Mandatory QA protocol for the Adamarket app. Invoke after EVERY fix or feature — no
  exceptions. Covers: (1) scoped test of the changed area, (2) full regression across
  the entire app. Results must be documented in chat with screenshot evidence. Never
  hand back to Adam without proof-of-test.
license: MIT
compatibility: Claude Code only. Adamarket project (Expo + Supabase). Preview pane on port 8082.
---

# QA Testing Skill — Adamarket

## When to invoke

**Mandatory** after every:
- Bug fix (even a one-liner)
- New feature or component
- Supabase schema / Edge Function change
- Dependency upgrade that touches behaviour

Never say "it should work now" without running this protocol first.

---

## Protocol overview

```
1. Scoped test   →  exercise only the changed feature (3–5 steps)
2. Full regression →  run every row in references/regression-checklist.md
3. Report        →  table of ✅ / ❌ / ⚠️, screenshots, file any ❌ in bug-registry.md
```

---

## Step 1 — Scoped test

Before running the full regression, validate the specific change:

1. Identify the smallest surface area touched (one component, one hook, one screen).
2. Exercise the happy path end-to-end (e.g. for optimistic add: type item → tap + → confirm item appears *before* the Supabase insert returns).
3. Trigger the failure path if one exists (e.g. for error handling: force a bad request, confirm error UI shows).
4. Take a `preview_screenshot` after each meaningful state change.
5. Check browser console with `preview_console_logs` — zero unhandled errors expected.

Pass criteria: all steps show correct UI state with no console errors.

---

## Step 2 — Full regression

Load `references/regression-checklist.md` and run every row in order. For each row:

- Use `preview_eval` / `preview_click` / `preview_fill` / `preview_network` / `preview_screenshot` to exercise the feature.
- Mark the row ✅ (pass), ❌ (fail), or ⚠️ (degraded / works with workaround).
- On ❌: stop immediately, diagnose root cause, fix before continuing the regression.

### Preview pane protocol

```
1. Ensure the dev server is running (Adam has `npm start` running on his machine).
   The preview is available at http://localhost:8082.
2. Call preview_screenshot to confirm the app is loaded and not blank.
3. Auth: the preview starts on the sign-in screen.
   Use preview_fill + preview_click to sign in with a test account.
4. Exercise each checklist item in sequence.
5. After the Scan section: use preview_eval to inject a test image into the
   file input (DataTransfer method — see snippet below).
6. Call preview_network after OCR to confirm POST /functions/v1/ocr returned 200.
```

### Image injection snippet (OCR testing in browser preview)

```js
// Fetch a test image served by a local CORS-enabled server (port 8083):
//   python3 -m http.server 8083 --bind 0.0.0.0
// then inject into the hidden file input that expo-image-picker creates:
const resp = await fetch('http://localhost:8083/test-fridge.jpg');
const blob = await resp.blob();
const file = new File([blob], 'test.jpg', { type: 'image/jpeg' });
const dt = new DataTransfer();
dt.items.add(file);
const input = document.querySelector('input[type="file"]');
if (input) {
  Object.defineProperty(input, 'files', { value: dt.files, configurable: true });
  input.dispatchEvent(new Event('change', { bubbles: true }));
}
```

---

## Step 3 — Report format

After the regression, post a summary table in chat:

```
## QA Report — <feature> — <date>

### Scoped test
| Step | Result | Notes |
|------|--------|-------|
| ... | ✅ | |

### Regression
| Area | Check | Result | Notes |
|------|-------|--------|-------|
| Auth | Sign in | ✅ | |
| ...  | ...   | ...  | |

### Bugs filed
- None  OR  Bug #N added to bug-registry.md

### Screenshots
[inline or described]
```

Any ❌ must be fixed and re-tested before handing back. Bugs found mid-regression go into `references/bug-registry.md` immediately.

---

## Phone test items (Adam runs these — Claude cannot)

After Adam reloads Expo Go (shake → Reload):

- [ ] Back pill visible on Scan screen
- [ ] OCR: camera tap opens camera (not file picker)
- [ ] OCR: after scan, `[OCR]` prefixed lines appear in Metro terminal log
- [ ] OCR: review screen shows extracted items
- [ ] Check / uncheck item responds instantly (optimistic)
- [ ] Delete item responds instantly (optimistic)
- [ ] Add item (manual): appears instantly before Realtime fires
- [ ] Realtime sync: add on phone, confirm appears on preview browser within ~1s
- [ ] RTL: entire UI is right-to-left on a `he-IL` locale device

---

## References

- Full test matrix → `references/regression-checklist.md`
- Historical bugs → `references/bug-registry.md`
