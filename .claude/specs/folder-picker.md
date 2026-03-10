# Feature: OneDrive Folder Picker

**Date created:** 2026-03-10

## Description
Allow users to focus the AI's OneDrive context on a specific subfolder via a collapsible tree view in the sidebar. This reduces irrelevant files sent to OpenAI and saves tokens per message.

## User Stories
- As a user, I can expand a folder tree in the sidebar to browse my OneDrive subfolders
- As a user, I can click a folder to select it as the active scan scope
- As a user, the chat will only have context about files in the selected folder (and its children)
- As a user, I can reset back to the full Documents folder

## Architecture Overview

### Files Modified
| File | Change |
|------|--------|
| `server.js` | Add `GET /api/onedrive/folders` and `POST /api/onedrive/focus` endpoints |
| `onedrive.js` | Accept optional `folderId` param in `getFileMetadata` |
| `public/index.html` | Add folder tree panel to sidebar |
| `public/app.js` | Add tree UI logic (expand/collapse/select) |

### New API Endpoints
| Endpoint | Description |
|----------|-------------|
| `GET /api/onedrive/folders?itemId=<id>` | Returns subfolders of the given folder. Defaults to Documents root if no `itemId`. |
| `POST /api/onedrive/focus` `{ folderId, folderName }` | Saves chosen folder to session, clears cached file summary. |

### Data Flow
1. User connects OneDrive → sidebar shows "📁 Documents" with expand arrow
2. User clicks `▶` → `GET /api/onedrive/folders` → Graph API `GET /me/drive/items/{id}/children?$filter=folder ne null` → child folders rendered
3. User clicks folder name → `POST /api/onedrive/focus` → session stores `onedrive_folder_id` and `onedrive_folder_name`, clears `onedrive_file_summary`
4. Next chat message → `getFileMetadata(token, folderId)` uses the stored folder ID

### onedrive.js change
`getFileMetadata(accessToken, folderId?)` — if `folderId` is provided, skip special-folder resolution and use it directly for the delta call.

## Decisions Made
- Tree view (collapsible, drill-down) preferred over breadcrumb or free text
- Folder must exist in OneDrive (user can only pick from real folders returned by the API)
- Reset option: clicking "Documents" root resets to default scope
- Only folders shown (files filtered out in the API response)
