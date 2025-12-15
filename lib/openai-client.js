// Client-side OpenAI API call
// ⚠️ WARNING: This exposes your API key in the browser!
// Only use this for GitHub Pages deployment. For production, use server-side API routes.

import OpenAI from "openai";

export async function analyzeTextClientSide(text, apiKey) {
  if (!apiKey) {
    throw new Error("OpenAI API key is required");
  }

  const client = new OpenAI({
    apiKey: apiKey,
    dangerouslyAllowBrowser: true, // Required for client-side usage
  });

  const response = await client.chat.completions.create({
    model: "gpt-4o",
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
      { role: "user", content: text },
    ],
  });

  return JSON.parse(response.choices[0].message.content);
}

