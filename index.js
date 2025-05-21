document.addEventListener("DOMContentLoaded", () => {
  const button = document.createElement("button");
  button.textContent = "Test senden";
  button.style.padding = "12px 24px";
  button.style.fontSize = "18px";
  button.style.marginTop = "100px";
  button.onclick = () => {
    console.log("🚀 Sende Request ...");
    fetch("https://fashionconsult.app.n8n.cloud/webhook/calendar-command", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        summary: "Test über VPA",
        description: "Kommt an?",
        start: "2025-05-22T10:00:00+02:00",
        end: "2025-05-22T10:30:00+02:00",
        action: "create"
      })
    })
      .then((res) => res.json())
      .then((data) => console.log("✅ Erfolgreich:", data))
      .catch((err) => console.error("❌ Fehler:", err));
  };
  document.body.appendChild(button);
});
