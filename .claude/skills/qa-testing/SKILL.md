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

## ⚠️ Visibility rule — non-negotiable

Every test must be visible to Adam. Claude MUST NOT:

- Run Playwright with `--headed=false`, headless mode, or any flag that omits `--headed`
- Use `run_in_background: true` for any test command
- Pipe test output to a log file Adam can't see
- Use `&` to background test processes
- Use `Monitor` or any other "fire and forget" pattern for tests

Tests run in **two visible ways**:

1. **Claude runs them via `Bash` (foreground)** — Bash output streams into chat; screenshots are captured to `test-results/<spec>/*.png` and read back inline via the `Read` tool. The browser window itself is invisible to Adam in this mode (Bash runs in a hidden sandbox), but every meaningful state has a screenshot shown in chat.
2. **Adam runs them himself in his terminal** — `npm run test:e2e` opens a real headed Chromium window that walks through the flow live. Use this when the screenshot trail alone isn't enough, or when Adam asks to watch.

If a Playwright test must run, it runs FOREGROUND with `screenshot: 'on'`. No exceptions.

---

## Two-layer QA

Every fix or feature requires BOTH layers:

| Layer | Tool | Catches | Speed |
|-------|------|---------|-------|
| **1. Local preview** (`localhost:8082`) | `preview_*` tools | Functional bugs, UI bugs, optimistic-update timing | Fast (seconds) |
| **2. Live URL** (`https://adamarket.vercel.app/`) | Playwright + axe-core | Env-var bugs, build-cache issues, CDN behaviour, real CORS, accessibility regressions | Slower (~1 min per spec) |

Run Layer 1 during iteration. Run Layer 2 after every Vercel deploy.

### Live-URL commands

```bash
npm run test:e2e:local    # Playwright against localhost:8082 — single visible Chromium
npm run test:e2e:vercel   # Playwright against adamarket.vercel.app — production smoke
npm run test:e2e          # defaults to local
```

All three force `--headed --workers=1` — visibility rule.

### What the Playwright specs cover

| Spec | Asserts |
|---|---|
| `tests/e2e/auth.spec.ts` | Sign-in form loads with Hebrew copy, fill+submit reaches list screen |
| `tests/e2e/list.spec.ts` | Add → check → uncheck → delete (optimistic updates) |
| `tests/e2e/scan.spec.ts` | Tab → scan → gallery upload (`fridge.jpg`) → OCR review → confirm → items in list |
| `tests/e2e/a11y.spec.ts` | `@axe-core/playwright` on sign-in, list, scan, settings — zero serious/critical |

### Canonical test image — `tests/fixtures/fridge.jpg`

**Always use this image for OCR tests. Never substitute a different file in test code.**

- Path: `tests/fixtures/fridge.jpg` (committed to the repo — single source of truth)
- Format: JPEG, 960×1280
- Content: real handwritten Hebrew grocery list photographed on a fridge
- Expected OCR extraction (5 items): **חלב, לחמניות, מוצרלה, טונה, ביצים**
- Used by: `tests/e2e/scan.spec.ts` (imported via `path.resolve(__dirname, '..', 'fixtures', 'fridge.jpg')`)

If Adam supplies a new test image (better lighting, harder handwriting, more items, etc.):
1. Overwrite `tests/fixtures/fridge.jpg` with the new file (same filename — keep the path stable)
2. Update the "Expected OCR extraction" list above to match what the model returns from the new image
3. Re-run `npm run test:e2e:vercel` to confirm the spec still passes
4. Commit both the new image and the updated SKILL.md together

**Do not** add a second fixture file or hardcode a different path in any spec. The single fixture is the contract — change the file, not the references.

### Reading screenshots back

After a Bash run finishes, screenshots live at:
```
test-results/auth/01-initial-load.png
test-results/list/02-added.png
test-results/scan/02-review-screen.png
test-results/a11y/03-scan.png
…
```
Use the `Read` tool on each path to embed it in chat. Never describe a result without showing the screenshot.

---

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
