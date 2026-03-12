require('dotenv').config();
const express = require('express');
const session = require('express-session');
const OpenAI = require('openai');
const authRouter = require('./auth');
const { getFileMetadata, getFolderChildren } = require('./onedrive');
const logger = require('./logger');

const app = express();
app.use(express.json());
app.use(express.static('public'));

app.use(session({
  secret: process.env.SESSION_SECRET || 'askeffichat-secret',
  resave: false,
  saveUninitialized: false,
  cookie: { secure: false },
}));

app.use('/auth', authRouter);

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

const DATE_FORMAT_OPTIONS = { year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit' };
function formatDate(iso) {
  return iso ? new Date(iso).toLocaleDateString('en-US', DATE_FORMAT_OPTIONS) : 'unknown';
}

function buildFileSummary(files) {
  return files.map(f => {
    const type = f.folder ? 'folder' : (f.file?.mimeType || 'file');
    const size = f.size != null ? `${Math.round(f.size / 1024)} KB` : '';
    const path = f.parentReference?.path
      ? f.parentReference.path.replace('/drive/root:', '') || '/'
      : '/';
    const created = formatDate(f.fileSystemInfo?.createdDateTime);
    const modified = formatDate(f.fileSystemInfo?.lastModifiedDateTime);
    const url = f.webUrl ? `, url: ${f.webUrl}` : '';
    return `- ${f.name} (type: ${type}${size ? ', size: ' + size : ''}, path: ${path}, created: ${created}, last modified: ${modified}${url})`;
  }).join('\n');
}

app.get('/api/onedrive/status', (req, res) => {
  res.json({
    connected: !!req.session.onedrive_token,
    folderId: req.session.onedrive_folder_id || null,
    folderName: req.session.onedrive_folder_name || null,
  });
});

app.get('/api/onedrive/folders', async (req, res) => {
  if (!req.session.onedrive_token) return res.status(401).json({ error: 'Not connected' });
  try {
    const folders = await getFolderChildren(req.session.onedrive_token, req.query.itemId);
    res.json(folders.map(f => ({ id: f.id, name: f.name, childCount: f.folder?.childCount ?? 0 })));
  } catch (err) {
    console.error('Folder list error:', err);
    logger.log('error', req.session.id, { endpoint: '/api/onedrive/folders', error: err.message });
    res.status(500).json({ error: 'Failed to list folders' });
  }
});

app.post('/api/onedrive/focus', async (req, res) => {
  const { folderId, folderName } = req.body;
  req.session.onedrive_folder_id = folderId || null;
  req.session.onedrive_folder_name = folderName || null;
  req.session.onedrive_file_summary = null;

  let fileCount = null;
  try {
    const files = await getFileMetadata(req.session.onedrive_token, folderId || null);
    req.session.onedrive_file_summary = buildFileSummary(files);
    fileCount = files.filter(f => !f.folder).length;
  } catch (err) {
    console.error('Focus pre-fetch error:', err);
    logger.log('error', req.session.id, { endpoint: '/api/onedrive/focus', error: err.message });
  }

  const isRefresh = !!(folderId && folderId === req.session.onedrive_folder_id);
  logger.log(isRefresh ? 'folder_refresh' : 'folder_select', req.session.id, {
    folderName: folderName || 'Documents',
    fileCount,
  });

  req.session.save(() => res.json({ ok: true, fileCount, fileSummary: req.session.onedrive_file_summary || '' }));
});

app.post('/api/chat', async (req, res) => {
  const { messages } = req.body;
  if (!messages || !Array.isArray(messages)) {
    return res.status(400).json({ error: 'Invalid messages format' });
  }

  const systemMessages = [];

  if (req.session.onedrive_token) {
    try {
      if (!req.session.onedrive_file_summary) {
        const files = await getFileMetadata(req.session.onedrive_token, req.session.onedrive_folder_id);
        req.session.onedrive_file_summary = buildFileSummary(files);
      }
      systemMessages.push({
        role: 'system',
        content: `The user has connected their OneDrive. Here are their files (metadata only — no file contents):\n\n${req.session.onedrive_file_summary}\n\nUse this information to answer questions about their files. Do not invent files that are not listed.`,
      });
    } catch (err) {
      console.error('OneDrive metadata fetch error:', err);
    }
  }

  const userPrompt = messages[messages.length - 1]?.content || '';
  try {
    const completion = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [...systemMessages, ...messages],
    });
    const reply = completion.choices[0].message;
    logger.log('chat', req.session.id, {
      prompt: userPrompt,
      response: reply.content,
      folderScope: req.session.onedrive_folder_name || (req.session.onedrive_token ? 'Documents' : null),
    });
    res.json({ message: reply });
  } catch (err) {
    console.error(err);
    logger.log('error', req.session.id, { endpoint: '/api/chat', error: err.message });
    res.status(500).json({ error: err.message || 'OpenAI API error' });
  }
});

app.get('/api/chat/welcome', async (req, res) => {
  try {
    const completion = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [{
        role: 'user',
        content: 'Introduce yourself as AskEffi, a friendly AI assistant for OneDrive files. Explain what the app does (helps users explore and ask questions about their OneDrive files), and list 3–4 things you can help with. Keep it short and conversational.',
      }],
    });
    res.json({ message: completion.choices[0].message.content });
  } catch (err) {
    console.error('Welcome error:', err);
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/chat/folder-brief', async (req, res) => {
  const { folderName, fileCount, fileSummary } = req.body;
  try {
    const completion = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [{
        role: 'user',
        content: `The user just selected the folder "${folderName}". It contains ${fileCount} file(s). Here is the file list:\n${fileSummary}\n\nBriefly tell the user what's in this folder: mention the folder name, file count, and a breakdown by file type. Then suggest 2–3 things they can ask about. Keep it short and friendly.`,
      }],
    });
    res.json({ message: completion.choices[0].message.content });
  } catch (err) {
    console.error('Folder brief error:', err);
    res.status(500).json({ error: err.message });
  }
});

app.get('/admin/logs', (req, res) => {
  res.sendFile(__dirname + '/public/admin.html');
});

app.get('/api/admin/logs', (req, res) => {
  res.json(logger.readAll());
});

if (require.main === module) {
  const PORT = process.env.PORT || 3000;
  app.listen(PORT, () => console.log(`Server running at http://localhost:${PORT}`));
}

module.exports = app;
