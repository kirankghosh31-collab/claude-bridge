import { createServer } from "node:http";
import Anthropic from "@anthropic-ai/sdk";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/streamableHttp.js";
import { z } from "zod";

if (!process.env.ANTHROPIC_API_KEY) throw new Error("ANTHROPIC_API_KEY is required");
const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

function makeMcp() {
  const server = new McpServer(
    { name: "claude-bridge", version: "0.1.0" },
    { instructions: "Use ask_claude when the user explicitly asks Claude for a second opinion, review, critique, or collaboration." }
  );

  server.registerTool(
    "ask_claude",
    {
      title: "Ask Claude",
      description: "Send a question and optional context to Claude and return Claude's response. Use when the user explicitly asks to consult or collaborate with Claude.",
      inputSchema: {
        question: z.string().min(1).describe("The question or task for Claude"),
        context: z.string().optional().describe("Relevant context Claude needs; do not include secrets")
      },
      annotations: { readOnlyHint: true, openWorldHint: true }
    },
    async ({ question, context }) => {
      try {
        const prompt = context ? `Context from ChatGPT:\n${context}\n\nTask:\n${question}` : question;
        const message = await anthropic.messages.create({
          model: process.env.CLAUDE_MODEL || "claude-opus-5-5",
          max_tokens: 4096,
          messages: [{ role: "user", content: prompt }]
        });
        const answer = message.content.filter(b => b.type === "text").map(b => b.text).join("\n");
        return { content: [{ type: "text", text: answer || "Claude returned no text response." }] };
      } catch (err) {
        return { isError: true, content: [{ type: "text", text: `Claude call failed: ${err?.message || String(err)}` }] };
      }
    }
  );
  return server;
}

const httpServer = createServer(async (req, res) => {
  if (req.url === "/health") {
    res.writeHead(200, { "content-type": "application/json" });
    return res.end(JSON.stringify({ ok: true }));
  }
  if (req.url !== "/mcp") {
    res.writeHead(404); return res.end("Not found");
  }
  const mcp = makeMcp();
  const transport = new StreamableHTTPServerTransport({ sessionIdGenerator: undefined });
  res.on("close", () => { transport.close(); mcp.close(); });
  await mcp.connect(transport);
  await transport.handleRequest(req, res);
});

const port = Number(process.env.PORT || 3000);
httpServer.listen(port, "0.0.0.0", () => console.log(`Claude bridge listening on :${port}/mcp`));
