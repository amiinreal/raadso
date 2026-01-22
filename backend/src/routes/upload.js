import multer from 'multer'
import { Router } from 'express'
import fetch from 'node-fetch'
import { authenticate } from '../middleware/auth.js'
import { isValidImageFile, isValidDocumentFile, MAX_FILE_SIZE } from '../utils/validation.js'

const router = Router()

// Multer configuration for memory storage (we'll upload to Bunny CDN)
const storage = multer.memoryStorage()
const upload = multer({
  storage,
  limits: {
    fileSize: MAX_FILE_SIZE,
    files: 1 // Only one file at a time
  },
  fileFilter: (req, file, cb) => {
    // Validate file extension
    const ext = file.originalname.toLowerCase().split('.').pop()
    const allowedImageExts = ['jpg', 'jpeg', 'png', 'webp', 'svg']
    const allowedDocExts = ['pdf', 'doc', 'docx']
    
    if (!allowedImageExts.includes(ext) && !allowedDocExts.includes(ext)) {
      return cb(new Error('Invalid file extension. Only JPG, PNG, WebP, SVG, PDF, DOC, DOCX allowed.'))
    }
    
    // Validate MIME type
    const allowedImageTypes = ['image/jpeg', 'image/png', 'image/jpg', 'image/webp', 'image/svg+xml']
    const allowedDocTypes = ['application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document']
    
    if (!allowedImageTypes.includes(file.mimetype) && !allowedDocTypes.includes(file.mimetype)) {
      return cb(new Error('Invalid file type. MIME type and extension must match.'))
    }
    
    // Sanitize filename - remove special characters
    file.originalname = file.originalname.replace(/[^a-zA-Z0-9.-]/g, '_')
    
    cb(null, true)
  }
})

// Build organized storage path: users/<userId>/<type>/<YYYY>/<MM>/<timestamp>_<filename>
function buildOrganizedPath(type, userId, originalname, timestamp = Date.now()) {
  const date = new Date(timestamp)
  const yyyy = String(date.getUTCFullYear())
  const mm = String(date.getUTCMonth() + 1).padStart(2, '0')
  const clean = sanitizeFilename(originalname.toLowerCase())
  return `users/${userId}/${type}/${yyyy}/${mm}/${timestamp}_${clean}`
}

// Basic filename sanitizer
function sanitizeFilename(name) {
  return name.replace(/[^a-z0-9._-]/gi, '_')
}

// Upload file to Bunny CDN Storage
async function uploadToBunny(fileBuffer, uploadPath, mimetype) {
  const storageZone = process.env.BUNNY_STORAGE_ZONE
  const apiKey = process.env.BUNNY_API_KEY
  const storageApiUrl = process.env.BUNNY_STORAGE_API_URL || 'https://storage.bunnycdn.com'
  
  if (!storageZone || !apiKey) {
    throw new Error('Bunny CDN configuration missing. Set BUNNY_STORAGE_ZONE and BUNNY_API_KEY in environment variables.')
  }
  const uploadUrl = `${storageApiUrl}/${storageZone}/${uploadPath}`

  console.log('Uploading to Bunny CDN:')
  console.log('  URL:', uploadUrl)
  console.log('  API Key length:', apiKey.length)
  console.log('  API Key format:', apiKey.substring(0, 8) + '...')
  console.log('  File size:', fileBuffer.length, 'bytes')

  const response = await fetch(uploadUrl, {
    method: 'PUT',
    headers: {
      'AccessKey': apiKey,
      'Content-Type': mimetype
    },
    body: fileBuffer
  })

  console.log('Bunny CDN response:', response.status, response.statusText)

  if (!response.ok) {
    const errorText = await response.text()
    console.error('Bunny CDN error response:', errorText)
    throw new Error(`Bunny CDN upload failed: ${response.status} - ${errorText}`)
  }

  // Return the public CDN URL
  const cdnBaseUrl = process.env.BUNNY_CDN_BASE_URL || 'https://amiinstudiocdn.b-cdn.net'
  const cdnUrl = `${cdnBaseUrl}/${uploadPath}`
  console.log('Upload successful! CDN URL:', cdnUrl)
  return cdnUrl
}

// Delete file from Bunny CDN Storage
async function deleteFromBunny(cdnUrl) {
  const storageZone = process.env.BUNNY_STORAGE_ZONE
  const apiKey = process.env.BUNNY_API_KEY
  const storageApiUrl = process.env.BUNNY_STORAGE_API_URL || 'https://storage.bunnycdn.com'
  const cdnBaseUrl = process.env.BUNNY_CDN_BASE_URL || 'https://amiinstudiocdn.b-cdn.net'
  
  if (!storageZone || !apiKey || !cdnUrl) {
    return // Skip if missing config or no old file
  }

  try {
    // Extract file path from CDN URL
    // Example: https://amiinstudiocdn.b-cdn.net/uploads/logo_123.png -> uploads/logo_123.png
    const filePath = cdnUrl.replace(cdnBaseUrl + '/', '')
    const deleteUrl = `${storageApiUrl}/${storageZone}/${filePath}`
    
    console.log('Deleting old file from Bunny CDN:', filePath)
    
    const response = await fetch(deleteUrl, {
      method: 'DELETE',
      headers: {
        'AccessKey': apiKey
      }
    })

    if (response.ok) {
      console.log('✅ Old file deleted successfully:', filePath)
    } else {
      console.warn('⚠️ Could not delete old file (may not exist):', response.status)
    }
  } catch (error) {
    console.error('Error deleting old file:', error.message)
    // Don't throw - deletion failure shouldn't stop the upload
  }
}

// POST /upload/logo - Upload company logo
router.post('/logo', authenticate, upload.single('logo'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' })
    }

    const timestamp = Date.now()
    const uploadPath = buildOrganizedPath('logos', req.user.userId, req.file.originalname, timestamp)
    const oldLogoUrl = req.body.oldLogoUrl // Get old logo URL from request
    
    const cdnUrl = await uploadToBunny(req.file.buffer, uploadPath, req.file.mimetype)
    
    // Delete old logo after successful upload (if exists)
    if (oldLogoUrl && oldLogoUrl.includes('amiinstudiocdn.b-cdn.net')) {
      await deleteFromBunny(oldLogoUrl)
    }
    
    res.json({
      url: cdnUrl,
      filename: req.file.originalname,
      size: req.file.size,
      type: req.file.mimetype
    })
  } catch (error) {
    console.error('Error uploading logo:', error)
    res.status(500).json({ error: error.message || 'Failed to upload logo' })
  }
})

// POST /upload/cv - Upload CV/Resume
router.post('/cv', authenticate, upload.single('cv'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' })
    }

    const timestamp = Date.now()
    const uploadPath = buildOrganizedPath('cv', req.user.userId, req.file.originalname, timestamp)
    
    const cdnUrl = await uploadToBunny(req.file.buffer, uploadPath, req.file.mimetype)
    
    res.json({
      url: cdnUrl,
      filename: req.file.originalname,
      size: req.file.size,
      type: req.file.mimetype
    })
  } catch (error) {
    console.error('Error uploading CV:', error)
    res.status(500).json({ error: error.message || 'Failed to upload CV' })
  }
})

// POST /upload/profile-image - Upload profile image
router.post('/profile-image', authenticate, upload.single('image'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' })
    }

    const timestamp = Date.now()
    const uploadPath = buildOrganizedPath('profile', req.user.userId, req.file.originalname, timestamp)
    const oldImageUrl = req.body.oldImageUrl // Get old image URL from request
    
    const cdnUrl = await uploadToBunny(req.file.buffer, uploadPath, req.file.mimetype)
    
    // Delete old image after successful upload (if exists)
    if (oldImageUrl && oldImageUrl.includes('amiinstudiocdn.b-cdn.net')) {
      await deleteFromBunny(oldImageUrl)
    }
    
    res.json({
      url: cdnUrl,
      filename: req.file.originalname,
      size: req.file.size,
      type: req.file.mimetype
    })
  } catch (error) {
    console.error('Error uploading profile image:', error)
    res.status(500).json({ error: error.message || 'Failed to upload profile image' })
  }
})

// POST /upload/document - Upload custom application document
router.post('/document', authenticate, upload.single('file'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' })
    }

    const timestamp = Date.now()
    const uploadPath = buildOrganizedPath('documents', req.user.userId, req.file.originalname, timestamp)
    
    const cdnUrl = await uploadToBunny(req.file.buffer, uploadPath, req.file.mimetype)
    
    res.json({
      url: cdnUrl,
      filename: req.file.originalname,
      size: req.file.size,
      type: req.file.mimetype
    })
  } catch (error) {
    console.error('Error uploading document:', error)
    res.status(500).json({ error: error.message || 'Failed to upload document' })
  }
})

export default router
