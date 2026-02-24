import express from 'express';
import { getServerStatus, setServerStatus } from '../middleware/serverStatus.js';

const router = express.Router();

// Get server status (public endpoint - no auth required)
router.get('/status', (req, res) => {
  const status = getServerStatus();
  res.json(status);
});

// Admin: Toggle maintenance mode
router.post('/admin/maintenance/toggle', (req, res) => {
  try {
    const { adminPassword } = req.body;
    const ADMIN_PASSWORD = process.env.ADMIN_MAINTENANCE_PASSWORD || 'admin-maintenance-key-change-me';
    
    if (adminPassword !== ADMIN_PASSWORD) {
      return res.status(401).json({ error: 'Invalid admin password' });
    }

    const current = getServerStatus();
    const updated = setServerStatus({
      maintenanceMode: !current.maintenanceMode,
      status: !current.maintenanceMode ? 'maintenance' : 'online',
      message: !current.maintenanceMode 
        ? 'Server is under maintenance. We\'ll be back soon!'
        : 'Server is operating normally'
    });

    res.json({ success: true, status: updated });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Admin: Update maintenance message
router.post('/admin/maintenance/message', (req, res) => {
  try {
    const { adminPassword, message, estimatedDowntime } = req.body;
    const ADMIN_PASSWORD = process.env.ADMIN_MAINTENANCE_PASSWORD || 'admin-maintenance-key-change-me';
    
    if (adminPassword !== ADMIN_PASSWORD) {
      return res.status(401).json({ error: 'Invalid admin password' });
    }

    const updated = setServerStatus({
      adminMessage: message,
      estimatedDowntime: estimatedDowntime || null
    });

    res.json({ success: true, status: updated });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Admin: Get full status (with all details)
router.post('/admin/maintenance/status', (req, res) => {
  try {
    const { adminPassword } = req.body;
    const ADMIN_PASSWORD = process.env.ADMIN_MAINTENANCE_PASSWORD || 'admin-maintenance-key-change-me';
    
    if (adminPassword !== ADMIN_PASSWORD) {
      return res.status(401).json({ error: 'Invalid admin password' });
    }

    const status = getServerStatus();
    res.json(status);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
