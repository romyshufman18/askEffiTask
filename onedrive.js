const GRAPH_BASE = 'https://graph.microsoft.com/v1.0';
const FOLDER = process.env.ONEDRIVE_FOLDER || 'documents';
const SELECT = 'name,size,fileSystemInfo,file,folder,parentReference,webUrl';

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

module.exports = { getFileMetadata, getFolderChildren };
