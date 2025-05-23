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
  const systemPrompt = `Heute ist ${today}. Du bist ein präziser JSON-Generator für Kalenderbefehle. Wenn der Nutzer z. B. "morgen" sagt, rechne das Datum in ISO 8601 um (z. B. 2025-05-23T06:00:00+02:00). 
Antworte ausschließlich mit einem JSON-Objekt:

{
  "summary": "...",
  "start": "2025-05-23T06:00:00+02:00",
  "end": "2025-05-23T06:30:00+02:00",
  "action": "create"
}

Kein Text vor oder nach dem JSON.`;

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

  try {
    const match = rawAnswer?.match(/{[\s\S]*}/);
    if (!match || match.length === 0) throw new Error("❌ Kein JSON erkannt");

    let parsed;
    try {
      parsed = JSON.parse(match[0]);
    } catch (err) {
      throw new Error("❌ JSON-Parsing fehlgeschlagen");
    }

    // 💡 Sanity Check: prüfen ob notwendige Felder vorhanden
    if (!parsed.summary || !parsed.start || !parsed.end || !parsed.action) {
      throw new Error("❌ JSON unvollständig");
    }

    // ✅ JSON an Webhook senden
    await fetch(process.env.WEBHOOK_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(parsed),
    });

    return res.status(200).json({ status: "✅ Termin gespeichert", payload: parsed });
  } catch (error) {
    console.warn("⚠️ Fehler beim Parsen:", error.message);

    // 🧾 Wenn Datei hochgeladen wurde
    if (uploadedFile) {
      return res.status(200).json({
        status: "📎 Datei verarbeitet",
        filename: uploadedFile.originalFilename,
        text: rawAnswer,
        warnung: error.message,
      });
    }

    // 🧠 Nur Textantwort, kein valides JSON
    return res.status(200).json({
      status: "📝 Nur Textantwort",
      text: rawAnswer,
      warnung: error.message,
    });
  }
}
