import React, { useState } from "react";

function App() {
  const [prompt, setPrompt] = useState("");
  const [response, setResponse] = useState("");

  const handleGenerate = async () => {
    const res = await fetch("http://127.0.0.1:5000/api/generate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ prompt }),
    });
    const data = await res.json();
    setResponse(data.message);
  };

  return (
    <div style={{ padding: "2rem" }}>
      <h1>Enha GenAI</h1>
      <input
        value={prompt}
        onChange={(e) => setPrompt(e.target.value)}
        placeholder="Enter prompt..."
      />
      <button onClick={handleGenerate}>Send</button>
      <p>{response}</p>
    </div>
  );
}

export default App;
