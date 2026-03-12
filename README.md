# AskEffi

A ChatGPT-powered assistant for exploring and asking questions about your OneDrive files.

## What it does

- Connects to your Microsoft OneDrive account
- Lets you browse and focus on specific folders
- Answers questions about your files using AI (file names, sizes, dates, types)
- Proactively introduces itself on load and summarizes each folder you select
- Logs all activity to a local file, viewable in an admin panel

## Features

| Feature | Description |
|---------|-------------|
| OneDrive connection | OAuth login via Microsoft, folder tree browser |
| Folder focus | Select any subfolder to scope the AI's knowledge |
| AI chat | Ask questions about your files — the AI knows their metadata |
| Proactive messages | AI welcome on load; folder briefing on each folder selection |
| Activity logging | All chats and folder selections logged to `logs/activity.log` |
| Admin viewer | View logs at `/admin/logs` |

## Requirements

- [Node.js](https://nodejs.org) v18+
- An [OpenAI API key](https://platform.openai.com/api-keys)
- A Microsoft Azure app registration (for OneDrive OAuth)

## Setup

1. **Clone the repo and install dependencies**
   ```bash
   npm install
   ```

2. **Create a `.env` file** in the project root:
   ```
   OPENAI_API_KEY=your_openai_api_key_here
   SESSION_SECRET=your_session_secret
   MICROSOFT_CLIENT_ID=your_azure_client_id
   MICROSOFT_CLIENT_SECRET=your_azure_client_secret
   REDIRECT_URI=http://localhost:3000/auth/onedrive/callback
   PORT=3000
   ```

3. **Start the server**
   ```bash
   npm start
   ```

4. **Open your browser** and go to [http://localhost:3000](http://localhost:3000)

## Development

Auto-restart on file changes:
```bash
npm run dev
```

Run tests:
```bash
npm test
```

## Project structure

```
askEffiTask/
├── server.js          # Express server + API endpoints
├── auth.js            # Microsoft OAuth flow
├── onedrive.js        # Microsoft Graph API helpers
├── logger.js          # Activity logging (NDJSON)
├── public/
│   ├── index.html     # Chat UI + folder tree
│   └── admin.html     # Log viewer
├── logs/              # Activity logs (gitignored)
├── tests/             # Jest unit tests
└── .claude/specs/     # Feature specs
```

## API endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/onedrive/status` | OneDrive connection status |
| GET | `/api/onedrive/folders` | List subfolders |
| POST | `/api/onedrive/focus` | Set active folder |
| POST | `/api/chat` | Send a chat message |
| GET | `/api/chat/welcome` | AI-generated welcome message |
| POST | `/api/chat/folder-brief` | AI-generated folder summary |
| GET | `/admin/logs` | Admin log viewer UI |
| GET | `/api/admin/logs` | Raw log data (JSON) |
