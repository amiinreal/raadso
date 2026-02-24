-- Fix is_admin column name (remove trailing space)
ALTER TABLE users RENAME COLUMN "is_admin " TO is_admin;
