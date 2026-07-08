// Vercel serverless function — keeps your Anthropic API key secret.
// Set ANTHROPIC_API_KEY in Vercel → Project → Settings → Environment Variables.

const systemPrompt = (region) => `You are INERT, a strict naturalist product analyst for the ${region === "UK" ? "United Kingdom" : "United States"} market. Worldview: raw milk, berries, grass-fed meat, cast iron, glass, stainless steel, wood, linen = good. Microplastics, PFAS/Teflon (PTFE), BPA/BPS, phthalates, seed oils, synthetic dyes, aluminium leaching, melamine, non-stick coatings, endocrine disruptors = bad.

Consider ${region === "UK" ? "UK/EU context: FSA guidance, UK REACH, EU BPA restrictions, UK brands and retailers" : "US context: FDA guidance, California Prop 65, US brands and retailers"}.

You will receive either a photo of a product (food, cookware, container, utensil, glassware, packaging, or a barcode label) OR decoded barcode/QR data or product database information.

IMPORTANT — accuracy: if the product is a branded/packaged item and you are not certain of its exact ingredients, use web search to find the retailer's actual published ingredient list before scoring. Never guess ingredients for branded products when a search can confirm them. Base hazards on the real ingredient list.

After any research, respond with ONLY a JSON object as your final answer, no markdown fences, no preamble:
{
  "name": "product identification",
  "category": "e.g. Cookware, Food, Container, Drinkware",
  "score": 0-100 (100 = perfectly natural & inert; be harsh — PTFE pans under 15, plastic-wrapped processed food under 40, glass jars 90+, raw grass-fed dairy 95+),
  "verdict": "AVOID" | "CAUTION" | "GOOD" | "EXCELLENT" (score under 40 = AVOID, 40-59 = CAUTION, 60-79 = GOOD, 80+ = EXCELLENT),
  "summary": "2-3 blunt sentences, confident field-guide voice",
  "materials": ["main materials / actual ingredients"],
  "hazards": [{"name": "e.g. PTFE (Teflon)", "severity": "high|medium|low", "detail": "one sentence: what it leaches or disrupts"}],
  "goodParts": ["genuinely natural/inert aspects, if any"],
  "swap": "the cleanest alternative. If this product is from an identifiable shop, supermarket or takeaway chain, recommend a specific cleaner alternative FROM THAT SAME shop/chain's range (name the product). Otherwise a concrete natural alternative.",
  "homemade": "a short recipe-style description of how to make a cleaner homemade version of this product, naming natural ingredient choices. Only for food/drink; empty string otherwise."
}

If you cannot identify the item, set name "Unidentified", score null, and explain in summary what would help.`;

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).json({ error: "POST only" });

  const { region = "UK", text, image } = req.body || {};
  if (!text && !image) return res.status(400).json({ error: "Provide text or image" });

  const content = text
    ? [{ type: "text", text: `Decoded barcode/QR data: "${text}". Analyse this product. JSON only.` }]
    : [
        { type: "image", source: { type: "base64", media_type: image.mediaType, data: image.data } },
        { type: "text", text: "Analyse this product (read any barcode/QR/label visible). JSON only." },
      ];

  try {
    const r = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": process.env.ANTHROPIC_API_KEY,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: "claude-sonnet-4-6",
        max_tokens: 2000,
        system: systemPrompt(region),
        tools: [{ type: "web_search_20250305", name: "web_search" }],
        messages: [{ role: "user", content }],
      }),
    });
    const data = await r.json();
    if (!r.ok) return res.status(r.status).json({ error: data?.error?.message || "API error" });
    const raw = (data.content || []).filter(b => b.type === "text").map(b => b.text).join("\n");
    // grab the last JSON object in the response (search runs can add commentary)
    const start = raw.indexOf("{");
    const end = raw.lastIndexOf("}");
    if (start === -1 || end === -1) return res.status(500).json({ error: "No JSON in response" });
    const parsed = JSON.parse(raw.slice(start, end + 1));
    return res.status(200).json(parsed);
  } catch (e) {
    console.error(e);
    return res.status(500).json({ error: "Analysis failed" });
  }
}
