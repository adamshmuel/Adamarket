# Adamarket — Full Regression Checklist

Run every row after every fix or feature. Mark ✅ / ❌ / ⚠️ in the QA report.

---

## Auth

| # | Check | How to test in preview |
|---|-------|------------------------|
| A1 | Sign-in screen loads | `preview_screenshot` — shows email input + "התחברו" button |
| A2 | Empty email shows validation | `preview_click` "התחברו" with empty field → error message appears |
| A3 | Valid email submits | `preview_fill` email → `preview_click` button → success / confirm-email message |
| A4 | Authenticated users redirect to list | After sign-in, URL changes to `/(app)` and list screen loads |
| A5 | Sign out clears session | Settings tab → sign out → redirected to sign-in |

---

## Household

| # | Check | How to test in preview |
|---|-------|------------------------|
| H1 | Join-household screen loads when no household | Sign in as user with no household → join screen visible |
| H2 | Create household | Enter name → "צרו משק בית" → list screen loads |
| H3 | Invite code visible in settings | Settings tab → 6-char code shown (e.g. `MILK-42`) |
| H4 | Join with code | Second session → enter invite code → joins same household, list shared |

---

## List — core

| # | Check | How to test in preview |
|---|-------|------------------------|
| L1 | List loads with existing items | After auth, items from DB appear |
| L2 | Empty state shown when no items | Delete all items → cart icon + empty message visible |
| L3 | Add item (tap +) | `preview_fill` item name → `preview_click` + button → item appears **instantly** (before Supabase returns) |
| L4 | Add item (Enter key) | `preview_fill` name → `preview_eval` Enter keypress → item appears instantly |
| L5 | Duplicate prevention | Same name twice → second insert deduped or shown (check UX decision) |
| L6 | Item appears unchecked in "לקנייה" section | Added items go to top of unchecked section |
| L7 | Check item | Tap checkbox → item moves to "נרכש" section **instantly** (optimistic) |
| L8 | Uncheck item | Tap checked item → moves back to "לקנייה" **instantly** (optimistic) |
| L9 | Delete item | Tap × → item disappears **instantly** (optimistic), gone from DB |
| L10 | Revert on error | Simulate DB error (kill network) → check/delete → item reverts to previous state |

---

## Autocomplete

| # | Check | How to test in preview |
|---|-------|------------------------|
| AC1 | Dropdown appears after typing | Type 2+ chars in add-item input → suggestion dropdown appears |
| AC2 | Hebrew prefix match | Previously added "חלב" → type "ח" → "חלב" appears in suggestions |
| AC3 | Niqqud-insensitive match | Type "חָ" (with dagesh) → "חלב" still suggested (normalization works) |
| AC4 | English prefix match | Previously added "Tnuva" → type "Tn" → "Tnuva" appears |
| AC5 | Tap suggestion fills input | Tap suggestion → input filled with item name, ready to confirm |
| AC6 | Dropdown dismissed on blur | Click elsewhere → dropdown closes |

---

## Scan (OCR)

| # | Check | How to test in preview |
|---|-------|------------------------|
| S1 | Scan tab accessible | Tab bar → scan icon → scan screen loads |
| S2 | Back pill visible | "← הרשימה" green pill at top of scan screen |
| S3 | Back pill navigates | Tap pill → list tab shown (no dead end) |
| S4 | Gallery button triggers file picker | `preview_click` "בחרו מהגלריה" → browser file picker dialog opens |
| S5 | Image selected shows processing state | Inject test image (see SKILL.md snippet) → spinner + photo preview visible |
| S6 | Storage upload succeeds | `preview_network` → POST to `storage/v1/object/fridge-scans/` returns 200 |
| S7 | Edge function called | `preview_network` → POST to `/functions/v1/ocr` returns 200 |
| S8 | Review screen opens | OCR completes → review screen shows extracted items with checkboxes |
| S9 | Review header × closes | Tap × → back to scan idle state |
| S10 | Low-confidence items flagged | Items with `confidence: 'low'` show yellow background + warning icon |
| S11 | Item name editable | `preview_fill` into name field → text updates |
| S12 | Item quantity editable | `preview_fill` into quantity field → text updates |
| S13 | Checkbox toggle | Click checkbox → item deselected (unchecked) → re-click → selected |
| S14 | Select all / deselect all | Toolbar buttons → all checkboxes on/off |
| S15 | Delete selected removes rows | Select some → "מחק נבחרים" → only selected rows removed from list |
| S16 | Confirm disabled when 0 selected | Deselect all → confirm button greyed out / disabled |
| S17 | Confirm adds items to list | Select items → confirm → items appear **instantly** in list tab (optimistic) |
| S18 | Empty OCR state | If OCR returns 0 items → review shows empty state, not crash |
| S19 | Rate-limit error shows Hebrew message | Simulate 429 → "נסה שוב בעוד דקה" (or equivalent) shown |
| S20 | Upload error shows Hebrew message | Bad path / no auth → error box with Hebrew error text visible |
| S21 | Console.error logged on failure | `preview_console_logs` → `[OCR]` prefixed error appears on any failure |

---

## Settings

| # | Check | How to test in preview |
|---|-------|------------------------|
| ST1 | Settings tab loads | Tab bar → settings icon → screen loads with household name |
| ST2 | Invite code displayed | 6-char code visible and copyable |
| ST3 | Sign out works | Tap sign out → session cleared → redirected to sign-in |

---

## Navigation

| # | Check | How to test in preview |
|---|-------|------------------------|
| N1 | All 3 tabs switch correctly | Tap each tab → correct screen renders |
| N2 | No dead ends | Every screen has a back button or clear exit path |
| N3 | URL/route state correct | After navigating deep, reload preview → lands at same logical screen (or auth gate) |

---

## Realtime sync

| # | Check | How to test in preview |
|---|-------|------------------------|
| R1 | Add on preview → visible in DB | Add item → check Supabase dashboard → row present |
| R2 | DB change propagates to preview | Insert row directly in Supabase SQL editor → item appears in preview within ~2s |
| R3 | Check state syncs | Toggle checked in DB → preview updates |
| R4 | Delete syncs | Delete row in DB → item disappears from preview |

---

## RTL / Accessibility (smoke)

| # | Check | How to test in preview |
|---|-------|------------------------|
| RTL1 | Layout direction right-to-left | `preview_screenshot` — text flows from right, inputs align right |
| RTL2 | Back arrow mirrors | Scan screen back pill arrow points left (→) in RTL |
| RTL3 | No truncation | Hebrew labels uncut in all buttons and inputs |
| A11Y1 | No console accessibility warnings | `preview_console_logs` — no a11y prop warnings |
