document.addEventListener("DOMContentLoaded", () => {
  const input = document.createElement("input");
  input.id = "textInput";
  input.placeholder = "Schreib hier deinen Befehl...";
  input.style.padding = "12px";
  input.style.fontSize = "18px";
  input.style.width = "80%";

  const button = document.createElement("button");
  button.textContent = "Senden";
  button.style.padding = "12px 24px";
  button.style.fontSize = "18px";
  button.style.marginLeft = "10px";

  button.onclick = () => {
    const command = input.value;
    if (!command) return alert("Bitte gib einen Befehl ein.");
    console.log("📤 Sende an /api/handler:", command);

    fetch("/api/handler", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ command })
    })
      .then(res => res.json())
      .then(data => console.log("✅ Antwort:", data))
      .catch(err => console.error("❌ Fehler:", err));
  };

  document.body.appendChild(input);
  document.body.appendChild(button);
});
