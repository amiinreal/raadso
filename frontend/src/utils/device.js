// utils/device.js
// Generates and persists a deviceId (fingerprint) in localStorage

// Always returns a string deviceId (sync if possible, else async)
async function getDeviceId() {
  let deviceId = localStorage.getItem('job-platform-device-id')
  if (!deviceId) {
    deviceId = await generateDeviceId()
    localStorage.setItem('job-platform-device-id', deviceId)
  }
  return deviceId
}

async function generateDeviceId() {
  // Simple fingerprint: random + userAgent + platform
  const rand = Math.random().toString(36).substring(2)
  const ua = navigator.userAgent
  const platform = navigator.platform
  return await sha256(rand + ua + platform)
}

async function sha256(str) {
  // Browser crypto API
  const buffer = new TextEncoder().encode(str)
  const buf = await window.crypto.subtle.digest('SHA-256', buffer)
  return Array.from(new Uint8Array(buf)).map(x => x.toString(16).padStart(2, '0')).join('')
}

export { getDeviceId };
