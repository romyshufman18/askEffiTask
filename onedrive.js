const GRAPH_BASE = 'https://graph.microsoft.com/v1.0';
const FOLDER = process.env.ONEDRIVE_FOLDER || 'documents';
const SELECT = 'name,size,fileSystemInfo,file,folder,parentReference,webUrl';

async function getFileMetadata(accessToken) {
  const headers = { Authorization: `Bearer ${accessToken}` };

  // Resolve special folder ID — handles localized names (e.g. "מסמכים" = "documents")
  const folderRes = await fetch(`${GRAPH_BASE}/me/drive/special/${FOLDER}`, { headers });
  const folderData = await folderRes.json();
  const folderId = folderData.id;

  const deltaRes = await fetch(
    `${GRAPH_BASE}/me/drive/items/${folderId}/delta?$select=${SELECT}&$top=200`,
    { headers }
  );
  const data = await deltaRes.json();
  return data.value || [];
}

module.exports = { getFileMetadata };
