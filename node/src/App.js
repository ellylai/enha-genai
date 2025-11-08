import { useEffect, useMemo, useRef, useState } from "react";
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

  const conceptOverrides = useMemo(
    () => bubbleConcepts.map(({ label, weight }) => ({ label, weight })),
    [bubbleConcepts],
  );

  const bubbleTuples = useMemo(
    () => conceptOverrides.map(({ label, weight }) => [label, weight]),
    [conceptOverrides],
  );

  const conceptOverridesJSON = useMemo(
    () => JSON.stringify(conceptOverrides, null, 2),
    [conceptOverrides],
  );

  const conceptOverridesRef = useRef(conceptOverrides);
  const conceptOverridesJsonRef = useRef(conceptOverridesJSON);

  useEffect(() => {
    conceptOverridesRef.current = conceptOverrides;
    conceptOverridesJsonRef.current = conceptOverridesJSON;
  }, [conceptOverrides, conceptOverridesJSON]);

  const totalWeight = useMemo(
    () => conceptOverrides.reduce((acc, item) => acc + item.weight, 0),
    [conceptOverrides],
  );

  const handleAdjustBubble = (label, weight) => {
    setBubbleConcepts((previous) =>
      previous.map((bubble) =>
        bubble.label === label ? { ...bubble, weight } : bubble,
      ),
    );
  };

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
      const response = await fetch("http://127.0.0.1:5000/api/generate", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          playlistLink,
          conceptOverrides: conceptOverridesRef.current,
        }),
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
          prompt: `Blend of ${conceptOverridesRef.current
            .map((item) => item.label)
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

        <BubbleCanvas conceptTuples={bubbleTuples} onAdjustBubble={handleAdjustBubble} />

        <CoverGallery covers={covers} onDownloadCover={handleDownloadCover} />
      </div>
    </div>
  );
}

export default App;