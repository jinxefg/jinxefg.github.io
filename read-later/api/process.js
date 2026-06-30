// Vercel serverless function (Node.js runtime).
// Keeps the Anthropic API key server-side — the browser never sees it.
// Requires the ANTHROPIC_API_KEY environment variable to be set in your
// Vercel project (Settings → Environment Variables) or in a local .env file
// when using `vercel dev`.

const VALID_CATEGORIES = ["Tech", "Science", "Business", "Politics", "Culture", "Health", "Other"];

export default async function handler(req, res) {
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return res.status(405).json({ error: "Method not allowed" });
  }

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return res.status(500).json({ error: "Server is missing ANTHROPIC_API_KEY" });
  }

  const { content, source } = req.body || {};
  if (!content || typeof content !== "string" || !content.trim()) {
    return res.status(400).json({ error: "Missing content" });
  }

  const prompt =
    `You are processing a saved article/clip for a read-later app.\n\nContent:\n"""\n${content.slice(0, 3000)}\n"""\nSource: ${source || "unknown"}\n\nReturn ONLY valid JSON, no markdown:\n{"title":"concise title max 80 chars","category":"Tech|Science|Business|Politics|Culture|Health|Other","summary":"2-3 sentence summary of key points"}`;

  try {
    const anthropicRes = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: "claude-sonnet-4-6",
        max_tokens: 1000,
        messages: [{ role: "user", content: prompt }],
      }),
    });

    if (!anthropicRes.ok) {
      const errText = await anthropicRes.text().catch(() => "");
      console.error("Anthropic API error:", anthropicRes.status, errText);
      return res.status(502).json({ error: "AI service request failed" });
    }

    const data = await anthropicRes.json();
    const raw = (data.content || []).map((b) => b.text || "").join("") || "{}";
    const cleaned = raw.replace(/```json|```/g, "").trim();

    let meta;
    try {
      meta = JSON.parse(cleaned);
    } catch {
      console.error("Failed to parse model output as JSON:", cleaned);
      return res.status(502).json({ error: "AI returned an unexpected format" });
    }

    const title = typeof meta.title === "string" && meta.title.trim()
      ? meta.title.slice(0, 80)
      : "Untitled";
    const category = VALID_CATEGORIES.includes(meta.category) ? meta.category : "Other";
    const summary = typeof meta.summary === "string" ? meta.summary : "";

    return res.status(200).json({ title, category, summary });
  } catch (err) {
    console.error("processWithAI error:", err);
    return res.status(500).json({ error: "Unexpected server error" });
  }
}
