// Hand-written types matching the schema in supabase/migrations/0001_init.sql.
// Replace with `supabase gen types typescript --linked > lib/database.types.ts`
// once the CLI is linked to the project, then re-export from there.

export type Household = {
  id: string;
  name: string;
  invite_code: string;
  created_at: string;
};

export type HouseholdMember = {
  household_id: string;
  user_id: string;
  joined_at: string;
};

export type Item = {
  id: string;
  household_id: string;
  name: string;
  name_normalized: string;
  quantity: string | null;
  checked: boolean;
  created_by: string;
  created_at: string;
  checked_at: string | null;
};

export type ItemHistoryRow = {
  household_id: string;
  name_normalized: string;
  name: string;
  last_used_at: string;
};

// OCR — matches the JSON schema the Gemini Edge Function is constrained to.
export type OcrExtractedItem = {
  name_raw: string;
  name_normalized: string;
  language: 'he' | 'en' | 'mixed';
  quantity: string | null;
  confidence: 'high' | 'medium' | 'low';
};

export type OcrResponse = {
  items: OcrExtractedItem[];
  warnings: string[];
};
