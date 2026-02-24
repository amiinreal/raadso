# Server Maintenance System

This document explains how to use the server maintenance system.

## Overview

The server maintenance system allows admins to:
- Toggle maintenance mode on/off
- Display custom maintenance messages to users
- Set estimated downtime
- Store status in a file (not database-dependent)

## Admin Endpoints

All admin endpoints require the `ADMIN_MAINTENANCE_PASSWORD` environment variable.

### 1. Get Server Status (Public)
```
GET /api/server/status
```
Returns current server status without authentication.

### 2. Toggle Maintenance Mode (Admin)
```
POST /api/server/admin/maintenance/toggle
Body: { "adminPassword": "your-password" }
```
Toggles maintenance mode on/off.

### 3. Update Maintenance Message (Admin)
```
POST /api/server/admin/maintenance/message
Body: {
  "adminPassword": "your-password",
  "message": "We are currently updating our systems...",
  "estimatedDowntime": "2-3 hours"
}
```

### 4. Get Full Status (Admin)
```
POST /api/server/admin/maintenance/status
Body: { "adminPassword": "your-password" }
```

## Setup

1. **Set Admin Password** in your `.env` file:
```env
ADMIN_MAINTENANCE_PASSWORD=your-secure-password-here
```

2. **File Storage**:
- Status is stored in `.server-status.json` at the project root
- This file is NOT database-dependent
- Can be manually edited if needed

## Usage Examples

### Enable Maintenance Mode
```bash
curl -X POST http://localhost:4000/api/server/admin/maintenance/toggle \
  -H "Content-Type: application/json" \
  -d '{"adminPassword": "your-password"}'
```

### Update Message
```bash
curl -X POST http://localhost:4000/api/server/admin/maintenance/message \
  -H "Content-Type: application/json" \
  -d '{
    "adminPassword": "your-password",
    "message": "Database migration in progress...",
    "estimatedDowntime": "30 minutes"
  }'
```

## Frontend Access

### For Users
- When maintenance mode is enabled, users see `ServerDownPage` component
- Page shows "Server Offline" message with helpful text
- Shows "Try Again" and "Contact Support" buttons

### For Admins
- Navigate to `/admin-maintenance` (after setting route in env)
- Enter admin password to authenticate
- Can toggle maintenance and update messages
- Access available even during maintenance

## Features

✅ Non-database dependent (uses file storage)
✅ Works when server is down
✅ Admin can make changes without database access
✅ Customizable messages
✅ Estimated downtime display
✅ User-friendly frontend pages
✅ Secure with admin password protection

## Default Admin Password

Default password is `admin-maintenance-key-change-me`

**IMPORTANT:** Change this in production!
