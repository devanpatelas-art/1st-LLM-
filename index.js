import "dotenv/config";
import express from "express";
import OpenAI from "openai";

const app = express();
const port = Number(process.env.PORT || 3001);
const model = process.env.OPENAI_MODEL || "gpt-4.1-mini";
const apiKey = process.env.OPENAI_API_KEY;

app.disable("x-powered-by");
app.use(express.json({ limit: "1mb" }));

const SYSTEM_INSTRUCTIONS = `
You are OpenAI API Assistant, a focused technical helper for developers using
the OpenAI API.

Your responsibilities:
- Explain OpenAI API concepts, authentication, models, endpoints, and best practices.
- Provide clear, runnable Python and JavaScript examples when useful.
- Help diagnose errors. Ask for the exact error message and relevant redacted code
  when more information is needed.
- Prefer the official OpenAI SDK and the Responses API for new examples unless
  the user asks about another API or a legacy integration.
- Explain assumptions and flag details that may need checking against current
  official documentation.
- Never ask users to paste API keys, passwords, or other secrets. Ask them to
  redact credentials from logs and code.
- Stay focused on OpenAI API development. For unrelated questions, briefly explain
  your specialization and offer to connect the question back to API development.
- Be friendly, accurate, and practical. Use steps and code blocks when helpful.
`;

const client = apiKey ? new OpenAI({ apiKey }) : null;

app.get("/api/health", (_req, res) => {
  res.json({ ok: true, configured: Boolean(client), model });
});

app.post("/api/chat", async (req, res) => {
  if (!client) {
    return res.status(503).json({
      error: "The server is not configured. Add OPENAI_API_KEY to server/.env and restart it."
    });
  }

  const messages = req.body?.messages;
  if (!Array.isArray(messages) || messages.length === 0 || messages.length > 40) {
    return res.status(400).json({ error: "Send between 1 and 40 chat messages." });
  }

  const allowedRoles = new Set(["user", "assistant"]);
  const sanitizedMessages = [];

  for (const message of messages) {
    if (
      !message ||
      !allowedRoles.has(message.role) ||
      typeof message.content !== "string" ||
      message.content.trim().length === 0 ||
      message.content.length > 12000
    ) {
      return res.status(400).json({
        error: "Each message must have a valid role and non-empty text under 12,000 characters."
      });
    }
    sanitizedMessages.push({
      role: message.role,
      content: message.content.trim()
    });
  }

  if (sanitizedMessages[sanitizedMessages.length - 1].role !== "user") {
    return res.status(400).json({ error: "The latest message must be from the user." });
  }

  try {
    const response = await client.responses.create({
      model,
      instructions: SYSTEM_INSTRUCTIONS,
      input: sanitizedMessages.slice(-20)
    });

    const answer = response.output_text?.trim();
    if (!answer) {
      return res.status(502).json({ error: "The model returned an empty response. Please try again." });
    }

    return res.json({ answer });
  } catch (error) {
    // Keep internal details and credentials out of the browser response.
    console.error("OpenAI request failed:", {
      name: error?.name,
      status: error?.status,
      requestId: error?.request_id
    });

    if (error?.status === 401) {
      return res.status(502).json({ error: "OpenAI authentication failed. Check the server API key." });
    }
    if (error?.status === 429) {
      return res.status(429).json({ error: "The API rate limit or available quota was reached. Check your API account." });
    }
    return res.status(502).json({ error: "The assistant could not complete the request. Check the server logs and try again." });
  }
});

app.listen(port, () => {
  console.log(`OpenAI API Assistant server listening on http://localhost:${port}`);
  console.log(`Model: ${model}`);
  if (!apiKey) console.warn("OPENAI_API_KEY is not set. Add it to server/.env.");
});
