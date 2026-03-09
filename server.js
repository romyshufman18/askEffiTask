require('dotenv').config();
const express = require('express');
const session = require('express-session');
const OpenAI = require('openai');
const authRouter = require('./auth');
const { getFileMetadata } = require('./onedrive');

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

app.get('/api/onedrive/status', (req, res) => {
  res.json({ connected: !!req.session.onedrive_token });
});

app.post('/api/chat', async (req, res) => {
  const { messages } = req.body;
  if (!messages || !Array.isArray(messages)) {
    return res.status(400).json({ error: 'Invalid messages format' });
  }

  const systemMessages = [];

  if (req.session.onedrive_token) {
    try {
      const files = await getFileMetadata(req.session.onedrive_token);
      const fileSummary = files.map(f => {
        const type = f.folder ? 'folder' : (f.file?.mimeType || 'file');
        const modified = f.lastModifiedDateTime
          ? new Date(f.lastModifiedDateTime).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit' })
          : 'unknown date';
        const created = f.createdDateTime
          ? new Date(f.createdDateTime).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit' })
          : 'unknown';
        const size = f.size != null ? `${Math.round(f.size / 1024)} KB` : '';
        const path = f.parentReference?.path
          ? f.parentReference.path.replace('/drive/root:', '') || '/'
          : '/';
        return `- ${f.name} (type: ${type}${size ? ', size: ' + size : ''}, path: ${path}, created: ${created}, last modified: ${modified})`;
      }).join('\n');

      systemMessages.push({
        role: 'system',
        content: `The user has connected their OneDrive. Here are their files (metadata only — no file contents):\n\n${fileSummary}\n\nUse this information to answer questions about their files. Do not invent files that are not listed.`,
      });
    } catch (err) {
      console.error('OneDrive metadata fetch error:', err);
    }
  }

  try {
    const completion = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [...systemMessages, ...messages],
    });
    res.json({ message: completion.choices[0].message });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message || 'OpenAI API error' });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server running at http://localhost:${PORT}`));
