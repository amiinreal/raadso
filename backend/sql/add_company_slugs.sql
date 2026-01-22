-- Add slug column to tenants table
ALTER TABLE tenants 
ADD COLUMN slug VARCHAR(255) UNIQUE;

-- Create index on slug for faster lookups
CREATE INDEX idx_tenants_slug ON tenants(slug);

-- Function to generate slug from company name
CREATE OR REPLACE FUNCTION generate_slug(company_name TEXT) 
RETURNS TEXT AS $$
BEGIN
  RETURN lower(regexp_replace(regexp_replace(company_name, '[^a-zA-Z0-9\s-]', '', 'g'), '\s+', '-', 'g'));
END;
$$ LANGUAGE plpgsql;

-- Generate slugs for existing companies
UPDATE tenants 
SET slug = generate_slug(company_name) || '-' || id
WHERE slug IS NULL AND company_name IS NOT NULL;

-- Make slug NOT NULL after populating
ALTER TABLE tenants 
ALTER COLUMN slug SET NOT NULL;
