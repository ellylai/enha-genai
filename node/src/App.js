import React, { useState } from "react";
import "./App.css";

function App() {
  const [playlistLink, setPlaylistLink] = useState("");
  const [status, setStatus] = useState("");
  const [error, setError] = useState("");
  const [resultImage, setResultImage] = useState(null);
  const [loading, setLoading] = useState(false);

  const handleGenerate = async () => {
    setError("");
    setStatus("Generating cover...");
    setLoading(true);
    setResultImage(null);

    try {
      const response = await fetch("http://127.0.0.1:5000/api/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ playlistLink: playlistLink }),
      });

      const data = await response.json();
      console.log("Response data:", data); // Debug log

      if (response.ok && data.base64Image) {
        // Handle different base64 formats
        let imageSrc = data.base64Image;
        
        // If it's already a data URL, use it directly
        if (imageSrc.startsWith('data:image')) {
          setResultImage(imageSrc);
        } 
        // If it's raw base64, prepend the data URL prefix
        else if (!imageSrc.startsWith('http')) {
          imageSrc = `data:image/png;base64,${imageSrc}`;
          setResultImage(imageSrc);
        }
        // If it's a URL, use it directly
        else {
          setResultImage(imageSrc);
        }
        
        setStatus("Cover generated!");
      } else {
        setError(data.error || "Failed to generate image");
      }
    } catch (err) {
      console.error("Fetch error:", err);
      setError("Server not reachable. Is Flask running?");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="app-container">
      <header>
        <h1>AI Playlist Cover Generator</h1>
        <p>Get a unique cover for your playlist based on its vibe.</p>
      </header>

      <main>
        <div className="input-section">
          <label htmlFor="playlist-link">Spotify Playlist Link</label>
          <input
            type="text"
            id="playlist-link"
            value={playlistLink}
            onChange={(e) => setPlaylistLink(e.target.value)}
            placeholder="e.g., https://open.spotify.com/playlist/..."
          />
          <button onClick={handleGenerate} disabled={loading}>
            {loading ? "Generating..." : "Generate Cover"}
          </button>
        </div>

        <div className="status-section">
          {loading && <div className="loader"></div>}
          {status && <p className="status-message">{status}</p>}
          {error && <p className="error-message">{error}</p>}
        </div>

        {resultImage && (
          <div className="result-section">
            <h2>Your Generated Cover!</h2>
            <img 
              src={resultImage} 
              alt="Generated playlist cover" 
              style={{ maxWidth: "100%", height: "auto" }}
              onError={(e) => {
                console.error("Image failed to load");
                setError("Generated image failed to load");
              }}
            />
            <p className="note">
              *Note: Image generated using Google's Imagen 3 API.
            </p>
          </div>
        )}
      </main>
    </div>
  );
}

export default App;