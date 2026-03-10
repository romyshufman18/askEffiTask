# Feature: OneDrive Refresh Button

**Date created:** 2026-03-10

## Description
Add a refresh button next to the active folder name in the sidebar header, allowing users to re-fetch the latest file data from OneDrive without changing their folder selection. Solves the stale data problem when files are added/removed in OneDrive while the app is open.

## User Stories
- As a user, I can click 🔄 next to my active folder name to re-fetch its file list
- As a user, the button spins and disables while fetching so I know it's working
- As a user, the status bar updates with the new file count after refresh
- As a user, my folder selection is NOT reset — only the data is refreshed

## Architecture Overview

### Files Modified
| File | Change |
|------|--------|
| `public/index.html` | Add 🔄 button to sidebar header, spin/disable logic, update status bar on response |

### No new endpoints needed
`POST /api/onedrive/focus { folderId, folderName }` already clears the cache, re-fetches from Graph API, and returns `{ ok, fileCount }` — the refresh button reuses it as-is.

### Data Flow
1. User clicks 🔄 button
2. Button disables + starts spinning
3. `POST /api/onedrive/focus` called with current `selectedFolderId` + `folderName`
4. Server clears cached summary, re-fetches file list from Microsoft Graph API
5. Returns `{ ok, fileCount }`
6. Status bar updates: "OneDrive: FolderName (N files)"
7. Button re-enables and stops spinning

## Decisions Made
- Reuse existing `/api/onedrive/focus` endpoint — no backend changes needed
- Button lives in sidebar header next to folder name: "📁 FolderName 🔄 ✕"
- Only refreshes file list for current folder — does not refresh the folder tree structure
- Spin animation via CSS class toggle
- Button only visible when a folder is selected (same condition as ✕ button)
