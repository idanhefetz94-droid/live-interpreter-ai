export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).json({error:"Method not allowed"});
  const pin = req.headers["x-app-pin"] || "";
  if (!process.env.APP_PIN || pin !== process.env.APP_PIN) return res.status(401).json({error:"Unauthorized"});
  if (!process.env.OPENAI_API_KEY) return res.status(500).json({error:"Server API key is not configured"});

  const {text, targetLanguage="Spanish", context="", glossary=""} = req.body || {};
  if (!text || typeof text !== "string") return res.status(400).json({error:"Missing text"});
  if (text.length > 5000) return res.status(400).json({error:"Text too long"});

  const system = `You are a professional live interpreter for business presentations.
Translate the speaker's intended meaning naturally and accurately into ${targetLanguage}.
Prioritize correct grammar, professional phrasing, context and terminology over literal word-for-word translation.
Preserve names, numbers, product names, brands, model names and acronyms.
Use the presentation context and glossary when provided.
Return ONLY the final translation.

Presentation context:
${context}

Glossary:
${glossary}`;

  try {
    const r = await fetch("https://api.openai.com/v1/responses", {
      method:"POST",
      headers:{
        "Authorization":`Bearer ${process.env.OPENAI_API_KEY}`,
        "Content-Type":"application/json"
      },
      body:JSON.stringify({
        model:"gpt-5.6-luna",
        input:[
          {role:"system",content:[{type:"input_text",text:system}]},
          {role:"user",content:[{type:"input_text",text}]}
        ]
      })
    });
    const j = await r.json();
    if (!r.ok) return res.status(r.status).json({error:j?.error?.message || "AI request failed"});
    let translation = j.output_text;
    if (!translation && Array.isArray(j.output)) {
      for (const item of j.output) {
        for (const c of (item.content || [])) {
          if (c.text) { translation = c.text; break; }
        }
        if (translation) break;
      }
    }
    if (!translation) return res.status(500).json({error:"No translation returned"});
    return res.status(200).json({translation:String(translation).trim()});
  } catch (e) {
    return res.status(500).json({error:"Server error"});
  }
}