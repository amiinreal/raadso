-- Migration to ensure invited_email column exists in tenant_members
ALTER TABLE tenant_members ADD COLUMN invited_email TEXT;
