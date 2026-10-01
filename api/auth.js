export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).json({ok:false});
  const pin = String(req.headers["x-app-pin"] || "").trim();
  const expected = String(process.env.APP_PIN || "").trim();
  if (!expected) return res.status(500).json({ok:false,error:"APP_PIN is not configured"});
  if (pin !== expected) return res.status(401).json({ok:false});
  return res.status(200).json({ok:true});
}
