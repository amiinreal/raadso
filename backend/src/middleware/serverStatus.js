import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const STATUS_FILE = path.join(__dirname, '../../../.server-status.json');

// Default status
const DEFAULT_STATUS = {
  status: 'online',
  maintenanceMode: false,
  message: 'Server is operating normally',
  lastUpdated: new Date().toISOString(),
  adminMessage: '',
  estimatedDowntime: null
};

// Get current server status
const getServerStatus = () => {
  try {
    if (fs.existsSync(STATUS_FILE)) {
      const data = fs.readFileSync(STATUS_FILE, 'utf-8');
      return JSON.parse(data);
    }
    return DEFAULT_STATUS;
  } catch (err) {
    console.warn('Failed to read server status:', err.message);
    return DEFAULT_STATUS;
  }
};

// Update server status
const setServerStatus = (newStatus) => {
  try {
    const current = getServerStatus();
    const updated = {
      ...current,
      ...newStatus,
      lastUpdated: new Date().toISOString()
    };
    fs.writeFileSync(STATUS_FILE, JSON.stringify(updated, null, 2));
    return updated;
  } catch (err) {
    console.error('Failed to update server status:', err);
    throw err;
  }
};

// Middleware to attach server status to request
const serverStatusMiddleware = (req, res, next) => {
  req.serverStatus = getServerStatus();
  res.serverStatus = getServerStatus();
  next();
};

export {
  getServerStatus,
  setServerStatus,
  serverStatusMiddleware,
  STATUS_FILE
};
