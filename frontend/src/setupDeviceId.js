// Patch window.getDeviceId for global use (for App.jsx dynamic import fallback)
import { getDeviceId as realGetDeviceId } from './utils/device'
window.getDeviceId = realGetDeviceId;
