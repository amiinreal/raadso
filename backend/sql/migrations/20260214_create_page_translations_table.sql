-- Create page_translations table for storing UI translations in database
CREATE TABLE IF NOT EXISTS page_translations (
  id SERIAL PRIMARY KEY,
  page_name VARCHAR(100) NOT NULL,
  language_code VARCHAR(10) NOT NULL,
  translation_key VARCHAR(255) NOT NULL,
  translation_value TEXT NOT NULL,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(page_name, language_code, translation_key)
);

CREATE INDEX IF NOT EXISTS idx_page_translations_page_lang ON page_translations(page_name, language_code);
CREATE INDEX IF NOT EXISTS idx_page_translations_key ON page_translations(translation_key);
