# Adamarket — Family Grocery List App

## ⚠️ Working with Adam — Non-negotiable rules

1. **Claude's Bash tool does NOT run in Adam's terminal pane.** It runs in a hidden sandbox. Adam cannot see Bash output in his terminal — only in the chat. Never pretend otherwise.

2. **For phone testing (`npm start`):** Adam runs this himself in his terminal. Claude never runs it — Claude cannot control Adam's terminal.

3. **All visible testing happens in the preview pane (port 8082).** After every fix, use the preview tools (screenshot, click, fill, network) to prove the fix works before handing back. Never say "it should work" without showing it.

4. **Never use `run_in_background: true` or Monitor tasks** for things Adam should see. If a one-off command is needed, run it with Bash (output appears in chat) — but be clear it is not in Adam's terminal.

A shared real-time grocery list for one family, running in Expo Go on iOS + Android. UI is Hebrew-only (RTL); item names may be Hebrew or English. Photo-of-fridge-list OCR via Gemini 2.5 Flash.

@AGENTS.md

## Tech stack

| Layer | Choice |
|---|---|
| Framework | Expo SDK 54 (managed), TypeScript, expo-router (file-based) |
| Backend | Supabase (Postgres + Auth + Realtime + Storage + Edge Functions) |
| OCR | Google Gemini 2.5 Flash (free tier) via Supabase Edge Function |
| Auth | Supabase magic-link email |
| State | `@supabase/supabase-js` + small custom hooks (no Redux/Zustand) |
| Storage adapter | `@react-native-async-storage/async-storage` (Expo Go compatible) |
| Validation | `zod` |
| Hebrew fonts | Heebo via `expo-font` |

## Run commands

```bash
npm start              # Expo dev server, opens QR for Expo Go
npm run ios            # iOS simulator
npm run android        # Android emulator
npm run lint           # ESLint via expo-config

# Supabase (after `supabase login` and `supabase link --project-ref <ref>`)
supabase db push       # apply migrations to remote
supabase functions deploy ocr
supabase secrets set GEMINI_API_KEY=...
```

## Hebrew + RTL — the short version

The full ruleset lives in [`.claude/skills/react-native-hebrew-rtl/SKILL.md`](.claude/skills/react-native-hebrew-rtl/SKILL.md). Highlights:

- Force RTL globally in `app/_layout.tsx` via `I18nManager.forceRTL(true)`.
- **Never** use `marginLeft` / `marginRight` / `paddingLeft` / `paddingRight` / `left:` / `right:`. Use `marginStart` / `marginEnd` / `paddingStart` / `paddingEnd` / `start:` / `end:` instead. These auto-flip under RTL; the physical props do not.
- Mixed Hebrew/English text → render via `<BiDiText>` to keep visual order correct.
- Directional icons (back arrows, chevrons, send) → wrap in `<DirectionalIcon>` so they mirror.
- All UI strings live in `lib/i18n.ts` (Hebrew only — no runtime language switch).
- Test on a real device with system locale = `he-IL` at least once before merging.

## Project skills (`.claude/skills/`)

| Skill | When to invoke |
|---|---|
| **`qa-testing`** | **After EVERY fix or feature** — two-layer test: local preview (`preview_*` tools) + Playwright against live URL (`npm run test:e2e:vercel`). Strict visibility rule: never headless, never backgrounded. |
| `react-native-hebrew-rtl` | **Any** UI or layout work — RN-specific RTL rules, BiDi recipes, pre-merge checklist. |
| `hebrew-content-writer` | Drafting / editing Hebrew copy (button labels, errors, empty states). |
| `hebrew-rtl-best-practices` | Web RTL reference — useful for typography, bidi marks, font choices. Not RN-specific. |
| `hebrew-nlp-toolkit` | Hebrew text normalisation (NFC, niqqud stripping) for autocomplete matching. |
| `israeli-accessibility-compliance` | Hebrew `accessibilityLabel` patterns, screen reader behaviour, contrast / target sizes. |
| `hebrew-document-generator` | Not used in v1. |

## Architecture cheatsheet

- **Data model**: `households(id, name, invite_code)`, `household_members(household_id, user_id)`, `items(id, household_id, name, quantity, checked, created_by, created_at, checked_at)`. View `item_history` powers autocomplete.
- **Realtime**: Postgres `postgres_changes` channel on `items` filtered by `household_id` → `hooks/useItems.ts`.
- **OCR flow**: pick image → compress (`expo-image-manipulator`, ≤1600px) → upload to Storage `fridge-scans/` → invoke Edge Function `ocr` → review screen (multi-select, edit, delete) → **user confirms** → bulk-insert into `items`. The Edge Function NEVER writes to `items` directly.
- **Auth gate** in `app/_layout.tsx`: no session → `(auth)/sign-in`; session but no household → `(auth)/join-household`; otherwise → `(app)`.

## Never commit

- `.env` and `.env.*` — contain Supabase service-role key and Gemini API key.
- The Gemini API key in source. It lives only as a Supabase Edge Function secret (`supabase secrets set`).
- Anyone's personal photos from `fridge-scans/` (these are auto-pruned by Supabase Storage policy after 24h anyway, but never download them into the repo).

## Useful invariants

- `items.name` must be NFC-normalised + trimmed before insert (enforced by trigger).
- Every query against `items` / `household_members` is RLS-gated by household membership. Test RLS by signing in as user A and trying to read user B's household — should return 0 rows.
- OCR response is validated with `zod` server-side before returning to the client — never trust raw model output.

---

## QA — two-layer testing

After every fix or feature, Claude runs BOTH layers. Never say "it should work" without proof.

### Layer 1 — Local preview (`localhost:8082`)
Fast iteration. Uses the `preview_*` tools. Catches functional bugs early.

### Layer 2 — Playwright against live URL (`https://adamarket.vercel.app/`)
Mandatory after every Vercel deploy. Catches Vercel-specific issues that don't exist on localhost:
- Env vars not set / not baked into the bundle
- Build cache serving stale code
- CDN behaviour, real production CORS / cookies
- Accessibility regressions (`@axe-core/playwright`)

Commands (all forced `--headed --workers=1` — single visible Chromium, serial):
```bash
npm run test:e2e:local    # against localhost:8082
npm run test:e2e:vercel   # against https://adamarket.vercel.app — after every deploy
npm run test:e2e          # defaults to local
```

Specs live in `tests/e2e/`: `auth`, `list`, `scan`, `a11y`. Screenshots land in `test-results/<spec>/*.png`. The QA skill (`.claude/skills/qa-testing/SKILL.md`) documents the full protocol including the **visibility rule** (no headless, no background, no exceptions).

## QA process — preview-pane details

Claude acts as both developer and QA. After every fix, a **visible test cycle** must be completed in the preview pane (port 8082) before handing back. Never say "it should work."

### Preview pane testing protocol

1. **Start server**: `preview_start("expo-web")` → port 8082.
2. **Authenticate**: sign in or sign up a fresh test user (`claude-qa@adamarket.test` / `qatest123`) via the preview UI.
3. **Exercise the changed feature** using `preview_click`, `preview_fill`, `preview_eval`, `preview_snapshot`.
4. **Check network**: use `preview_network` to confirm the right HTTP calls were made (correct status codes, no unexpected 4xx/5xx).
5. **Screenshot every step** — each state change gets a screenshot. Attach screenshots to the QA report in the chat.
6. **For OCR specifically**: the image picker can't be driven by `preview_click` alone — use `preview_eval` to inject a `File` object into the hidden `<input type="file">` via `DataTransfer`. The fridge test photo lives at `/Users/adam_shmuel/Downloads/photo_2026-05-20 10.45.53.jpeg`. If fetching from within the browser is needed, serve it via a local CORS-enabled Python server on port 8083 (see pattern below).

### CORS image server pattern (for OCR tests)

```python
# /tmp/cors2.py — run with: python3 /tmp/cors2.py &
from http.server import HTTPServer, BaseHTTPRequestHandler
class H(BaseHTTPRequestHandler):
    def do_GET(self):
        with open('/tmp/fridge.jpg','rb') as f: data=f.read()
        self.send_response(200)
        self.send_header('Content-Type','image/jpeg')
        self.send_header('Content-Length', str(len(data)))
        self.send_header('Access-Control-Allow-Origin','*')
        self.end_headers()
        self.wfile.write(data)
    def log_message(self,*a): pass
HTTPServer(('localhost',8083),H).serve_forever()
```

Then in `preview_eval`:
```js
const blob = await fetch('http://localhost:8083/fridge.jpg').then(r => r.blob());
const file = new File([blob], 'fridge.jpg', { type: 'image/jpeg' });
const input = document.querySelector('input[type="file"]');
const dt = new DataTransfer(); dt.items.add(file);
input.files = dt.files;
input.dispatchEvent(new Event('change', { bubbles: true }));
```

### QA checklist for the OCR + scan flow

Run this checklist after any change touching `scan.tsx`, `OcrReviewList.tsx`, or the `ocr` Edge Function:

- [ ] Scan tab accessible from tab bar
- [ ] **Back pill** ("← הרשימה") visible at top of scan screen
- [ ] Back pill navigates to list tab when tapped
- [ ] Gallery button triggers file picker
- [ ] Image upload → Storage POST 200
- [ ] OCR Edge Function POST 200 (not 401/502)
- [ ] Review screen appears with all detected items
- [ ] **Header close button (×)** visible and dismisses review screen
- [ ] "הוסיפו N פריטים" confirm button adds items to the list tab
- [ ] Items appear in the list tab after confirm

### Known OCR Edge Function issue (fixed 2026-05-20)

**Bug**: `auth.getUser()` called without a token on a freshly-created client returns empty session → 401.

**Root cause**: Supabase JS v2's `auth.getUser()` without an argument looks for an internal session object. When `createClient` is initialized with global `authorization` headers, the auth module does NOT automatically extract the token from those headers for `getUser()`.

**Fix** (in `supabase/functions/ocr/index.ts`): Use the service-role admin client and pass the token explicitly:
```ts
const adminClient = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
});
const { data: userData } = await adminClient.auth.getUser(token); // ← explicit token
```
This also removes the dependency on `SUPABASE_ANON_KEY` (which cannot be manually overridden since Supabase reserves the `SUPABASE_*` namespace for auto-injection).
