const fs = require('fs');
const path = require('path');

const LOG_DIR = path.join(__dirname, 'logs');
const LOG_FILE = path.join(LOG_DIR, 'activity.log');
const MAX_AGE_MS = 7 * 24 * 60 * 60 * 1000; // 7 days

function ensureLogDir() {
  if (!fs.existsSync(LOG_DIR)) fs.mkdirSync(LOG_DIR);
}

function log(event, sessionId, details = {}) {
  ensureLogDir();
  const entry = JSON.stringify({
    timestamp: new Date().toISOString(),
    event,
    session: sessionId || 'unknown',
    details,
  });
  fs.appendFileSync(LOG_FILE, entry + '\n');
}

function cleanup() {
  if (!fs.existsSync(LOG_FILE)) return;
  const cutoff = Date.now() - MAX_AGE_MS;
  const lines = fs.readFileSync(LOG_FILE, 'utf8').split('\n').filter(Boolean);
  const kept = lines.filter(line => {
    try {
      return new Date(JSON.parse(line).timestamp).getTime() >= cutoff;
    } catch {
      return false;
    }
  });
  fs.writeFileSync(LOG_FILE, kept.join('\n') + (kept.length ? '\n' : ''));
}

function readAll() {
  if (!fs.existsSync(LOG_FILE)) return [];
  return fs.readFileSync(LOG_FILE, 'utf8')
    .split('\n')
    .filter(Boolean)
    .map(line => { try { return JSON.parse(line); } catch { return null; } })
    .filter(Boolean)
    .reverse();
}

// Cleanup on startup and every 24h
cleanup();
setInterval(cleanup, 24 * 60 * 60 * 1000);

module.exports = { log, readAll };
