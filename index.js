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
          content: "Du bist ein Assistent, der Kalenderbefehle in JSON umwandelt. Beispiel: 'Trag mir für Donnerstag 14 Uhr einen Zoom-Call mit Lisa ein.' → {"date":"2025-05-22","time":"14:00","title":"Zoom-Call mit Lisa"}"
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

  let parsed;
  try {
    parsed = JSON.parse(rawAnswer.match(/{[\s\S]*}/)?.[0]);
  } catch (e) {
    return res.status(500).json({ error: "Fehler bei der GPT-JSON-Antwort", raw: rawAnswer });
  }

  await fetch(process.env.WEBHOOK_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(parsed)
  });

  res.status(200).json({ status: "Gesendet", payload: parsed });
}
