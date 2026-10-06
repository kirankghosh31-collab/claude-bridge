# ChatGPT → Claude Bridge (MVP)

A minimal remote MCP server exposing one tool: `ask_claude`.

## Environment variables
- `ANTHROPIC_API_KEY` — required; store it as a cloud-host secret.
- `CLAUDE_MODEL` — optional; defaults to `claude-opus-5-5`.
- `PORT` — optional; defaults to 3000.

## Run
```bash
npm install
npm start
```

Health check: `/health`  
MCP endpoint: `/mcp`

## Connect to ChatGPT
After deploying to a stable HTTPS host, add `https://YOUR-HOST/mcp` as a custom MCP server in ChatGPT Plugins. OpenAI's current docs describe this setup on ChatGPT web and the quickstart tests it in Work mode.

Do not put the Anthropic API key in source code, ChatGPT prompts, or client-side JavaScript.
