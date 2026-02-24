-- Migration to ensure permissions column exists in tenant_members
ALTER TABLE tenant_members ADD COLUMN permissions JSONB DEFAULT '{}' ;
