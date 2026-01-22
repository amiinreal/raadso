-- Create master languages table
CREATE TABLE IF NOT EXISTS master_languages (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    iso_639_1 VARCHAR(5),
    iso_639_3 VARCHAR(5)
);

-- Create master nationalities table
CREATE TABLE IF NOT EXISTS master_nationalities (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL UNIQUE
);

-- Create language_nationalities many-to-many relationship table
CREATE TABLE IF NOT EXISTS language_nationalities (
    language_id INT REFERENCES master_languages(id) ON DELETE CASCADE,
    nationality_id INT REFERENCES master_nationalities(id) ON DELETE CASCADE,
    PRIMARY KEY (language_id, nationality_id)
);

-- Seed Languages
INSERT INTO master_languages (name, iso_639_1, iso_639_3) VALUES
('Afrikaans', 'af', NULL),
('Albanian', 'sq', NULL),
('Amharic', 'am', NULL),
('Arabic', 'ar', NULL),
('Armenian (Eastern)', 'hy', NULL),
('Armenian (Western)', NULL, 'hyw'),
('Azerbaijani (Azeri)', 'az', NULL),
('Bassa', NULL, 'bsq'),
('Belarusian', 'be', NULL),
('Bengali', 'bn', NULL),
('Bosnian', 'bs', NULL),
('Braille', NULL, NULL),
('Bulgarian', 'bg', NULL),
('Burmese', 'my', NULL),
('Cambodian (Khmer)', 'km', NULL),
('Cape Verde Creole', NULL, 'kea'),
('Cebuano', NULL, 'ceb'),
('Chinese (Simplified)', 'zh', NULL),
('Chinese (Traditional)', 'zh', NULL),
('Chuukese', NULL, 'chk'),
('Croatian', 'hr', NULL),
('Czech', 'cs', NULL),
('Danish', 'da', NULL),
('Dari', NULL, 'prs'),
('Dutch', 'nl', NULL),
('English', 'en', NULL),
('Estonian', 'et', NULL),
('Farsi (Persian)', 'fa', NULL),
('Finnish', 'fi', NULL),
('Flemish', 'nl', NULL),
('French (Canada)', 'fr', NULL),
('French (France)', 'fr', NULL),
('Fulani', 'ff', NULL),
('Georgian', 'ka', NULL),
('German', 'de', NULL),
('Greek', 'el', NULL),
('Gujarati', 'gu', NULL),
('Haitian Creole', 'ht', NULL),
('Hakha Chin', NULL, 'cnh'),
('Hakka (Chinese)', NULL, 'hak'),
('Hebrew', 'he', NULL),
('Hindi', 'hi', NULL),
('Hmong', NULL, 'hmn'),
('Hungarian', 'hu', NULL),
('Icelandic', 'is', NULL),
('Igbo', 'ig', NULL),
('Ilocano', NULL, 'ilo'),
('Ilonggo (Hiligaynon)', NULL, 'hil'),
('Indonesian', 'id', NULL),
('Italian', 'it', NULL),
('Japanese', 'ja', NULL),
('Javanese', 'jv', NULL),
('Kannada', 'kn', NULL),
('Karen', NULL, 'kar'),
('Kazakh', 'kk', NULL),
('Kinyarwanda', 'rw', NULL),
('Kirundi', 'rn', NULL),
('Korean', 'ko', NULL),
('Kurdish (Kurmanji)', 'ku', NULL),
('Kurdish (Sorani)', NULL, 'ckb'),
('Kyrgyz', 'ky', NULL),
('Lao', 'lo', NULL),
('Latvian', 'lv', NULL),
('Lithuanian', 'lt', NULL),
('Macedonian', 'mk', NULL),
('Malay (Malaysian)', 'ms', NULL),
('Mandinka', NULL, 'mnk'),
('Marathi', 'mr', NULL),
('Marshallese', 'mh', NULL),
('Mien', NULL, 'pcv'),
('Mongolian', 'mn', NULL),
('Montenegrin', NULL, 'cnr'),
('Navajo', 'nv', NULL),
('Nepali', 'ne', NULL),
('Norwegian', 'no', NULL),
('Oromo', 'om', NULL),
('Pashto', 'ps', NULL),
('Polish', 'pl', NULL),
('Portuguese (Brazil)', 'pt', NULL),
('Portuguese (Portugal)', 'pt', NULL),
('Punjabi', 'pa', NULL),
('Rohingya', NULL, 'rhg'),
('Romanian (Moldovan)', 'ro', NULL),
('Russian', 'ru', NULL),
('Serbian', 'sr', NULL),
('Slovak', 'sk', NULL),
('Slovenian', 'sl', NULL),
('Somali (Af-Maxaa Tiri)', 'so', 'som'),
('Somali (Af-Maay)', NULL, 'ymm'),
('Spanish (Castilian)', 'es', NULL),
('Spanish (Latin American)', 'es', NULL),
('Spanish (Other Varieties)', 'es', NULL),
('Swahili', 'sw', NULL),
('Swedish', 'sv', NULL),
('Tagalog', 'tl', NULL),
('Tamil', 'ta', NULL),
('Telugu', 'te', NULL),
('Thai', 'th', NULL),
('Tibetan', 'bo', NULL),
('Tigrinya', 'ti', NULL),
('Turkish', 'tr', NULL),
('Ukrainian', 'uk', NULL),
('Urdu', 'ur', NULL),
('Uzbek', 'uz', NULL),
('Vietnamese', 'vi', NULL),
('Wolof', 'wo', NULL),
('Yoruba', 'yo', NULL)
ON CONFLICT DO NOTHING;

-- Seed Nationalities
INSERT INTO master_nationalities (name) VALUES
('Afghan'),
('Albanian'),
('American'),
('Arab'),
('Armenian'),
('Azerbaijani'),
('Bangladeshi'),
('Belgian'),
('Bosnian'),
('Brazilian'),
('British'),
('Bulgarian'),
('Burmese'),
('Cambodian'),
('Canadian'),
('Cape Verdean'),
('Chinese'),
('Croatian'),
('Czech'),
('Danish'),
('Dutch'),
('Eritrean'),
('Ethiopian'),
('Finnish'),
('French'),
('Georgian'),
('German'),
('Greek'),
('Haitian'),
('Hungarian'),
('Icelandic'),
('Indian'),
('Indonesian'),
('Iranian'),
('Iraqi'),
('Israeli'),
('Italian'),
('Japanese'),
('Kenyan'),
('Korean'),
('Laotian'),
('Latvian'),
('Lithuanian'),
('Malaysian'),
('Moldovan'),
('Mongolian'),
('Nepalese'),
('Nigerian'),
('Norwegian'),
('Pakistani'),
('Polish'),
('Portuguese'),
('Romanian'),
('Russian'),
('Rwandan'),
('Senegalese'),
('Serbian'),
('Slovak'),
('Slovenian'),
('Somali'),
('Spanish'),
('Sri Lankan'),
('Swedish'),
('Syrian'),
('Thai'),
('Turkish'),
('Ukrainian'),
('Uzbek'),
('Vietnamese'),
('Yemeni')
ON CONFLICT (name) DO NOTHING;

-- Seed language-nationality relationships
-- Somali
INSERT INTO language_nationalities (language_id, nationality_id)
SELECT l.id, n.id
FROM master_languages l, master_nationalities n
WHERE l.name IN ('Somali (Af-Maxaa Tiri)', 'Somali (Af-Maay)')
AND n.name = 'Somali'
ON CONFLICT DO NOTHING;

-- English
INSERT INTO language_nationalities (language_id, nationality_id)
SELECT l.id, n.id
FROM master_languages l
JOIN master_nationalities n ON n.name IN ('American','British','Canadian')
WHERE l.name = 'English'
ON CONFLICT DO NOTHING;

-- Arabic
INSERT INTO language_nationalities (language_id, nationality_id)
SELECT l.id, n.id
FROM master_languages l
JOIN master_nationalities n ON n.name IN ('Arab','Syrian','Yemeni','Iraqi')
WHERE l.name = 'Arabic'
ON CONFLICT DO NOTHING;
