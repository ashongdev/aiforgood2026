-- Add email column to user_profiles so admins can list scorekeepers without auth.users access.
-- Run this in the Supabase SQL editor.

ALTER TABLE public.user_profiles
  ADD COLUMN IF NOT EXISTS email text;
