# Feature: OneDrive Folder Picker

**Date created:** 2026-03-10
**Completed:** 2026-03-10

## Description
Allow users to focus the AI's OneDrive context on a specific subfolder via a collapsible tree view in the sidebar. This reduces irrelevant files sent to OpenAI and saves tokens per message.

## User Stories
- As a user, I can expand a folder tree in the sidebar to browse my OneDrive subfolders
- As a user, I can drill down into nested subfolders (lazy-loaded per expand)
- As a user, I can click a folder to focus the AI context on it
- As a user, I see how many files are in the selected folder (file count shown after selecting)
- As a user, folders with no subfolders don't show an expand arrow
- As a user, the sidebar header always shows which folder is currently active
- As a user, I can reset back to the full Documents folder via the ✕ button in the sidebar header
- As a user, my selected folder is remembered across page refreshes (stored in session)

## Architecture Overview

### Files Modified
| File | Change |
|------|--------|
| `server.js` | Added `GET /api/onedrive/folders`, `POST /api/onedrive/focus`; updated `GET /api/onedrive/status`; updated `/api/chat` to pass folder ID |
| `onedrive.js` | Added `getFolderChildren(accessToken, itemId?)`; updated `getFileMetadata(accessToken, folderId?)` to accept optional folder ID |
| `public/index.html` | Added folder tree sidebar, scope indicator, reset button, all tree/focus JS |

### API Endpoints
| Endpoint | Description |
|----------|-------------|
| `GET /api/onedrive/status` | Returns `{ connected, folderId, folderName }` |
| `GET /api/onedrive/folders?itemId=<id>` | Returns subfolders `{ id, name, childCount }`. Defaults to Documents root if no `itemId`. |
| `POST /api/onedrive/focus` `{ folderId, folderName }` | Saves folder to session, pre-fetches file metadata, returns `{ ok, fileCount }`. |

### Data Flow
1. User connects OneDrive → sidebar appears, shows "📁 Documents" as root node
2. User clicks `▶` → `GET /api/onedrive/folders` → Graph API `GET /me/drive/items/{id}/children` (filtered to folders) → child nodes rendered with `childCount`
3. Folders with `childCount === 0` show no expand arrow
4. User clicks a folder name → `POST /api/onedrive/focus` → server pre-fetches files, caches summary in session, returns `fileCount` → status bar shows "OneDrive: FolderName (N files)"
5. Sidebar header updates to "📁 FolderName ✕"
6. Next chat message → `getFileMetadata(token, folderId)` uses the stored folder ID (already cached)
7. On page refresh → `GET /api/onedrive/status` returns `folderId` + `folderName` → sidebar header restored, `selectedFolderId` set so tree highlights correctly when expanded

### onedrive.js
- `resolveRootId(accessToken)` — resolves special folder (handles localized names e.g. Hebrew "מסמכים")
- `getFileMetadata(accessToken, folderId?)` — uses `folderId` if provided, otherwise resolves root
- `getFolderChildren(accessToken, itemId?)` — fetches children, filters to folders only

## Decisions Made
- Tree view (collapsible, lazy drill-down) preferred over breadcrumb or free text input
- Folders only selectable from the real API response (no free-text input)
- `childCount` from Graph API `folder` facet used to hide expand arrow on leaf folders
- Pre-fetch on focus warms the file summary cache so first chat after selecting is fast
- Visual selection restored on refresh via `folderId` in session — tree highlight appears when user expands to that folder; scope indicator in header always shows it immediately
- Children cache not implemented — re-expanding re-fetches (stale data concern outweighs UX cost)
- Reset (✕) button in sidebar header resets scope to Documents root
