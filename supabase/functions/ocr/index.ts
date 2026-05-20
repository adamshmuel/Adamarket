// deno-lint-ignore-file no-explicit-any
// Adamarket — OCR Edge Function
//
// Pipeline: authenticated client → upload image to Storage → call this function
// with the storage path → we download the bytes, ask Gemini 2.5 Flash to extract
// grocery items as JSON, validate with zod, return to the client.
//
// The client renders a review screen; ONLY user-approved items are bulk-inserted
// into `items`. This function never writes to `items` itself.

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0';
import { z } from 'https://esm.sh/zod@3.23.8';

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const GEMINI_API_KEY = Deno.env.get('GEMINI_API_KEY')!;

const GEMINI_URL =
  'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent';

const SYSTEM_INSTRUCTION = `
You are an OCR system specialised in handwritten Hebrew shopping lists.
The image is a photo of a paper grocery list. Most items are in Hebrew handwriting;
some may be in English (brand names, "Coca Cola", "Tnuva"). Mixed scripts on the
same line are common.

Task: extract every grocery item. Skip non-grocery text such as dates, names,
phone numbers, and doodles.

For each item:
- name_raw: exactly as written, preserving the original script.
- name_normalized: lowercased, niqqud (Hebrew vowel points) and whitespace stripped.
- language: "he" if the name is mostly Hebrew letters, "en" if mostly Latin,
  otherwise "mixed".
- quantity: a free-text quantity (e.g. "2", "1 ק\"ג", "חצי תריסר") or null if not given.
- confidence: "high" if the handwriting is clear and unambiguous, "medium" if
  legible but a few characters are guesses, "low" if substantial guessing is
  required.

Be conservative — if a token might not be a grocery item, OMIT it rather than
guess. The user reviews and edits before items are saved, so misses are cheaper
than hallucinations.

Return strictly the JSON object specified by the schema. No prose, no markdown.
`.trim();

const RESPONSE_SCHEMA = {
  type: 'object',
  properties: {
    items: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          name_raw: { type: 'string' },
          name_normalized: { type: 'string' },
          language: { type: 'string', enum: ['he', 'en', 'mixed'] },
          quantity: { type: 'string', nullable: true },
          confidence: { type: 'string', enum: ['high', 'medium', 'low'] },
        },
        required: ['name_raw', 'name_normalized', 'language', 'confidence'],
      },
    },
    warnings: { type: 'array', items: { type: 'string' } },
  },
  required: ['items', 'warnings'],
};

const OcrItemZ = z.object({
  name_raw: z.string().min(1).max(120),
  name_normalized: z.string().min(1).max(120),
  language: z.enum(['he', 'en', 'mixed']),
  quantity: z.string().max(60).nullable().optional(),
  confidence: z.enum(['high', 'medium', 'low']),
});
const OcrResponseZ = z.object({
  items: z.array(OcrItemZ).max(200),
  warnings: z.array(z.string()).max(20),
});

const RequestBodyZ = z.object({
  storage_path: z.string().min(1).max(500),
});

type JsonResp = (body: unknown, status?: number) => Response;
const json: JsonResp = (body, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: {
      'content-type': 'application/json',
      'access-control-allow-origin': '*',
      'access-control-allow-headers': 'authorization, content-type, x-client-info, apikey',
      'access-control-allow-methods': 'POST, OPTIONS',
    },
  });

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return json({});
  if (req.method !== 'POST') return json({ error: 'method not allowed' }, 405);

  try {
    // ---- 1. Authenticate caller ---------------------------------------------
    const authHeader = req.headers.get('authorization') ?? '';
    if (!authHeader.startsWith('Bearer ')) {
      return json({ error: 'unauthorized' }, 401);
    }
    const token = authHeader.slice('Bearer '.length);

    // Use the service-role admin client for everything — it verifies the
    // caller's JWT explicitly via auth.getUser(token), which is the correct
    // pattern for Edge Functions (avoids the SUPABASE_ANON_KEY format issues).
    const adminClient = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
      auth: { autoRefreshToken: false, persistSession: false },
    });
    const { data: userData, error: userErr } = await adminClient.auth.getUser(token);
    if (userErr || !userData.user) {
      console.error('auth.getUser error', userErr?.message);
      return json({ error: 'unauthorized' }, 401);
    }
    const userId = userData.user.id;

    // ---- 2. Validate request body -------------------------------------------
    const body = await req.json().catch(() => null);
    const parsed = RequestBodyZ.safeParse(body);
    if (!parsed.success) return json({ error: 'bad request' }, 400);
    const { storage_path } = parsed.data;

    // Enforce path: must be inside this user's folder.
    if (!storage_path.startsWith(`${userId}/`)) {
      return json({ error: 'forbidden' }, 403);
    }

    // ---- 3. Download image from Storage with service-role client ------------
    // adminClient is already initialised above.
    const { data: file, error: dlErr } = await adminClient.storage
      .from('fridge-scans')
      .download(storage_path);
    if (dlErr || !file) {
      return json({ error: 'image not found', detail: dlErr?.message }, 404);
    }
    const bytes = new Uint8Array(await file.arrayBuffer());
    const base64 = encodeBase64(bytes);

    // ---- 4. Call Gemini -----------------------------------------------------
    const geminiBody = {
      systemInstruction: { parts: [{ text: SYSTEM_INSTRUCTION }] },
      contents: [
        {
          role: 'user',
          parts: [
            { text: 'Extract grocery items from this image.' },
            { inline_data: { mime_type: file.type || 'image/jpeg', data: base64 } },
          ],
        },
      ],
      generationConfig: {
        response_mime_type: 'application/json',
        response_schema: RESPONSE_SCHEMA,
        temperature: 0.2,
        // Disable thinking: Gemini 2.5 Flash has thinking on by default which
        // puts reasoning text in parts[0] and JSON in parts[1+], breaking the
        // naive parts[0] read. Disabling it keeps exactly one JSON part.
        thinkingConfig: { thinkingBudget: 0 },
      },
    };

    const geminiResp = await fetch(`${GEMINI_URL}?key=${GEMINI_API_KEY}`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(geminiBody),
    });

    if (geminiResp.status === 429) {
      return json({ error: 'rate_limited' }, 429);
    }
    if (!geminiResp.ok) {
      const text = await geminiResp.text();
      return json({ error: 'gemini_error', status: geminiResp.status, detail: text }, 502);
    }

    const geminiJson: any = await geminiResp.json();

    // Scan all parts for the JSON payload — Gemini 2.5 with thinking enabled
    // puts reasoning text in parts[0] and JSON in a later part. We search
    // defensively even though thinking is disabled above (belt-and-suspenders).
    const parts: any[] = geminiJson?.candidates?.[0]?.content?.parts ?? [];
    console.log('Gemini parts count:', parts.length, parts.map((p: any) => typeof p.text === 'string' ? p.text.slice(0, 80) : '(no text)'));

    let raw: unknown;
    let foundJson = false;
    for (const part of parts) {
      if (typeof part.text !== 'string') continue;
      try {
        raw = JSON.parse(part.text);
        foundJson = true;
        break;
      } catch {
        // this part is reasoning text, not JSON — keep looking
      }
    }
    if (!foundJson) {
      return json({ error: 'unexpected_response', detail: parts.map((p: any) => p.text?.slice(0, 200)) }, 502);
    }
    const validated = OcrResponseZ.safeParse(raw);
    if (!validated.success) {
      // Return an empty safe response rather than crashing the UI.
      return json({ items: [], warnings: ['model returned malformed data'] }, 200);
    }

    // ---- 5. Light server-side normalisation guard ---------------------------
    const items = validated.data.items.map((it) => ({
      ...it,
      name_raw: it.name_raw.trim(),
      name_normalized: stripHebrewDiacritics(it.name_normalized.trim().toLowerCase()),
      quantity: it.quantity?.trim() || null,
    }));

    return json({ items, warnings: validated.data.warnings });
  } catch (err) {
    console.error('ocr handler error', err);
    return json({ error: 'internal_error' }, 500);
  }
});

// Mirror of lib/hebrew.ts normalisation, but for Deno.
const HEBREW_DIACRITICS_RE = /[֑-ֽֿׁ-ׂׄ-ׇׅ]/g;
function stripHebrewDiacritics(s: string): string {
  return s.replace(HEBREW_DIACRITICS_RE, '').replace(/\s+/g, ' ').trim();
}

function encodeBase64(bytes: Uint8Array): string {
  // Deno does not have a native btoa for Uint8Array; build a binary string.
  let binary = '';
  const chunk = 0x8000;
  for (let i = 0; i < bytes.length; i += chunk) {
    binary += String.fromCharCode(...bytes.subarray(i, i + chunk));
  }
  return btoa(binary);
}
