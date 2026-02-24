-- Add landing page translation keys and values
-- Insert all landing page translation keys first
INSERT INTO translation_keys (key, domain, description) VALUES
('landing.hero.title', 'landing', 'Main heading for landing page hero section'),
('landing.hero.description', 'landing', 'Description for landing page hero section'),
('landing.hero.cta.signin', 'landing', 'Sign in button text'),
('landing.hero.cta.explore', 'landing', 'Explore jobs button text'),
('landing.search.title', 'landing', 'Search jobs heading'),
('landing.search.jobTitle', 'landing', 'Job title or keyword label'),
('landing.search.jobPlaceholder', 'landing', 'Job title input placeholder'),
('landing.search.location', 'landing', 'Location label'),
('landing.search.locationPlaceholder', 'landing', 'Location input placeholder'),
('landing.search.button', 'landing', 'Search button text'),
('landing.search.dropdown.jobs', 'landing', 'Jobs dropdown category header'),
('landing.search.dropdown.companies', 'landing', 'Companies dropdown category header'),
('landing.search.dropdown.jobId', 'landing', 'Job ID label in search results'),
('landing.features.title1', 'landing', 'First feature title'),
('landing.features.description1', 'landing', 'First feature description'),
('landing.features.title2', 'landing', 'Second feature title'),
('landing.features.description2', 'landing', 'Second feature description'),
('landing.features.title3', 'landing', 'Third feature title'),
('landing.features.description3', 'landing', 'Third feature description'),
('landing.stats.title', 'landing', 'Platform statistics section title'),
('landing.stats.activeRoles', 'landing', 'Active roles stat label'),
('landing.stats.companies', 'landing', 'Companies stat label'),
('landing.stats.activeUsers', 'landing', 'Active users stat label'),
('landing.stats.rolesCount', 'landing', 'Active roles count number'),
('landing.stats.companiesCount', 'landing', 'Companies count number'),
('landing.stats.usersCount', 'landing', 'Active users count number'),
('landing.cta.ready', 'landing', 'Call to action text'),
('landing.cta.button', 'landing', 'Get started button text')
ON CONFLICT (key) DO NOTHING;

-- Insert English translations
INSERT INTO translations (translation_key_id, language, value) 
SELECT tk.id, 'en', trans.value FROM (VALUES
  ('landing.hero.title', 'Find Your Next Opportunity'),
  ('landing.hero.description', 'Discover curated roles from innovative companies. Connect with teams that value your skills and ambitions. Built for professionals who want more than just a job.'),
  ('landing.hero.cta.signin', 'Sign In / Register'),
  ('landing.hero.cta.explore', 'Explore Jobs'),
  ('landing.search.title', 'Search Jobs'),
  ('landing.search.jobTitle', 'Job Title or Keyword'),
  ('landing.search.jobPlaceholder', 'e.g., Frontend Engineer, Product Manager'),
  ('landing.search.location', 'Location'),
  ('landing.search.locationPlaceholder', 'e.g., Remote, San Francisco'),
  ('landing.search.button', 'Search'),
  ('landing.search.dropdown.jobs', 'Jobs'),
  ('landing.search.dropdown.companies', 'Companies'),
  ('landing.search.dropdown.jobId', 'ID'),
  ('landing.features.title1', 'Targeted Search'),
  ('landing.features.description1', 'Find roles that match your skills, experience, and career goals with advanced filtering.'),
  ('landing.features.title2', 'Rich Profiles'),
  ('landing.features.description2', 'Create a comprehensive profile showcasing your experience, skills, education, and portfolio links.'),
  ('landing.features.title3', 'Quick Apply'),
  ('landing.features.description3', 'Apply instantly with your complete profile. Companies see all your details at a glance.'),
  ('landing.stats.title', 'Platform Statistics'),
  ('landing.stats.activeRoles', 'Active Roles'),
  ('landing.stats.companies', 'Companies'),
  ('landing.stats.activeUsers', 'Active Users'),
  ('landing.stats.rolesCount', '500+'),
  ('landing.stats.companiesCount', '1000+'),
  ('landing.stats.usersCount', '50K+'),
  ('landing.cta.ready', 'Ready to find your next opportunity?'),
  ('landing.cta.button', 'Get Started')
) AS trans(key, value)
JOIN translation_keys tk ON tk.key = trans.key
WHERE NOT EXISTS (
  SELECT 1 FROM translations t 
  WHERE t.translation_key_id = tk.id AND t.language = 'en'
);

-- Insert Somali translations
INSERT INTO translations (translation_key_id, language, value) 
SELECT tk.id, 'so', trans.value FROM (VALUES
  ('landing.hero.title', 'Helaa Fursadda Danbe'),
  ('landing.hero.description', 'Keydiso shaqo la fiiriye ah oo laga soo qaatay kampaniyo xoolleyaal leh. Isku xiriin kooxo qoofiyay xirfadahaaga iyo ambisiyadahaaga. Loo dhisay ururada awood leh ee raba waxaan ka badan mid shaqo oo kale.'),
  ('landing.hero.cta.signin', 'Gal / Diiwaangelid'),
  ('landing.hero.cta.explore', 'Keydiso Shaqada'),
  ('landing.search.title', 'Keydiso Shaqo'),
  ('landing.search.jobTitle', 'Magaca Shaqo ama Erayga Keydista'),
  ('landing.search.jobPlaceholder', 'ee: Frontend Engineer, Product Manager'),
  ('landing.search.location', 'Goobta'),
  ('landing.search.locationPlaceholder', 'ee: Remote, San Francisco'),
  ('landing.search.button', 'Keydiso'),
  ('landing.search.dropdown.jobs', 'Shaqo'),
  ('landing.search.dropdown.companies', 'Kampaniyo'),
  ('landing.search.dropdown.jobId', 'ID'),
  ('landing.features.title1', 'Keydista Iska-Jeev ah'),
  ('landing.features.description1', 'Hel shaqo iska-jeev ah xirfadahaaga, kaluumeysyahaaga, iyo hadafyada jeerida ah ayada oo addeecsan sarinaya horumarinta.'),
  ('landing.features.title2', 'Profiles Yar-Yar'),
  ('landing.features.description2', 'Abuur profile faafan oo muujin khibradalaa, xirfadahaaka, waxbarashada, iyo liilka portfolio-ga'),
  ('landing.features.title3', 'Codsi Dhakhso ah'),
  ('landing.features.description3', 'Cod si toos ah oo profile kamilantu hoose. Kampaniyo waxay arkaan dhammaan faahfaahintoodu hadka isla markaata.'),
  ('landing.stats.title', 'Tibaax-tibaaxaha Platfoormka'),
  ('landing.stats.activeRoles', 'Shaqo Firfircoon'),
  ('landing.stats.companies', 'Kampaniyo'),
  ('landing.stats.activeUsers', 'Isticmaalayaasha Firfircoon'),
  ('landing.stats.rolesCount', '500+'),
  ('landing.stats.companiesCount', '1000+'),
  ('landing.stats.usersCount', '50K+'),
  ('landing.cta.ready', 'Baad diyaar tahay inaad helato fursadda danbe?'),
  ('landing.cta.button', 'Bilow')
) AS trans(key, value)
JOIN translation_keys tk ON tk.key = trans.key
WHERE NOT EXISTS (
  SELECT 1 FROM translations t 
  WHERE t.translation_key_id = tk.id AND t.language = 'so'
);
