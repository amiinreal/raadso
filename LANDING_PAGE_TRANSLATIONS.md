# Landing Page Translation Implementation

## Overview
Successfully implemented bilingual (English & Somali) translations for the entire landing page with database integration.

## What Was Done

### 1. Frontend - Landing Page Updates
- **File**: `frontend/src/pages/Landing.jsx`
- **Changes**:
  - Added `useTranslation` hook from TranslationProvider
  - Wrapped all hardcoded text with `t()` function
  - Supports 28 translation keys covering:
    - Hero section (title, description, CTAs)
    - Search section (labels, placeholders, buttons)
    - Features section (titles, descriptions)
    - Stats section (numbers, labels)
    - CTA section (buttons, text)

### 2. Frontend - Translation Keys
- **File**: `frontend/src/i18n/baseTranslations.js`
- **Changes**:
  - Added 56 translation entries (28 English + 28 Somali)
  - Translation keys follow pattern: `landing.[section].[element]`
  - Sections: hero, search, features, stats, cta
  - Both English and Somali translations included

### 3. Database Schema
- **Migration**: `backend/sql/migrations/20260214_create_page_translations_table.sql`
- **Table**: `page_translations`
- **Columns**:
  - `id` (PRIMARY KEY)
  - `page_name` (VARCHAR 100)
  - `language_code` (VARCHAR 10)
  - `translation_key` (VARCHAR 255)
  - `translation_value` (TEXT)
  - `created_at` (TIMESTAMP)
  - `updated_at` (TIMESTAMP)
- **Indexes**:
  - Unique constraint on (page_name, language_code, translation_key)
  - Index on (page_name, language_code)
  - Index on translation_key

### 4. Database Data
- **Migration**: `backend/sql/migrations/20260214_add_landing_page_translations.sql`
- **Data**: 56 translation records (28 per language)
- **Status**: ✅ Inserted successfully

### 5. Backend API Enhancement
- **File**: `backend/src/routes/i18n.js`
- **New Endpoint**:
  ```
  GET /i18n/page/:pageName?lang=en
  ```
- **Returns**:
  ```json
  {
    "page": "landing",
    "language": "en",
    "translations": {
      "landing.hero.title": "Find Your Next Opportunity",
      ...
    }
  }
  ```

### 6. Frontend API Client
- **File**: `frontend/src/api/api.js`
- **New Method**:
  ```javascript
  api.getPageTranslations(pageName, lang = 'en')
  ```
- **Usage**: Allows frontend to fetch translations from database if needed

## Translation Keys

### Hero Section
- `landing.hero.title` - Main heading
- `landing.hero.description` - Subheading description
- `landing.hero.cta.signin` - Sign In button
- `landing.hero.cta.explore` - Explore Jobs button

### Search Section
- `landing.search.title` - "Search Jobs" heading
- `landing.search.jobTitle` - Job title label
- `landing.search.jobPlaceholder` - Job input placeholder
- `landing.search.location` - Location label
- `landing.search.locationPlaceholder` - Location input placeholder
- `landing.search.button` - Search button
- `landing.search.dropdown.jobs` - Jobs category header
- `landing.search.dropdown.companies` - Companies category header
- `landing.search.dropdown.jobId` - Job ID label

### Features Section
- `landing.features.title1` - "Targeted Search" title
- `landing.features.description1` - Targeted search description
- `landing.features.title2` - "Rich Profiles" title
- `landing.features.description2` - Rich profiles description
- `landing.features.title3` - "Quick Apply" title
- `landing.features.description3` - Quick apply description

### Stats Section
- `landing.stats.title` - "Platform Statistics" heading
- `landing.stats.activeRoles` - Active roles label
- `landing.stats.companies` - Companies label
- `landing.stats.activeUsers` - Active users label
- `landing.stats.rolesCount` - "500+"
- `landing.stats.companiesCount` - "1000+"
- `landing.stats.usersCount` - "50K+"

### CTA Section
- `landing.cta.ready` - "Ready to find your next opportunity?"
- `landing.cta.button` - "Get Started" button

## How to Use

### For Frontend Developers
1. All text on the landing page is automatically translated based on user's language setting
2. Language switching is handled by the existing `TranslationProvider`
3. To add more languages, add translations to `baseTranslations.js`

### For Database Administrators
1. Translations are stored in `page_translations` table
2. To update translations, modify records in the database:
   ```sql
   UPDATE page_translations 
   SET translation_value = 'New Value' 
   WHERE page_name = 'landing' AND translation_key = 'landing.hero.title'
   ```

### For Adding More Pages
1. Create translation keys following the pattern: `[pageName].[section].[element]`
2. Add to `baseTranslations.js`:
   ```javascript
   'pageName.section.element': 'English Text',
   ```
3. Insert into database:
   ```sql
   INSERT INTO page_translations (page_name, language_code, translation_key, translation_value)
   VALUES ('pageName', 'en', 'pageName.section.element', 'English Text')
   ```
4. Use in component:
   ```javascript
   const { t } = useTranslation()
   <h1>{t('pageName.section.element')}</h1>
   ```

## Bilingual Support

### English (en)
- All standard English translations
- Follows US English conventions

### Somali (so)
- Complete Somali translations
- Culturally appropriate terminology
- Right-to-left text support ready (if needed via CSS)

## Verification

### Database
```bash
SELECT COUNT(*) FROM page_translations WHERE page_name = 'landing'
-- Result: 56 rows (28 English + 28 Somali)
```

### API Endpoint
```bash
curl http://localhost:4000/i18n/page/landing?lang=en
```

### Frontend
Landing page automatically displays translated content based on user's selected language via the language switcher.

## Files Modified/Created

### Created:
- `backend/sql/migrations/20260214_create_page_translations_table.sql`
- `backend/sql/migrations/20260214_add_landing_page_translations.sql`

### Modified:
- `frontend/src/pages/Landing.jsx` - Added translation hooks and keys
- `frontend/src/i18n/baseTranslations.js` - Added 56 translation entries
- `backend/src/routes/i18n.js` - Added page translations endpoint
- `frontend/src/api/api.js` - Added page translations API method

## Database Status
- Table: ✅ Created
- Data: ✅ Inserted (56 rows)
- Indexes: ✅ Created
- API: ✅ Implemented

## Next Steps

1. **Test in Browser**:
   - Navigate to landing page
   - Switch language using language selector
   - Verify all text changes appropriately

2. **Admin Translation Management** (Optional):
   - Create admin panel to edit translations without database access
   - Add UI for bulk translation updates

3. **Other Pages**:
   - Apply same pattern to other pages (Dashboard, Jobs, etc.)
   - Create migration files for each page

4. **Performance**:
   - Consider caching translations in Redis for large-scale deployments
   - Add translation versioning system

## Troubleshooting

### Translations Not Showing
1. Check if `useTranslation()` hook is imported
2. Verify translation keys exist in `baseTranslations.js`
3. Check browser language setting
4. Clear browser cache and reload

### Database Connection Issues
1. Verify PostgreSQL is running: `psql --version`
2. Check connection string in `.env` file
3. Verify `page_translations` table exists: `\dt page_translations`

### API Endpoint Not Working
1. Restart backend server: `npm run dev`
2. Check logs for errors
3. Verify endpoint is registered in `i18n.js`
