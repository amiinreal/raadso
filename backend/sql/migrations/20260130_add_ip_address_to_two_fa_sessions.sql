-- Migration: Add ip_address column to two_fa_sessions if missing
ALTER TABLE two_fa_sessions
  ADD COLUMN IF NOT EXISTS ip_address TEXT;
