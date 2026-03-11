# Feature: File Content Chat

**Date created:** 2026-03-11
**Status:** Implemented, tested, debugging in progress

## Description
When a user mentions a filename in the chat, the server detects it, fetches the file content from OneDrive via Microsoft Graph API, and injects it into the OpenAI context — so the AI can answer questions about what's inside the file. Read-only, no modifications ever made to OneDrive.

## User Stories
- As a user, I can ask "what does budget.docx say about Q3?" and the AI reads the actual file
- As a user, if I mention an unreadable file type (image, video, pptx), the AI tells me it can't read it
- As a user, if I mention a file over 500KB, the AI tells me it's too large
- As a user, the flow is invisible — no extra buttons or steps needed

## Architecture Overview

### Files Modified
| File | Change |
|------|--------|
| `onedrive.js` | Added `getFileContent(accessToken, itemId, size, mimeType, filename)`. Added `id` to `$select` in delta query. Added `mammoth` + `pdf-parse` for local text extraction. |
| `server.js` | Added `GET /api/onedrive/file-content?itemId=<id>`; updated `/api/chat` with filename detection + content injection; session now stores `onedrive_file_list` with `id`. |

### New API Endpoint
| Endpoint | Description |
|----------|-------------|
| `GET /api/onedrive/file-content?itemId=<id>` | Fetches file content. Returns `{ readable, text }` or `{ readable: false, reason }`. Enforces 500KB limit and type check. |

### Supported File Types (as of 2026-03-11)
| Type | How read | Status |
|------|---------|--------|
| `.docx` / `.doc` | `mammoth.extractRawText({ buffer })` | ✅ Working |
| `.pdf` | `pdf-parse(buffer)` | ✅ Working |
| `.txt` / `.csv` / `.md` | `buffer.toString('utf8')` | ✅ Working |
| `.pptx` / `.ppt` / `.xlsx` | Not yet supported | ❌ Returns "unsupported file type" |
| Images / video / audio | By design | ❌ Returns "unsupported file type" |

### Data Flow
```
User types "what does budget.docx say about Q3?"
  → /api/chat receives message
  → Step 1: Exact match — scan prompt for full filename (case-insensitive)
  → Step 2: Fuzzy match (only if no exact match) — split prompt into words,
    filter stop words, check if any word appears in filename base
  → match found → getFileContent(token, id, size, mimeType, filename)
    → size > 500KB → inject: "file is too large to read"
    → unsupported type → inject: "cannot be read — unsupported file type"
    → ok → inject: "Content of filename:\n<extracted text>"
  → OpenAI call includes injected system context
  → AI answers with full file content awareness
```

### File Detection Logic
- Session stores `onedrive_file_list`: `{ id, name, size, mimeType }` per file
- Built on folder select/refresh and lazily on first chat if not yet populated
- **Exact match first** — `promptLower.includes(filename)` — prevents false positives
- **Fuzzy match fallback** — prompt words (2+ chars, filtered stop words) checked against filename base (no extension)
- 1 file per message only

### Dependencies Added
- `mammoth` — Word document text extraction
- `pdf-parse` — PDF text extraction

## Decisions Made
- No attach button — detection is automatic and invisible
- 500KB file size limit to avoid token overload
- `?format=html` Graph API conversion NOT used — only works for natively created OneDrive files, fails for uploaded/synced files (406 error)
- Local library extraction used instead (mammoth, pdf-parse)
- `.pptx`, `.xlsx` excluded from READABLE_TYPES until proper library added — would produce garbled ZIP binary otherwise
- Extension-based mimeType fallback added — Graph API delta sometimes returns empty mimeType for Office files
- Read-only always — no write/delete Graph API calls ever

## Known Bugs Fixed
See `bugs/file-content-chat-debugging.md` for full details.
1. Filename detection too strict (exact match only) → added fuzzy fallback
2. `itemId` was `undefined` → `id` missing from `$select` in delta query
3. `?format=html` not supported for uploaded files → switched to local libraries
4. `.pptx`/`.xlsx` in READABLE_TYPES but no extractor → removed from set
5. Fuzzy match picked wrong file when filenames share common words → split into two passes (exact first, fuzzy second)

## Open / TODO
- Add `.pptx` support (e.g. `officeparser` library)
- Add `.xlsx` support
- Consider multi-file per message support
- Remove debug `console.log` statements once fully stable
