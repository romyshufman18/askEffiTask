# Feature: Activity Logging

**Date created:** 2026-03-11

## Description
Log user activity on the server to a local file for the app owner to track behavior, debug issues, and understand usage patterns. Logs auto-delete after 7 days to prevent unbounded disk usage.

## User Stories
- As the app owner, I can see a history of all user activity (chats, folder selections, errors, OneDrive connections)
- As the app owner, I can visit `/admin/logs` in the browser to view a table of recent activity
- As the app owner, logs older than 7 days are automatically deleted so the file doesn't grow indefinitely
- As the app owner, sensitive data (full file lists from OneDrive) is never logged

## Architecture Overview

### New Files
| File | Purpose |
|------|---------|
| `logger.js` | Appends JSON lines to log file, auto-cleans entries older than 7 days |
| `logs/activity.log` | Log file (auto-created on first write, gitignored) |
| `public/admin.html` | Table view of logs at `/admin/logs` |

### Modified Files
| File | Change |
|------|--------|
| `server.js` | Import logger, add logging calls at key events, add `GET /admin/logs` + `GET /api/admin/logs` endpoints |

### Log Format
One JSON object per line (NDJSON):
```
{"timestamp":"2026-03-11T10:00:00Z","event":"chat","session":"abc123","details":{"prompt":"...","folderScope":"Documents"}}
{"timestamp":"2026-03-11T10:01:00Z","event":"folder_select","session":"abc123","details":{"folderName":"Budget","fileCount":12}}
```

### Events Logged
| Event | Details |
|-------|---------|
| `chat` | prompt text, folder scope in use |
| `folder_select` | folder name, file count |
| `folder_refresh` | folder name, new file count |
| `onedrive_connect` | session id |
| `onedrive_disconnect` | session id |
| `error` | endpoint, error message |

### API Endpoints
| Endpoint | Description |
|----------|-------------|
| `GET /admin/logs` | Serves `admin.html` |
| `GET /api/admin/logs` | Reads `activity.log`, parses lines, returns JSON array |

### Data Flow
```
Event occurs in server.js
  → logger.log(event, sessionId, details)
  → append JSON line to logs/activity.log

Server start + every 24h
  → logger.cleanup()
  → rewrite file keeping only lines from last 7 days

GET /admin/logs → serves admin.html
GET /api/admin/logs → reads + parses activity.log → returns JSON array
  → admin.html renders table
```

## Decisions Made
- Flat log file (NDJSON) over SQLite — simplest possible, no dependencies
- Full file lists from OneDrive are never logged (only counts and names)
- Not anonymous — session ID is logged for debugging
- Cleanup runs on server start and every 24h (no cron dependency, uses setInterval)
- `logs/` folder added to `.gitignore`
- No auth on `/admin/logs` for now (local dev tool)
