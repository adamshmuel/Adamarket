# Adamarket — Bug Registry

All confirmed bugs, root causes, and fixes. Updated after every QA cycle.

---

| # | Date | Bug | Root cause | Fix | File(s) |
|---|------|-----|-----------|-----|---------|
| 1 | 2026-05 | Magic link → returned to sign-in page after click | Auth redirect URL not configured for Expo deep links; link opened browser instead of app | Switched to email + password auth | Supabase config |
| 2 | 2026-05 | Generic error shown for `email_not_confirmed` | Error handler only checked `includes('invalid')`; did not match confirmation strings | Added `includes('confirm')` branch + new i18n string | `app/(auth)/sign-in.tsx` |
| 3 | 2026-05 | RLS infinite recursion on `household_members` | `hm_select_own` policy queried itself via subselect | Policy rewritten: `user_id = auth.uid()` with no subquery | `supabase/migrations/0002_fix_hm_rls.sql` |
| 4 | 2026-05 | App stuck on join-household screen after reload | expo-router preserves last URL; auth gate only existed in `index.tsx`, not in the `(auth)` layout | Added auth gate redirect to `(auth)/_layout.tsx` | `app/(auth)/_layout.tsx` |
| 5 | 2026-05 | Realtime channel conflict — scan tab crashed or duplicated items | Two concurrent `useItems` instances (list tab + scan tab) shared the same hardcoded channel name | Channel name assigned via `useRef(Math.random().toString(36))` per hook instance | `hooks/useItems.ts` |
| 6 | 2026-05 | OCR returned 0 items from Gemini | Gemini 2.5 Flash with thinking enabled puts reasoning text in `parts[0]`; JSON lands in `parts[1+]`. Code only read `parts[0]`, got reasoning text, JSON.parse failed silently | Added `thinkingBudget: 0` to disable thinking; added defensive loop over all parts to find the first valid JSON part | `supabase/functions/ocr/index.ts` |
| 7 | 2026-05 | OCR Edge Function returned HTTP 401 Unauthorized | `supabase.auth.getUser()` called without token on a freshly-created client finds no session (client has no stored auth). Setting global authorization headers does not make `getUser()` pick up the token. Also: `SUPABASE_*` env var namespace is reserved and auto-injected by Supabase on deploy — manual override silently ignored | Use `adminClient.auth.getUser(token)` with explicit bearer token extracted from the Authorization header, using a service-role key client | `supabase/functions/ocr/index.ts` |
| 8 | 2026-05 | Check / delete did nothing visually after tap | `toggleChecked` and `deleteItem` only updated React state via Supabase Realtime events. If Realtime was slow (>500ms), taps appeared no-op even though PATCH/DELETE returned 204 | Added optimistic UI updates: React state mutated immediately before the DB call; reverted on DB error | `hooks/useItems.ts` |
| 9 | 2026-05 | OCR failing on phone — exact cause unknown | `scan.tsx` catch block had zero `console.error` calls; every error silently became a generic "לא הצלחנו לזהות פריטים" toast. Also: phone was running a stale cached Expo Go bundle (no back pill = old code) | Added `[OCR]` prefixed `console.error` at storage upload failure, Edge Function error, and outer catch; Adam must shake phone → Reload to get latest bundle | `app/(app)/scan.tsx` |
| 10 | 2026-05 | Items added via OCR confirm did not appear until Realtime fired | `addItems` (and `addItem`) had no optimistic update — UI waited for Supabase Realtime INSERT event (~200–500ms lag). For OCR confirm (multiple items), this felt like the confirm button did nothing | Added optimistic updates: temp items with `temp-{timestamp}-{i}` IDs prepended immediately; replaced with real DB rows on insert success; reverted on error. Realtime dedup guard (`!items.find(it => it.id === row.id)`) prevents duplicates | `hooks/useItems.ts` |

---

## How to add a new entry

Copy this template and append to the table:

```
| N | YYYY-MM | Short one-line description | Root cause explanation | What was changed | `path/to/file.ts` |
```

Include the PR / commit SHA if applicable.
