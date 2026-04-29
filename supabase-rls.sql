-- ============================================================
-- The Edge — Row Level Security for accounts table
-- Run this in: Supabase → SQL Editor → New query → Run
-- ============================================================
--
-- After running this:
-- 1. Each user can only read/write their OWN rows
-- 2. The admin view uses api/admin-data.js (service role) — not affected by RLS
-- 3. Add ADMIN_EMAILS=your@email.com to Vercel env vars (replaces hardcoded email)
-- ============================================================

-- Enable RLS
ALTER TABLE accounts ENABLE ROW LEVEL SECURITY;

-- SELECT: users see only their own rows
CREATE POLICY "Users can view own accounts"
  ON accounts FOR SELECT
  USING (auth.uid() = user_id);

-- INSERT: users can only insert rows for themselves
CREATE POLICY "Users can insert own accounts"
  ON accounts FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- UPDATE: users can only update their own rows
CREATE POLICY "Users can update own accounts"
  ON accounts FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- DELETE: users can only delete their own rows
CREATE POLICY "Users can delete own accounts"
  ON accounts FOR DELETE
  USING (auth.uid() = user_id);

-- ============================================================
-- Verify it worked:
-- SELECT schemaname, tablename, policyname, cmd, qual
-- FROM pg_policies WHERE tablename = 'accounts';
-- ============================================================
