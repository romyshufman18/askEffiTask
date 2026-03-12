# Bug Log: File Content Chat Feature

**Date:** 2026-03-11
**Feature:** `feature/file-content-chat` — AI reads file contents from OneDrive when user mentions a filename

---

## Bug 1: Filename detection too strict (exact match only)

**Symptom:** User typed "summarize me the cover letter" — AI replied "I don't have access to the contents of your files."

**Root cause:** Detection logic used `userPrompt.includes(f.name)` — required the full filename in the prompt. "cover letter" did not match "Cover Letter- Romy Shufman.docx".

**Fix:** Added fuzzy matching — split prompt into words, filter stop words, check if any significant word appears in the filename base (without extension).

```js
const promptWords = promptLower.split(/\W+/).filter(w => w.length >= 2 && !STOP_WORDS.has(w));
return promptWords.some(w => nameBase.includes(w));
```

---

## Bug 2: `itemId` was `undefined` in Graph API URL

**Symptom:** `GET /me/drive/items/undefined/content` → 404 Not Found

**Root cause:** The `$select` fields in `getFileMetadata` delta query did not include `id`:
```js
const SELECT = 'name,size,fileSystemInfo,file,folder,parentReference,webUrl';
```
So `f.id` was `undefined` when building the file list.

**Fix:** Added `id` to SELECT:
```js
const SELECT = 'id,name,size,fileSystemInfo,file,folder,parentReference,webUrl';
```

---

## Bug 3: `?format=html` conversion not supported for uploaded/synced files

**Symptom:** `GET /me/drive/items/{id}/content?format=html` → 406 Not Acceptable, `Sandbox_InputFormatNotSupported`

**Root cause:** Graph API's `?format=html` conversion only works for files natively created in OneDrive (via Office Online). Files uploaded or synced from a local PC are not supported.

**Fix:** Replaced Graph API conversion with local library-based extraction:
- `.docx` / `.doc` → `mammoth.extractRawText({ buffer })`
- `.pdf` → `pdf-parse(buffer)`
- `.txt` / `.csv` / `.md` → `buffer.toString('utf8')`

---

## Bug 4: `.pptx`, `.ppt`, `.xlsx` listed as readable but unhandled

**Symptom:** Not encountered by user yet, but code review revealed these types were in `READABLE_TYPES` and would fall through to `buffer.toString('utf8')`, producing garbled binary ZIP data sent to the AI.

**Fix:** Removed `.pptx`, `.ppt`, `.xlsx` from `READABLE_TYPES` until proper extraction libraries are added. They now return `{ readable: false, reason: 'unsupported_type' }` with a clear user message.

---

## Bug 5: Fuzzy match picks wrong file when multiple filenames share common words

**Symptom:** User typed "CV- Romy Shufman- 2026.pdf summarize it shortly." — AI summarized "Cover Letter- Romy Shufman.docx" instead. Logs showed `result: true` but wrong file injected.

**Root cause:** `fileList.find()` runs exact check and fuzzy check together in one pass. "Cover Letter- Romy Shufman.docx" appeared first in the list and matched fuzzy on "romy"/"shufman" before the CV file could be checked for exact match.

**Fix:** Split into two passes — exact match first, fuzzy only if no exact match found:

```js
let mentionedFile = fileList.find(f => promptLower.includes(f.name.toLowerCase()));
if (!mentionedFile) {
  mentionedFile = fileList.find(f => {
    const nameBase = f.name.toLowerCase().replace(/\.[^.]+$/, '');
    return promptWords.some(w => nameBase.includes(w));
  });
}
```

---

## Bug 6: `pdf-parse` v2 incompatible API

**Symptom:** `TypeError: pdfParse is not a function` when trying to read a PDF file.

**Root cause:** `pdf-parse@^2.x` exports a class-based API (`{ PDFParse, AbortException, ... }`) — not a callable function. The code assumed v1's `require('pdf-parse')` → function pattern.

**Fix:** Downgraded to `pdf-parse@1`:
```bash
npm install pdf-parse@1
```
v1 exports the parse function directly, matching the existing usage: `pdfParse(buffer)`.

---

## Remaining known limitations

| File type | Status |
|-----------|--------|
| `.docx` / `.doc` | ✅ Supported via `mammoth` |
| `.pdf` | ✅ Supported via `pdf-parse` |
| `.txt` / `.csv` / `.md` | ✅ Supported |
| `.pptx` / `.ppt` | ✅ Supported via `officeparser` |
| `.xlsx` | ❌ Not yet supported — returns "unsupported file type" |
| Images / video / audio | ❌ By design — returns "unsupported file type" |
