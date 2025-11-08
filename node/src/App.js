import { useMemo, useState } from "react";
import PlaylistInput from "./components/PlaylistInput";
import BubbleCanvas from "./components/BubbleCanvas";
import CoverGallery from "./components/CoverGallery";

const INITIAL_BUBBLES = [
  { id: "genre", label: "moody alt pop", weight: 1.0 },
  { id: "mood", label: "late-night neon", weight: 0.9 },
  { id: "texture", label: "gritty synthwave", weight: 0.8 },
  { id: "tempo", label: "slow burn", weight: 0.7 },
  { id: "emotion", label: "longing", weight: 0.9 },
];

const PLACEHOLDER_IMAGE =
  "data:image/svg+xml;base64," +
  btoa(
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512"><defs><linearGradient id="a" x1="0%" y1="0%" x2="100%" y2="100%"><stop offset="0%" stop-color="#c41e3a"/><stop offset="100%" stop-color="#8b0000"/></linearGradient></defs><rect width="512" height="512" fill="#1a1a1a"/><circle cx="256" cy="256" r="200" fill="url(#a)" opacity="0.75"/><text x="50%" y="50%" font-family="Bebas Neue, Arial" font-size="64" text-anchor="middle" fill="#e0e0e0" letter-spacing="10" transform="translate(0 20)">COVER</text></svg>`,
  );

function App() {
  const [playlistLink, setPlaylistLink] = useState("");
  const [bubbleConcepts, setBubbleConcepts] = useState(INITIAL_BUBBLES);
  const [covers, setCovers] = useState([]);
  const [statusMessage, setStatusMessage] = useState("");
  const [errorMessage, setErrorMessage] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const totalWeight = useMemo(
    () => bubbleConcepts.reduce((acc, bubble) => acc + bubble.weight, 0),
    [bubbleConcepts],
  );

  const handleAdjustBubble = (id, weight) => {
    setBubbleConcepts((previous) =>
      previous.map((bubble) =>
        bubble.id === id ? { ...bubble, weight } : bubble,
      ),
    );
  };

  const hydrateBubbleConcepts = (seed = 1) =>
    INITIAL_BUBBLES.map((bubble, index) => ({
      ...bubble,
      weight: parseFloat(
        (0.8 + ((seed + index) % 3) * 0.15 + Math.random() * 0.1).toFixed(2),
      ),
    }));

  const handlePlaylistSubmit = async () => {
    if (!playlistLink.trim()) {
      setErrorMessage("Please paste a valid Spotify playlist link.");
      return;
    }

    setIsLoading(true);
    setStatusMessage("Analyzing playlist to extract moods and aesthetics…");
    setErrorMessage("");
    setCovers([]);

    try {
      // Hydrate bubble concepts with random weights
      setBubbleConcepts(hydrateBubbleConcepts(playlistLink.length));

      // Fetch from Flask backend with proper error handling
      const response = await fetch("http://127.0.0.1:5000/api/generate", {
        method: "POST",
        headers: { 
          "Content-Type": "application/json" 
        },
        body: JSON.stringify({ playlistLink: playlistLink }),
      });

      console.log("Response data:", response); // Debug log

      // Parse response
      const data = await response.json();

      if (response.ok && data.base64Image) {
        // Handle different base64 formats (from first file's logic)
        let imageSrc = data.base64Image;
        
        // If it's already a data URL, use it directly
        if (imageSrc.startsWith('data:image')) {
          imageSrc = imageSrc;
        } 
        // If it's raw base64, prepend the data URL prefix
        else if (!imageSrc.startsWith('http')) {
          imageSrc = `data:image/png;base64,${imageSrc}`;
        }
        // If it's a URL, use it directly (keep as is)

        // Generate 3 covers with the same image (can be modified later for multiple images)
        const generatedCovers = Array.from({ length: 3 }, (_, index) => ({
          id: `cover-${index + 1}`,
          imageUrl: imageSrc,
          prompt: `Blend of ${bubbleConcepts
            .map((bubble) => bubble.label)
            .join(", ")}`,
        }));

        setCovers(generatedCovers);
        setStatusMessage("Tap a cover to download it or tweak the bubbles and regenerate.");
      } else {
        throw new Error(data.error || "Failed to generate image");
      }
    } catch (error) {
      console.error("Fetch error:", error);
      if (error.message.includes("fetch")) {
        setErrorMessage("Server not reachable. Is Flask running on port 5000?");
      } else {
        setErrorMessage(error.message || "Could not generate cover art.");
      }
      setStatusMessage("");
    } finally {
      setIsLoading(false);
    }
  };

  const handleDownloadCover = async (cover) => {
    try {
      const link = document.createElement("a");
      link.href = cover.imageUrl || PLACEHOLDER_IMAGE;
      link.download = `${cover.id}.png`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (error) {
      console.error("Download failed", error);
      setErrorMessage("We couldn't download that cover. Try again?");
    }
  };

  return (
    <div className="min-h-screen bg-bg px-4 py-10 text-text-light md:px-10">
      <div className="mx-auto flex max-w-6xl flex-col gap-10">
        <header className="text-center">
          <h1 className="text-5xl text-text-light">ENHA GENAI</h1>
          <p className="mt-4 text-base text-text-muted">
            Generate playlist covers by blending Enhypen-inspired visuals with your music&apos;s
            unique mood. Paste a playlist, refine the vibe bubbles, and choose your favorite cover.
          </p>
        </header>

        <PlaylistInput
          value={playlistLink}
          onChange={setPlaylistLink}
          onSubmit={handlePlaylistSubmit}
          isLoading={isLoading}
          statusMessage={statusMessage || `Concept weight total: ${totalWeight.toFixed(2)}`}
          errorMessage={errorMessage}
        />

        <BubbleCanvas bubbles={bubbleConcepts} onAdjustBubble={handleAdjustBubble} />

        <CoverGallery covers={covers} onDownloadCover={handleDownloadCover} />
      </div>
    </div>
  );
}

export default App;