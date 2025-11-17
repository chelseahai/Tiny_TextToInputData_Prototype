import OpenAI from "openai";

const client = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export default async function handler(req, res) {
  // Only allow POST requests
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const userText = req.body.text;

    if (!userText) {
      return res.status(400).json({ error: "Text is required" });
    }

    if (!process.env.OPENAI_API_KEY) {
      return res.status(500).json({ error: "OpenAI API key not configured" });
    }

    const response = await client.chat.completions.create({
      model: "gpt-4o", // Note: GPT-5 not yet available, using gpt-4o as fallback
      response_format: { type: "json_object" },
      messages: [
        {
          role: "system",
          content: `You are a garment behavior interpreter. 

Your job is to read a short paragraph describing someone's situation and convert it into 5 normalized values between 0 and 1.

Return only a JSON object like:

{
  "Fit": float,
  "Mesh": float,
  "Thickness": float,
  "Airflow": float,
  "Support": float
}

Use these orientations and meanings:

- Fit: 0 = close/tight, 1 = loose/relaxed
  Influenced by temperature (colder → closer), activity (higher → looser), containment need (higher → closer).

- Mesh: 0 = open/coarse, 1 = fine/tight
  Colder → finer, formal → finer, active → coarser, sleek aesthetics → finer.

- Thickness: 0 = thin, 1 = thick
  Driven by cold temperature, wind speed, and time outdoors.

- Airflow: 0 = most breathable, 1 = least breathable
  Hotter/humid/active → more breathable (lower); cold/outdoor → less breathable (higher).

- Support: 0 = soft/flexible, 1 = rigid/structured
  Driven by physical demand, need for grounding, formality, and environmental instability.

Be consistent, numeric, and concise. 
Output only the JSON, no explanation.`,
        },
        { role: "user", content: userText },
      ],
    });

    const result = JSON.parse(response.choices[0].message.content);
    res.status(200).json(result);
  } catch (error) {
    console.error("API Error:", error);
    res.status(500).json({ 
      error: "Analysis failed.",
      details: error.message 
    });
  }
}

