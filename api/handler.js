// Datei: /api/handler.js

import formidable from "formidable";
import fs from "fs";
import { promisify } from "util";

export const config = {
  api: {
    bodyParser: false
  }
};

const readFile = promisify(fs.readFile);

export default async function handler(req, res) {
  const today = new Date().toISOString().split("T")[0];

  const form = new formidable.IncomingForm({ keepExtensions: true });
  form.parse(req, async (err, fields, files) => {
    if (err) return res.status(500).json({ error: "Upload-Fehler", details: err });

    const command = fields.command || "Wie kann ich meinen Tag effizienter planen?";
    const uploadedFile = files?.file?.[0];

    const systemPrompt = `
Heute ist ${today}. Du bist ein virtueller persönlicher Assistent (VPA), der drei Aufgaben erfüllt:

1. Kalenderbefehle wie „Trag um 14 Uhr ein Meeting mit Lisa ein“ werden in JSON umgewandelt (siehe Beispiel).
2. Strukturierungswünsche wie „Wie optimiere ich meinen Tag?“ beantwortest du mit klugen Vorschlägen.
3. Wenn ein Dokument (z. B. PDF oder Bild) hochgeladen wurde, speichere es in Google Drive im passenden Ordner (z. B. /HENK/Styles/), trage relevante Metadaten in Notion oder Google Sheets ein.

Wenn der Nutzer einen Kalendereintrag formuliert, gib bitte **nur JSON** zurück. Bei strukturellen Fragen: Textantwort. Wenn eine Datei verarbeitet wurde, antworte mit einem Hinweis, dass die Datei gespeichert wurde.
`;

    const gptRes = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${process.env.OPENAI_API_KEY}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        model: "gpt-4",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: command }
        ],
        temperature: 0.7
      })
    });

    const data = await gptRes.json();
    const rawAnswer = data.choices?.[0]?.message?.content;
    console.log("🧠 GPT-Rohantwort:", rawAnswer);

    let parsed;
    try {
      parsed = JSON.parse(rawAnswer.match(/{[\\s\\S]*}/)?.[0]);
      console.log("📦 Geparstes JSON:", parsed);

      // Wenn es JSON ist, an den Kalender-Webhook senden
      await fetch(process.env.WEBHOOK_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(parsed)
      });

      return res.status(200).json({ status: "✅ Termin gespeichert", payload: parsed });
    } catch (e) {
      // Wenn eine Datei da ist, sende sie an Drive/Notion API
      if (uploadedFile) {
        const fileBuffer = await readFile(uploadedFile.filepath);

        // 👉 TODO: Hier Upload zu Google Drive & Metadaten an Notion/Sheets senden
        // Beispiel:
        // await uploadToDriveAndNotion(fileBuffer, uploadedFile.originalFilename, command);

        return res.status(200).json({
          status: "📁 Datei verarbeitet",
          filename: uploadedFile.originalFilename,
          text: rawAnswer
        });
      }

      // Standardtextantwort
      return res.status(200).json({ status: "ℹ️ Textantwort", text: rawAnswer });
    }
  });
}
