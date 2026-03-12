const mammoth = require('mammoth');
const pdfParse = require('pdf-parse');

const GRAPH_BASE = 'https://graph.microsoft.com/v1.0';
const FOLDER = process.env.ONEDRIVE_FOLDER || 'documents';
const SELECT = 'id,name,size,fileSystemInfo,file,folder,parentReference,webUrl';

async function resolveRootId(accessToken) {
  const headers = { Authorization: `Bearer ${accessToken}` };
  // Resolve special folder ID — handles localized names (e.g. "מסמכים" = "documents")
  const res = await fetch(`${GRAPH_BASE}/me/drive/special/${FOLDER}`, { headers });
  const data = await res.json();
  return data.id;
}

async function getFileMetadata(accessToken, folderId) {
  const headers = { Authorization: `Bearer ${accessToken}` };
  const id = folderId || await resolveRootId(accessToken);
  const deltaRes = await fetch(
    `${GRAPH_BASE}/me/drive/items/${id}/delta?$select=${SELECT}&$top=200`,
    { headers }
  );
  const data = await deltaRes.json();
  return data.value || [];
}

async function getFolderChildren(accessToken, itemId) {
  const headers = { Authorization: `Bearer ${accessToken}` };
  const id = itemId || await resolveRootId(accessToken);
  const res = await fetch(
    `${GRAPH_BASE}/me/drive/items/${id}/children?$select=name,id,folder&$top=200`,
    { headers }
  );
  const data = await res.json();
  return (data.value || []).filter(item => item.folder);
}

const MAX_FILE_SIZE = 500 * 1024; // 500KB

const EXTENSION_MIME = {
  '.docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  '.doc':  'application/msword',
  '.pptx': 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
  '.ppt':  'application/vnd.ms-powerpoint',
  '.xlsx': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  '.txt':  'text/plain',
  '.csv':  'text/csv',
  '.md':   'text/markdown',
  '.pdf':  'application/pdf',
};

// Only types we can actually extract text from
const READABLE_TYPES = new Set([
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document', // .docx
  'application/msword',  // .doc
  'application/pdf',
  'text/plain',
  'text/csv',
  'text/markdown',
]);

async function getFileContent(accessToken, itemId, size, mimeType, filename) {
  console.log(`[getFileContent] filename="${filename}" size=${size} mimeType="${mimeType}"`);

  if (size > MAX_FILE_SIZE) {
    console.log(`[getFileContent] SKIP: too_large (${size} > ${MAX_FILE_SIZE})`);
    return { readable: false, reason: 'too_large' };
  }

  // Fall back to extension-based type detection if mimeType is missing
  if (!mimeType && filename) {
    const ext = filename.slice(filename.lastIndexOf('.')).toLowerCase();
    mimeType = EXTENSION_MIME[ext] || '';
    console.log(`[getFileContent] mimeType resolved from extension "${ext}" → "${mimeType}"`);
  }

  if (!READABLE_TYPES.has(mimeType)) {
    console.log(`[getFileContent] SKIP: unsupported_type "${mimeType}"`);
    return { readable: false, reason: 'unsupported_type' };
  }

  const headers = { Authorization: `Bearer ${accessToken}` };

  const url = `${GRAPH_BASE}/me/drive/items/${itemId}/content`;
  console.log(`[getFileContent] fetching content from Graph API...`);
  const res = await fetch(url, { headers });
  console.log(`[getFileContent] fetch response: status=${res.status} ok=${res.ok} url=${res.url}`);
  if (!res.ok) return { readable: false, reason: 'fetch_error' };

  const arrayBuf = await res.arrayBuffer();
  const buffer = Buffer.from(arrayBuf);
  console.log(`[getFileContent] buffer size=${buffer.length} bytes`);

  if (mimeType.includes('wordprocessingml') || mimeType === 'application/msword') {
    console.log(`[getFileContent] parsing with mammoth...`);
    const result = await mammoth.extractRawText({ buffer });
    console.log(`[getFileContent] mammoth done: text length=${result.value.length}, messages=${JSON.stringify(result.messages)}`);
    return { readable: true, text: result.value };
  }

  if (mimeType === 'application/pdf') {
    const result = await pdfParse(buffer);
    return { readable: true, text: result.text };
  }

  // Plain text types
  return { readable: true, text: buffer.toString('utf8') };
}

module.exports = { getFileMetadata, getFolderChildren, getFileContent };
