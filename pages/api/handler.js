export const config = {
  api: {
    bodyParser: false,
  },
};

import formidable from "formidable";
import { Readable } from "stream";

const parseForm = async (req) =>
  new Promise((resolve, reject) => {
    const form = formidable({ multiples: false });
    form.parse(req, (err, fields, files) => {
      if (err) reject(err);
      else resolve({ fields, files });
    });
  });

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Nur POST erlaubt" });
  }

  const { fields, files } = await parseForm(req);
  const command = fields.command || "";
  const uploadedFile = files.file;

  const today = new Date().toISOString().split("T")[0];
  const systemPrompt = `Heute ist ${today}. Du bist ein Assistent, der Kalenderbefehle in JSON umwandelt. Beispiel: 'Trag mir für heute 14 Uhr einen Zoom-Call mit Lisa ein.' → {"summary":"Zoom-Call mit Lisa", "start":"${today}T14:00:00+02:00", "end":"${today}T14:30:00+02:00", "action":"create"}`;

  const gptRes = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: "gpt-4",
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: `Wandle folgenden Befehl in JSON um: ${command}` },
      ],
      temperature: 0.7,
    }),
  });

  const data = await gptRes.json();
  const rawAnswer = data.choices?.[0]?.message?.content;
  console.log("🧠 GPT-Rohantwort:", rawAnswer);

  let parsed;
  try {
    parsed = JSON.parse(rawAnswer.match(/{[\\s\\S]*}/)?.[0]);
    console.log("📦 Geparstes JSON:", parsed);

    // Wenn es ein JSON ist, an deinen Webhook senden
    await fetch(process.env.WEBHOOK_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(parsed),
    });

    return res.status(200).json({ status: "✅ Termin gespeichert", payload: parsed });
  } catch (e) {
    // Wenn eine Datei da ist, z. B. Stoffmuster
    if (uploadedFile) {
      return res.status(200).json({
        status: "📎 Datei verarbeitet",
        filename: uploadedFile.originalFilename,
        text: rawAnswer,
      });
    }

    // Standardtextantwort
    return res.status(200).json({ status: "📝 Textantwort", text: rawAnswer });
  }
}
