-- Fix infinite recursion in household_members RLS policy.
-- The original policy referenced household_members from within itself.
-- user_id = auth.uid() is sufficient: each user only needs to see their own rows.

drop policy if exists hm_select_own on household_members;

create policy hm_select_own on household_members
  for select using (user_id = auth.uid());
