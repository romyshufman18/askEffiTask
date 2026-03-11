const { getFileMetadata, getFolderChildren } = require('../onedrive');

const MOCK_TOKEN = 'fake-token';
const MOCK_ROOT_ID = 'root-folder-id';
const MOCK_FOLDER_ID = 'sub-folder-id';

// Mock global fetch
global.fetch = jest.fn();

beforeEach(() => {
  fetch.mockReset();
});

function mockFetch(responses) {
  let call = 0;
  fetch.mockImplementation(() => Promise.resolve({
    json: () => Promise.resolve(responses[call++] || {}),
  }));
}

describe('getFolderChildren()', () => {
  test('resolves root ID and returns only folders', async () => {
    mockFetch([
      { id: MOCK_ROOT_ID },  // resolveRootId
      { value: [
        { id: 'f1', name: 'Budget', folder: { childCount: 2 } },
        { id: 'f2', name: 'report.docx' }, // no folder facet — should be filtered out
      ]},
    ]);

    const result = await getFolderChildren(MOCK_TOKEN, null);
    expect(result).toHaveLength(1);
    expect(result[0].name).toBe('Budget');
  });

  test('uses provided itemId directly (no root resolution)', async () => {
    mockFetch([
      { value: [{ id: 'f1', name: 'SubFolder', folder: { childCount: 0 } }] },
    ]);

    const result = await getFolderChildren(MOCK_TOKEN, MOCK_FOLDER_ID);
    expect(fetch).toHaveBeenCalledTimes(1);
    expect(result).toHaveLength(1);
    expect(result[0].name).toBe('SubFolder');
  });

  test('returns empty array when no children', async () => {
    mockFetch([{ value: [] }]);
    const result = await getFolderChildren(MOCK_TOKEN, MOCK_FOLDER_ID);
    expect(result).toEqual([]);
  });

  test('returns empty array when value is missing in response', async () => {
    mockFetch([{}]);
    const result = await getFolderChildren(MOCK_TOKEN, MOCK_FOLDER_ID);
    expect(result).toEqual([]);
  });
});

describe('getFileMetadata()', () => {
  test('resolves root ID when no folderId given', async () => {
    mockFetch([
      { id: MOCK_ROOT_ID },  // resolveRootId
      { value: [{ name: 'file.docx', size: 500 }] },
    ]);

    const result = await getFileMetadata(MOCK_TOKEN, null);
    expect(fetch).toHaveBeenCalledTimes(2);
    expect(result).toHaveLength(1);
    expect(result[0].name).toBe('file.docx');
  });

  test('uses provided folderId directly', async () => {
    mockFetch([
      { value: [{ name: 'report.pdf', size: 1024 }] },
    ]);

    const result = await getFileMetadata(MOCK_TOKEN, MOCK_FOLDER_ID);
    expect(fetch).toHaveBeenCalledTimes(1);
    expect(result[0].name).toBe('report.pdf');
  });

  test('returns empty array when value is missing', async () => {
    mockFetch([{}]);
    const result = await getFileMetadata(MOCK_TOKEN, MOCK_FOLDER_ID);
    expect(result).toEqual([]);
  });
});
