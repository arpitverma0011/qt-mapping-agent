// pages/api/map.js
// Server-side API route — API key stays on server, never exposed to browser

import Anthropic from "@anthropic-ai/sdk";
import { QT_SYSTEM_PROMPT } from "../../lib/taxonomy";

export const config = {
  api: {
    bodyParser: {
      sizeLimit: "10mb",
    },
  },
};

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  // API key from environment variable (set in Vercel dashboard — never in code)
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return res.status(500).json({ error: "ANTHROPIC_API_KEY not configured. Add it in Vercel → Settings → Environment Variables." });
  }

  const { tools, source, enhancements, mode } = req.body;

  if (!tools || !Array.isArray(tools) || tools.length === 0) {
    return res.status(400).json({ error: "No tools provided" });
  }

  // Source-aware evidence note (enhancement 1)
  const sourceNote = enhancements?.sourceAware
    ? `Data source: ${source || "unknown"}. Evidence quality: ${
        source === "taaft"
          ? "High — TAAFT descriptions average ~1300 chars from official tool pages. Evidence strength: 8/10."
          : source === "aixploria"
          ? "Medium — AIxploria directory snippets average ~120 chars. Evidence strength: 6/10 max per v2.1 Section 6."
          : source === "toolify"
          ? "Medium — Toolify directory listings. Evidence strength: 6/10."
          : "Medium — Custom source. Evidence strength: 6/10 unless description is rich."
      } Adjust evidence strength dimension score accordingly.`
    : "";

  // Build user message
  const userMessage = `Map these ${tools.length} AI tools against the QT v3 taxonomy using v2.1 guidelines.

${sourceNote}

${
  mode === "calibrate"
    ? "CALIBRATION MODE: Be especially precise. These tools are used to validate scoring thresholds."
    : ""
}

Tools to map:
${JSON.stringify(
  tools.map((t, i) => ({
    index: i + 1,
    name: t.name,
    description: t.description || "[No description — flag as Review Needed]",
    url: t.url || "",
  })),
  null,
  2
)}

Return ONLY a valid JSON array. No other text.`;

  try {
    const client = new Anthropic({ apiKey });

    const message = await client.messages.create({
      model: "claude-opus-4-6",
      max_tokens: 4096,
      system: QT_SYSTEM_PROMPT,
      messages: [{ role: "user", content: userMessage }],
    });

    const responseText = message.content?.[0]?.text || "[]";

    // Clean and parse JSON
    const clean = responseText.replace(/```json|```/g, "").trim();
    let parsed;
    try {
      parsed = JSON.parse(clean);
      if (!Array.isArray(parsed)) parsed = [parsed];
    } catch (parseErr) {
      console.error("JSON parse error:", parseErr, "Response:", responseText.slice(0, 500));
      return res.status(500).json({
        error: "Failed to parse Claude response as JSON. Try again.",
        raw: responseText.slice(0, 500),
      });
    }

    return res.status(200).json({ results: parsed });
  } catch (err) {
    console.error("Anthropic API error:", err);

    if (err.status === 401) {
      return res.status(401).json({ error: "Invalid API key. Check ANTHROPIC_API_KEY in Vercel environment variables." });
    }
    if (err.status === 429) {
      return res.status(429).json({ error: "Rate limit hit. Wait 60 seconds and try again." });
    }
    if (err.status === 529) {
      return res.status(529).json({ error: "Anthropic API overloaded. Try again in a moment." });
    }

    return res.status(500).json({ error: err.message || "Unknown API error" });
  }
}
