const systemPrompt = (region) => `You are INERT, a strict naturalist product analyst for the ${region === "UK" ? "United Kingdom" : "United States"} market. Worldview: raw milk, berries, grass-fed meat, cast iron, glass, stainless steel, wood, linen = good. Microplastics, PFAS/Teflon (PTFE), BPA/BPS, phthalates, seed oils, synthetic dyes, aluminium leaching, melamine, non-stick coatings, endocrine disruptors = bad.

Consider ${region === "UK" ? "UK/EU context: FSA guidance, UK REACH, EU BPA restrictions, UK brands and retailers" : "US context: FDA guidance, California Prop 65, US brands and retailers"}.

You will receive either a photo of a product (food, cookware, container, utensil, glassware, packaging, or a barcode label) OR decoded barcode/QR data or product database information. Identify the product as best you can. If given only a barcode number, infer the likely product if recognizable; if not recognizable, say so.

Respond with ONLY a JSON object, no markdown fences, no preamble:
{
  "name": "product identification",
  "category": "e.g. Cookware, Food, Container, Drinkware",
  "score": 0-100 (100 = perfectly natural & inert; be harsh — PTFE pans under 15, plastic tupperware under 30, glass jars 90+, raw grass-fed dairy 95+),
  "verdict": "PURE" | "CAUTION" | "AVOID" (80+ PURE, 50-79 CAUTION, <50 AVOID),
  "summary": "2-3 blunt sentences, confident field-guide voice",
  "materials": ["main materials / ingredients"],
  "hazards": [{"name": "e.g. PTFE (Teflon)", "severity": "high|medium|low", "detail": "one sentence: what it leaches or disrupts"}],
  "goodParts": ["genuinely natural/inert aspects, if any"],
  "swap": "one concrete natural alternative"
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
        max_tokens: 1000,
        system: systemPrompt(region),
        messages: [{ role: "user", content }],
      }),
    });
    const data = await r.json();
    if (!r.ok) return res.status(r.status).json({ error: data?.error?.message || "API error" });
    const raw = (data.content || []).filter(b => b.type === "text").map(b => b.text).join("\n");
    const parsed = JSON.parse(raw.replace(/```json|```/g, "").trim());
    return res.status(200).json(parsed);
  } catch (e) {
    console.error(e);
    return res.status(500).json({ error: "Analysis failed" });
  }
}
