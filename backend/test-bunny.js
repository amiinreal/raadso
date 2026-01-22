#!/usr/bin/env node
import 'dotenv/config'
import fetch from 'node-fetch'

const storageZone = process.env.BUNNY_STORAGE_ZONE
const apiKey = process.env.BUNNY_API_KEY
const storageApiUrl = process.env.BUNNY_STORAGE_API_URL || 'https://storage.bunnycdn.com'

console.log('======================================')
console.log('Bunny CDN Storage API Test')
console.log('======================================')
console.log('Storage Zone:', storageZone)
console.log('API Key:', apiKey ? `${apiKey.substring(0, 8)}...(${apiKey.length} chars)` : 'MISSING')
console.log('Storage API URL:', storageApiUrl)
console.log('======================================\n')

if (!storageZone || !apiKey) {
  console.error('❌ ERROR: BUNNY_STORAGE_ZONE and BUNNY_API_KEY must be set in .env')
  process.exit(1)
}

console.log('Testing upload...')

// Create a small test file
const testContent = 'Hello from Bunny CDN test!'
const testBuffer = Buffer.from(testContent)
const testFilename = `test-${Date.now()}.txt`
const uploadPath = `uploads/${testFilename}`
const uploadUrl = `${storageApiUrl}/${storageZone}/${uploadPath}`

console.log('Upload URL:', uploadUrl)
console.log('File size:', testBuffer.length, 'bytes')
console.log('\nSending request...\n')

try {
  const response = await fetch(uploadUrl, {
    method: 'PUT',
    headers: {
      'AccessKey': apiKey,
      'Content-Type': 'text/plain'
    },
    body: testBuffer
  })

  console.log('Response status:', response.status, response.statusText)
  
  if (response.ok) {
    console.log('✅ SUCCESS! File uploaded to Bunny CDN')
    const cdnUrl = `${process.env.BUNNY_CDN_BASE_URL}/${uploadPath}`
    console.log('CDN URL:', cdnUrl)
    console.log('\nYou can access it at:')
    console.log(cdnUrl)
    console.log('\n✅ Your Bunny API key is VALID!')
  } else {
    const errorText = await response.text()
    console.error('❌ FAILED:', response.status, response.statusText)
    console.error('Error response:', errorText)
    console.error('\n❌ Your Bunny API key is INVALID or missing permissions')
    console.error('\nTo fix this:')
    console.error('1. Go to: https://dash.bunnycdn.com')
    console.error('2. Storage → amiinstudiocdn')
    console.error('3. FTP & API Access tab')
    console.error('4. Copy the "Password" field')
    console.error('5. Paste it in .env as BUNNY_API_KEY')
  }
} catch (error) {
  console.error('❌ ERROR:', error.message)
}
