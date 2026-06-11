-- Add temp_password column to user_profiles.
-- Stores the last admin-generated password so admins can reveal it later.
-- This is intentionally plaintext: it represents the credential the admin
-- issued, not the user's live auth password (which is bcrypt-hashed).
-- Once a user changes their own password, temp_password becomes stale.
-- Run in the Supabase SQL Editor.

ALTER TABLE public.user_profiles
  ADD COLUMN IF NOT EXISTS temp_password text;
