# Claude.md – AskEffi Chat App

## Overview
This project is a web application with two planned pages:
1. **Chat Page** – Users chat with a ChatGPT-powered agent. *(implemented)*
2. **OneDrive Login Page** – Users authenticate with Microsoft to allow the chat to access their OneDrive files. *(planned)*

The ChatGPT agent can provide answers, analyze file contents, and interact intelligently once OneDrive access is granted. It can only read files from the OneDrive account — it cannot write, edit, or delete them.

## Tech Stack
- **Frontend:** Plain HTML/CSS/JavaScript (single page, no framework)
- **Backend:** Node.js + Express (`server.js`)
- **AI:** OpenAI API (`gpt-4o-mini` model)
- **Config:** dotenv for environment variables

## Project Structure
```
askEffiTask/
├── public/
│   └── index.html      # Chat UI
├── server.js           # Express server + OpenAI proxy
├── package.json
├── .env                # API keys (not committed)
├── .env.example        # Template for .env
├── settings.json       # Claude Code permissions
└── README.md
```

## Coding Conventions
- Keep it simple — no unnecessary frameworks or abstractions
- API key must stay server-side (never expose in frontend)
- Do not write, edit, or delete OneDrive files — read only
- Do not commit `.env` files