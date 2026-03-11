const request = require('supertest');

// Mock logger so tests don't write to disk
jest.mock('../logger', () => ({
  log: jest.fn(),
  readAll: jest.fn(() => [
    { timestamp: '2026-03-11T10:00:00Z', event: 'chat', session: 'abc', details: { prompt: 'hi' } },
  ]),
}));

// Mock onedrive so tests don't call Graph API
jest.mock('../onedrive', () => ({
  getFileMetadata: jest.fn(async () => [
    { name: 'file.docx', size: 1024, file: { mimeType: 'application/docx' }, fileSystemInfo: {}, parentReference: {} },
  ]),
  getFolderChildren: jest.fn(async () => [
    { id: 'folder1', name: 'Budget', folder: { childCount: 2 } },
  ]),
}));

// Mock OpenAI
jest.mock('openai', () => {
  return jest.fn().mockImplementation(() => ({
    chat: {
      completions: {
        create: jest.fn(async () => ({
          choices: [{ message: { role: 'assistant', content: 'Hello!' } }],
        })),
      },
    },
  }));
});

let app;
beforeAll(() => {
  app = require('../server');
});

describe('GET /api/onedrive/status', () => {
  test('returns connected: false when no session', async () => {
    const res = await request(app).get('/api/onedrive/status');
    expect(res.status).toBe(200);
    expect(res.body.connected).toBe(false);
    expect(res.body.folderId).toBeNull();
    expect(res.body.folderName).toBeNull();
  });
});

describe('GET /api/onedrive/folders', () => {
  test('returns 401 when not connected', async () => {
    const res = await request(app).get('/api/onedrive/folders');
    expect(res.status).toBe(401);
    expect(res.body.error).toBe('Not connected');
  });
});

describe('POST /api/chat', () => {
  test('returns 400 when messages missing', async () => {
    const res = await request(app).post('/api/chat').send({});
    expect(res.status).toBe(400);
    expect(res.body.error).toBe('Invalid messages format');
  });

  test('returns 400 when messages is not an array', async () => {
    const res = await request(app).post('/api/chat').send({ messages: 'hello' });
    expect(res.status).toBe(400);
  });

  test('returns assistant message for valid request', async () => {
    const res = await request(app)
      .post('/api/chat')
      .send({ messages: [{ role: 'user', content: 'hi' }] });
    expect(res.status).toBe(200);
    expect(res.body.message.content).toBe('Hello!');
  });
});

describe('GET /api/admin/logs', () => {
  test('returns array of log entries', async () => {
    const res = await request(app).get('/api/admin/logs');
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
    expect(res.body[0].event).toBe('chat');
  });
});

describe('GET /admin/logs', () => {
  test('serves admin.html', async () => {
    const res = await request(app).get('/admin/logs');
    expect(res.status).toBe(200);
    expect(res.text).toContain('Activity Logs');
  });
});
