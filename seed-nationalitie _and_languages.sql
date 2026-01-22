Tables schema
languages
CREATE TABLE languages (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    iso_639_1 VARCHAR(5),
    iso_639_3 VARCHAR(5)
);

nationalities
CREATE TABLE nationalities (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL UNIQUE
);

language_nationalities (many-to-many)
CREATE TABLE language_nationalities (
    language_id INT REFERENCES languages(id) ON DELETE CASCADE,
    nationality_id INT REFERENCES nationalities(id) ON DELETE CASCADE,
    PRIMARY KEY (language_id, nationality_id)
);

2️⃣ Seed: Languages (clean + corrected)
INSERT INTO languages (name, iso_639_1, iso_639_3) VALUES
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

-- ✅ Somali (FINAL)
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
('Yoruba', 'yo', NULL);

3️⃣ Seed: Nationalities (core set, expandable)
INSERT INTO nationalities (name) VALUES
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
('Yemeni');

4️⃣ Relations (example mappings – expand as needed)
-- Somali
INSERT INTO language_nationalities
SELECT l.id, n.id
FROM languages l, nationalities n
WHERE l.name IN ('Somali (Af-Maxaa Tiri)', 'Somali (Af-Maay)')
AND n.name = 'Somali';

-- English
INSERT INTO language_nationalities
SELECT l.id, n.id
FROM languages l
JOIN nationalities n ON n.name IN ('American','British','Canadian')
WHERE l.name = 'English';

-- Arabic
INSERT INTO language_nationalities
SELECT l.id, n.id
FROM languages l
JOIN nationalities n ON n.name IN ('Arab','Saudi','Yemeni','Syrian')
WHERE l.name = 'Arabic';
