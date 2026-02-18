export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  const { products, categories } = req.body
  if (!products || !Array.isArray(products) || products.length === 0) {
    return res.status(400).json({ error: 'Missing products array' })
  }

  const apiKey = process.env.GEMINI_API_KEY
  if (!apiKey) {
    return res.status(500).json({ error: 'GEMINI_API_KEY not configured' })
  }

  const categoryList = categories
    .map(c => `- id: "${c.id}", label: "${c.label}", emoji: "${c.emoji}"`)
    .join('\n')

  const prompt = `You are a grocery store categorization assistant.

Existing categories:
${categoryList}

Categorize the following grocery product(s): ${JSON.stringify(products)}

Rules:
1. Use an existing category if it fits well — prefer reusing existing categories.
2. Create a NEW category only if the product truly does not fit any existing category.
3. For new categories: provide a short Hebrew label (2-3 words max), appropriate food/grocery emoji, and an id (lowercase, underscores, no spaces). The label MUST be in Hebrew.
4. The response must be valid JSON — an array with one object per product, in the same order.

Respond with ONLY a JSON array, no explanation:
[{"name": "...", "category_id": "...", "category_label": "...", "category_emoji": "...", "is_new": false}]`

  try {
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`,
      {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: { temperature: 0.1, maxOutputTokens: 1024 },
        }),
      }
    )

    const data = await response.json()

    if (!response.ok) {
      console.error('Gemini API error:', data)
      return res.status(502).json({ error: 'Gemini API error', details: data })
    }

    const text = data.candidates[0].content.parts[0].text.trim()
    // Extract JSON array from response (in case there's any surrounding text)
    const jsonMatch = text.match(/\[[\s\S]*\]/)
    if (!jsonMatch) {
      return res.status(502).json({ error: 'Invalid response from LLM', raw: text })
    }

    const result = JSON.parse(jsonMatch[0])
    return res.status(200).json({ result })
  } catch (err) {
    console.error('Categorize error:', err)
    return res.status(500).json({ error: err.message })
  }
}
