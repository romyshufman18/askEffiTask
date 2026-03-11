const fs = require('fs');
const path = require('path');
const os = require('os');

// Point logger at a temp dir so tests don't touch real logs
const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'askefi-test-'));
jest.mock('path', () => {
  const real = jest.requireActual('path');
  return { ...real, join: (...args) => {
    if (args.some(a => typeof a === 'string' && a.includes('__dirname'))) return real.join(...args);
    return real.join(...args);
  }};
});

// Override log paths before requiring logger
const LOG_DIR = tmpDir;
const LOG_FILE = path.join(tmpDir, 'activity.log');

// Manually stub the module internals by resetting the module
let logger;
beforeEach(() => {
  jest.resetModules();
  // Patch __dirname in logger to use tmpDir
  jest.doMock('path', () => {
    const real = jest.requireActual('path');
    return {
      ...real,
      join: (...args) => {
        // Redirect logs dir to tmpDir
        const joined = real.join(...args);
        if (joined.includes('logs')) {
          return joined.replace(/.*logs/, tmpDir);
        }
        return joined;
      }
    };
  });
  // Clean up log file before each test
  if (fs.existsSync(LOG_FILE)) fs.unlinkSync(LOG_FILE);
  logger = require('../logger');
});

afterAll(() => {
  fs.rmSync(tmpDir, { recursive: true, force: true });
});

describe('logger.log()', () => {
  test('creates the log file and writes a JSON line', () => {
    logger.log('chat', 'session-1', { prompt: 'hello' });
    expect(fs.existsSync(LOG_FILE)).toBe(true);
    const lines = fs.readFileSync(LOG_FILE, 'utf8').trim().split('\n');
    expect(lines).toHaveLength(1);
    const entry = JSON.parse(lines[0]);
    expect(entry.event).toBe('chat');
    expect(entry.session).toBe('session-1');
    expect(entry.details.prompt).toBe('hello');
    expect(entry.timestamp).toBeDefined();
  });

  test('appends multiple lines', () => {
    logger.log('chat', 's1', { prompt: 'a' });
    logger.log('folder_select', 's1', { folderName: 'Docs' });
    const lines = fs.readFileSync(LOG_FILE, 'utf8').trim().split('\n');
    expect(lines).toHaveLength(2);
  });

  test('uses "unknown" when sessionId is not provided', () => {
    logger.log('error', null, { error: 'oops' });
    const entry = JSON.parse(fs.readFileSync(LOG_FILE, 'utf8').trim());
    expect(entry.session).toBe('unknown');
  });
});

describe('logger.readAll()', () => {
  test('returns empty array when no log file', () => {
    expect(logger.readAll()).toEqual([]);
  });

  test('returns entries in reverse chronological order', () => {
    logger.log('chat', 's1', { prompt: 'first' });
    logger.log('folder_select', 's1', { folderName: 'Budget' });
    const entries = logger.readAll();
    expect(entries).toHaveLength(2);
    expect(entries[0].event).toBe('folder_select'); // most recent first
    expect(entries[1].event).toBe('chat');
  });

  test('skips malformed lines without crashing', () => {
    fs.writeFileSync(LOG_FILE, 'not-json\n{"event":"chat","session":"s1","timestamp":"2026-01-01T00:00:00Z","details":{}}\n');
    const entries = logger.readAll();
    expect(entries).toHaveLength(1);
    expect(entries[0].event).toBe('chat');
  });
});

describe('logger cleanup', () => {
  test('removes entries older than 7 days on require', () => {
    const old = new Date(Date.now() - 8 * 24 * 60 * 60 * 1000).toISOString();
    const recent = new Date().toISOString();
    fs.writeFileSync(LOG_FILE,
      JSON.stringify({ timestamp: old, event: 'chat', session: 's1', details: {} }) + '\n' +
      JSON.stringify({ timestamp: recent, event: 'folder_select', session: 's2', details: {} }) + '\n'
    );
    // Re-require triggers cleanup
    jest.resetModules();
    require('../logger');
    const lines = fs.readFileSync(LOG_FILE, 'utf8').trim().split('\n').filter(Boolean);
    expect(lines).toHaveLength(1);
    expect(JSON.parse(lines[0]).event).toBe('folder_select');
  });
});
