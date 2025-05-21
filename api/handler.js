// Datei: /api/handler.js
export default async function handler(req, res) {
  const { command } = req.body;

  const gptRes = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${process.env.OPENAI_API_KEY}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      model: "gpt-4",
      messages: [
        {
          role: "system",
          content: "Du bist ein Assistent, der Kalenderbefehle in JSON umwandelt. Beispiel: 'Trag mir für Donnerstag 14 Uhr einen Zoom-Call mit Lisa ein.' → {\"summary\":\"Zoom-Call mit Lisa\", \"start\":\"2025-05-22T14:00:00+02:00\", \"end\":\"2025-05-22T14:30:00+02:00\", \"action\":\"create\"}"
        },
        {
          role: "user",
          content: `Wandle folgenden Befehl in JSON um: ${command}`
        }
      ]
    })
  });

  const data = await gptRes.json();
  const rawAnswer = data.choices?.[0]?.message?.content;
  console.log("🧠 GPT-Rohantwort:", rawAnswer);


  let parsed;
  try {
    parsed = JSON.parse(rawAnswer.match(/{[\s\S]*}/)?.[0]);
    console.log("📦 Geparstes JSON:", parsed);
  } catch (e) {
    return res.status(500).json({ error: "Fehler bei der GPT-JSON-Antwort", raw: rawAnswer });
  }

  await fetch(process.env.WEBHOOK_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(parsed)
  });

  res.status(200).json({ status: "✅ Gesendet", payload: parsed });
}
