# Feature: Proactive Chat Messages

**Date created:** 2026-03-12

## Description
Two proactive AI-generated messages that make the chat feel alive and context-aware:
1. **Welcome message** — on page load, the AI introduces itself, explains the app, and lists what it can help with
2. **Folder briefing** — when the user selects a new folder, the AI automatically sends a summary of that folder's contents and suggests what it can do with them

## User Stories
- As a user, when I open the app I immediately understand what it does and how to use it
- As a user, when I select a folder I get an instant summary of what's in it and what I can ask about
- As a user, both messages appear as regular assistant bubbles — no new UI elements

## Architecture Overview

### Files Modified
| File | Change |
|------|--------|
| `server.js` | Add `GET /api/chat/welcome` and `POST /api/chat/folder-brief` endpoints |
| `public/index.html` | Call welcome on page load; call folder-brief after folder selection; render both as assistant bubbles |

### New API Endpoints
| Endpoint | Description |
|----------|-------------|
| `GET /api/chat/welcome` | Returns an AI-generated welcome message explaining the app and its capabilities |
| `POST /api/chat/folder-brief` `{ folderName, fileCount, fileSummary }` | Returns an AI-generated folder briefing with file breakdown and suggestions |

### Data Flow

**Welcome:**
```
Page loads
  → GET /api/chat/welcome
  → OpenAI prompt: "Introduce yourself as AskEffi, explain what this app does
    (OneDrive file assistant), list what you can help with"
  → Returns { message }
  → Rendered as first assistant bubble (no user message before it)
```

**Folder briefing:**
```
User clicks a folder in the tree
  → POST /api/onedrive/focus succeeds → returns { fileCount, fileSummary }
  → Frontend calls POST /api/chat/folder-brief { folderName, fileCount, fileSummary }
  → OpenAI prompt: "Briefly summarize this folder selection for the user:
    folder name, file count, type breakdown. Suggest what they can ask about."
  → Returns { message }
  → Appended as new assistant bubble in existing conversation
```

## Decisions Made
- AI-generated (not hardcoded) — more natural and conversational
- Same bubble style as regular messages — no special UI treatment
- Welcome replaces the hardcoded "Hi! I'm your AI assistant..." message
- Folder briefing only fires on new folder selection, not on refresh
- `fileSummary` passed to folder-brief endpoint is the existing metadata summary already built by the server — no extra API calls to OneDrive
