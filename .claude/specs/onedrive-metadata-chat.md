# Feature: OneDrive Metadata Chat Integration

**Date created:** 2026-03-09

## Description
Allow the user to connect their Microsoft OneDrive account via OAuth and then ask natural language questions about their files using file metadata (name, type, modified date, size, etc.). The AI chat agent answers using this metadata context. File content is NOT accessed in this phase.

---

## User Stories

- As a user, I can click "Connect OneDrive" on the chat page so I can grant the app access to my OneDrive.
- As a user, I can see a status indicator showing whether I am connected or not.
- As a user, after logging in with Microsoft, I am redirected back to the main chat page automatically.
- As a user, I can ask the chat questions like "List my files", "What Excel files do I have?", "What files did I modify in July?", "Find files whose name contains X".
- As a user, the chat automatically uses my OneDrive file metadata to answer — I don't need to do anything extra after connecting.

---

## Constraints
- Read metadata only — never read, write, edit, or delete file contents
- Access token stored server-side only, never exposed to the frontend
- No file content access in this phase (planned for a future feature)

---

## Architecture Overview

### Files modified
| File | Change |
|---|---|
| `public/index.html` | Add "Connect OneDrive" button + connection status bar at top |
| `server.js` | Add session middleware + OAuth routes + Graph API call + metadata injection into chat |
| `.env.example` | Add Microsoft OAuth env vars |

### New files (if split for clarity)
| File | Purpose |
|---|---|
| `auth.js` (optional) | Microsoft OAuth route handlers |
| `onedrive.js` (optional) | Graph API calls for file metadata |

### New API Endpoints
| Endpoint | Purpose |
|---|---|
| `GET /auth/onedrive` | Redirect user to Microsoft OAuth login |
| `GET /auth/callback` | Handle OAuth redirect, exchange code for token, store in session |
| `GET /api/onedrive/status` | Return `{ connected: true/false }` to frontend |

### Data Flow

```
1. User clicks "Connect OneDrive"
     → frontend navigates to GET /auth/onedrive
     → server redirects to Microsoft OAuth URL

2. User logs in with Microsoft
     → Microsoft redirects to GET /auth/callback?code=...
     → server exchanges code for access token
     → token stored in server-side session (express-session)
     → server redirects to /

3. Frontend loads
     → calls GET /api/onedrive/status
     → shows "Connected ✓" or "Not connected" in status bar

4. User sends a chat message
     → POST /chat
     → if connected: server calls Microsoft Graph API
         GET https://graph.microsoft.com/v1.0/me/drive/root/children
         (fetches file metadata: name, type, size, lastModifiedDateTime)
     → metadata injected into GPT system prompt
     → GPT answers using metadata context
     → response sent to frontend
```

### Environment Variables (add to .env)
```
MICROSOFT_CLIENT_ID=
MICROSOFT_CLIENT_SECRET=
MICROSOFT_REDIRECT_URI=http://localhost:3000/auth/callback
```

### New Dependencies
- `express-session` — server-side session to store access token

---

## Decisions Made
- Metadata only (no file content) — file content reading is a future feature
- Plain OAuth 2.0 authorization code flow — no MSAL library, keeps it simple
- Token stored in express-session — never sent to the client
- Code may be split into `auth.js` / `onedrive.js` modules for clarity
- Single page app — after login, user returns to the same chat page

## Open Questions
- Should the session persist across server restarts? (For now: no — in-memory session is fine)
- How many files to fetch from Graph API per chat message? (Start with top 200 by lastModified)
