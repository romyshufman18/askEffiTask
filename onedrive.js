const GRAPH_URL =
  'https://graph.microsoft.com/v1.0/me/drive/root/delta' +
  '?$select=name,size,lastModifiedDateTime,file,folder,parentReference&$top=200';

async function getFileMetadata(accessToken) {
  const response = await fetch(GRAPH_URL, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  const data = await response.json();
  return data.value || [];
}

module.exports = { getFileMetadata };
