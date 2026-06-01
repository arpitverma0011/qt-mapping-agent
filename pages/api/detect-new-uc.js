// pages/api/detect-new-uc.js
// Runs after main mapping — finds clusters of Review Needed tools that suggest new use cases

import Anthropic from "@anthropic-ai/sdk";
import { QT_SYSTEM_PROMPT } from "../../lib/taxonomy";

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) return res.status(500).json({ error: "ANTHROPIC_API_KEY not configured." });

  const { reviewRows } = req.body;
  if (!reviewRows || reviewRows.length < 3) {
    return res.status(200).json({ suggestions: [] });
  }

  const sample = reviewRows.slice(0, 40).map(r => `${r.tool_name}: ${r.notes}`).join("\n");

  const prompt = `These AI tools were marked Review Needed or Out of Taxonomy during QT mapping:\n\n${sample}\n\nAre there 3+ tools sharing a similar function that is NOT in the current QT v3 taxonomy but WOULD be relevant to a marketing/productivity audience?\n\nIf yes, suggest new use cases. If no meaningful clusters found, return [].\n\nReturn ONLY valid JSON:\n[{"use_case_name":"...","suggested_category":"...","reason":"one sentence why this gap exists in current taxonomy","example_tools":"comma-separated tool names"}]`;

  try {
    const client = new Anthropic({ apiKey });
    const message = await client.messages.create({
      model: "claude-opus-4-6",
      max_tokens: 1024,
      messages: [{ role: "user", content: prompt }],
    });

    const text = message.content?.[0]?.text || "[]";
    const clean = text.replace(/```json|```/g, "").trim();
    const suggestions = JSON.parse(clean);

    return res.status(200).json({ suggestions: Array.isArray(suggestions) ? suggestions : [] });
  } catch (err) {
    console.error("New UC detection error:", err);
    return res.status(200).json({ suggestions: [] }); // Non-critical — fail silently
  }
}
