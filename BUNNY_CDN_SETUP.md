# Bunny CDN File Upload Configuration

## 🔴 URGENT FIX: Logo 404 Error

**Problem**: Logo uploads successfully but shows 404 when loading from CDN.

**Cause**: Pull Zone is pointing to ngrok origin instead of Storage Zone.

**Solution**: Connect Pull Zone to Storage Zone (3 minutes):

### Step-by-Step Fix:

1. **Go to Bunny Dashboard**: https://dash.bunnycdn.com
2. **Navigate to Pull Zones** → Click **"amiinstudiocdn"**
3. **Click "Origin" tab** (left sidebar)
4. **Change Origin Settings**:
   - **Origin Type**: Select **"Bunny Storage Zone"**
   - **Storage Zone**: Select **"amiinstudiocdn"**
   - **Origin URL**: Remove the ngrok URL (not needed)
5. **Click "Save"** at the bottom

### Verify the Fix:

After saving, wait ~10 seconds for propagation, then:
- Refresh your company profile page
- Logo should now display correctly
- Test URL: https://amiinstudiocdn.b-cdn.net/uploads/logo_...

✅ Files are already uploaded and stored correctly!
✅ Just need to connect Pull Zone to Storage Zone
✅ After this fix, all future uploads will work instantly

---

## ✅ Your Architecture is CORRECT

You're using the professional SaaS architecture:
- Files → Bunny Storage API (direct upload)
- CDN → https://amiinstudiocdn.b-cdn.net
- Database → stores CDN URLs only (TEXT, never blobs)
- ngrok → for backend API access (not needed for Bunny uploads)

## 🔴 URGENT: Rotate Your API Key

The API key was exposed publicly. **Do this NOW:**

1. Go to: https://dash.bunnycdn.com
2. Navigate to: **Storage** → **amiinstudiocdn**
3. Click: **"FTP & API Access"** tab
4. Click: **"Regenerate Password"** button
5. Copy the new password (this is your Storage Zone API Key)
6. Paste it in `/backend/.env` as `BUNNY_API_KEY`

## 📋 Correct Configuration

### Storage Zone (amiinstudiocdn)
- **Storage Endpoint**: `storage.bunnycdn.com` (Frankfurt, DE)
- **CDN URL**: `https://amiinstudiocdn.b-cdn.net`
- **Storage Zone Name**: `amiinstudiocdn`

### Pull Zone (amiinstudiocdn)
- **CDN Hostname**: `https://amiinstudiocdn.b-cdn.net`
- **Origin URL**: Not needed for Storage API uploads ✅

### Environment Variables (.env)
```env
BUNNY_STORAGE_ZONE=amiinstudiocdn
BUNNY_API_KEY=<paste-your-regenerated-password-here>
BUNNY_CDN_BASE_URL=https://amiinstudiocdn.b-cdn.net
BUNNY_STORAGE_API_URL=https://storage.bunnycdn.com
```

## 🔄 Upload Flow (Already Implemented Correctly)

```
Frontend (CompanyEdit.jsx)
    ↓ FormData with file
Backend (/upload/logo)
    ↓ PUT request
Bunny Storage API (storage.bunnycdn.com)
    ↓ Returns success
Backend returns CDN URL
    ↓ https://amiinstudiocdn.b-cdn.net/uploads/logo_123.png
Database stores URL
    ↓ logo_url column (TEXT)
Frontend displays from CDN
    ↓ <img src="https://amiinstudiocdn.b-cdn.net/uploads/..." />
```

## 🧪 How to Test

1. **Rotate API Key** (see above)
2. **Update .env** with new key
3. **Restart backend**: `cd backend && npm start`
4. **Test upload**:
   - Login as employer
   - Go to http://localhost:5173/company/edit
   - Click logo file input
   - Select an image
   - Click "Save Changes"
5. **Verify**:
   - Check console for success
   - Check database: `SELECT logo_url FROM tenants WHERE slug='amiin-studio'`
   - Should see: `https://amiinstudiocdn.b-cdn.net/uploads/logo_...`
   - Visit that URL directly - image should load

## ⚙️ What Each Service Does

| Service | Purpose | Your Setup |
|---------|---------|------------|
| **Bunny Storage** | File storage via API | ✅ `storage.bunnycdn.com` |
| **Bunny Pull Zone** | CDN delivery | ✅ `amiinstudiocdn.b-cdn.net` |
| **ngrok** | Expose localhost for API testing | ✅ Optional for dev |
| **PostgreSQL** | Store file URLs (not files) | ✅ TEXT columns only |

## 🚀 You're Already at SaaS Level

Your implementation is **correct**:
- ✅ No files in database (only URLs)
- ✅ No files on backend disk (direct to CDN)
- ✅ Scales infinitely
- ✅ Fast global CDN delivery
- ✅ Proper separation of concerns

**Only issue**: The exposed API key needs rotation.

## 📝 After Rotating the Key

Once you update `BUNNY_API_KEY` in `.env` and restart the backend:
- Logo uploads will work ✅
- Company profile saves will work ✅
- Files will be served from Bunny CDN ✅
- Database will store CDN URLs only ✅

The 401 Unauthorized error will be resolved.
