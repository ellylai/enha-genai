import { useMemo, useState } from "react";
import PlaylistInput from "./components/PlaylistInput";
import BubbleCanvas from "./components/BubbleCanvas";
import CoverGallery from "./components/CoverGallery";

const PLACEHOLDER_IMAGE =
  "data:image/svg+xml;base64," +
  btoa(
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512"><defs><linearGradient id="a" x1="0%" y1="0%" x2="100%" y2="100%"><stop offset="0%" stop-color="#c41e3a"/><stop offset="100%" stop-color="#8b0000"/></linearGradient></defs><rect width="512" height="512" fill="#1a1a1a"/><circle cx="256" cy="256" r="200" fill="url(#a)" opacity="0.75"/><text x="50%" y="50%" font-family="Bebas Neue, Arial" font-size="64" text-anchor="middle" fill="#e0e0e0" letter-spacing="10" transform="translate(0 20)">COVER</text></svg>`,
  );

/**
 * Converts the vibe JSON from the API into the
 * array of objects used by the BubbleCanvas.
 */
const convertVibeToBubbleConcepts = (vibe) => {
  if (!vibe) return [];
  const concepts = [];
  let idCounter = 0;

  // Helper to add categories that have weights
  const addCategory = (category, items) => {
    if (items) {
      Object.entries(items).forEach(([label, weight]) => {
        // Ensure weight is a number, handling "5/5" strings or number formats
        let numericWeight = 1.0;
        if (typeof weight === "number") {
          numericWeight = weight;
        } else if (typeof weight === "string" && weight.includes('/')) {
          try {
            const parts = weight.split('/');
            numericWeight = (parseFloat(parts[0]) / parseFloat(parts[1])) * 1.5; // Scale to 0-1.5 range
          } catch (e) { /* ignore */ }
        }
        
        concepts.push({
          id: `${category}-${idCounter++}`,
          label,
          weight: Math.max(0.5, numericWeight), // Give it a min weight
        });
      });
    }
  };

  addCategory('mood', vibe.mood);
  addCategory('colors', vibe.colors);
  addCategory('objects', vibe.objects);

  // Helper for non-weighted items
  const addSimpleItem = (category, item) => {
     concepts.push({ id: `${category}-${idCounter++}`, label: item, weight: 1.0 });
  };

  if (vibe.style) {
    addSimpleItem('style', vibe.style);
  }
  if (vibe.lighting) {
    vibe.lighting.forEach(label => addSimpleItem('lighting', label));
  }
  if (vibe.time_of_day) {
    vibe.time_of_day.forEach(label => addSimpleItem('time', label));
  }
  
  return concepts;
};


function App() {
  const [playlistLink, setPlaylistLink] = useState("");
  // This state holds the JSON from/to the API
  const [vibeData, setVibeData] = useState(null);
  // This state powers the BubbleCanvas UI
  const [bubbleConcepts, setBubbleConcepts] = useState([]);
  
  const [covers, setCovers] = useState([]);
  const [statusMessage, setStatusMessage] = useState("");
  const [errorMessage, setErrorMessage] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  // Memoized tuple conversion for the BubbleCanvas prop
  const bubbleTuples = useMemo(
    () => bubbleConcepts.map(({ label, weight }) => [label, weight]),
    [bubbleConcepts],
  );

  const totalWeight = useMemo(
    () => bubbleConcepts.reduce((acc, item) => acc + item.weight, 0),
    [bubbleConcepts],
  );

  const handleAdjustBubble = (label, weight) => {
    // 1. Update the bubbleConcepts state for the UI
    setBubbleConcepts((previous) =>
      previous.map((bubble) =>
        bubble.label === label ? { ...bubble, weight } : bubble,
      ),
    );

    // 2. Update the master vibeData JSON for the next API call
    setVibeData(prevVibe => {
      if (!prevVibe) return null;
      
      // Create a deep copy to avoid mutating state
      const newVibe = JSON.parse(JSON.stringify(prevVibe));
      
      // Find where this label lives (mood, color, object) and update its weight
      // Note: We only update the properties that have weights in the JSON.
      if (newVibe.mood && newVibe.mood[label] !== undefined) {
        newVibe.mood[label] = weight;
      } else if (newVibe.colors && newVibe.colors[label] !== undefined) {
        newVibe.colors[label] = weight;
      } else if (newVibe.objects && newVibe.objects[label] !== undefined) {
        newVibe.objects[label] = weight;
      }
      
      return newVibe;
    });
  };

  // --- STEP 1: Get Vibe JSON from Backend ---
  const handleGetVibes = async () => {
    if (!playlistLink.trim()) {
      setErrorMessage("Please paste a valid Spotify playlist link.");
      return;
    }

    setIsLoading(true);
    setStatusMessage("Analyzing playlist to extract moods and aesthetics…");
    setErrorMessage("");
    setCovers([]);
    setVibeData(null);
    setBubbleConcepts([]);

    try {
      const response = await fetch("http://127.0.0.1:5000/api/generate", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ playlistLink }),
      });

      const data = await response.json();

      if (response.ok && data.vibePrompt) {
        setVibeData(data.vibePrompt);
        setBubbleConcepts(convertVibeToBubbleConcepts(data.vibePrompt));
        setStatusMessage("Vibes analyzed. Tweak the bubbles and hit Generate.");
      } else {
        throw new Error(data.error || "Failed to analyze playlist");
      }
    } catch (error) {
      console.error("Fetch error (Step 1):", error);
      if (error.message.includes("fetch")) {
        setErrorMessage("Server not reachable. Is Flask running on port 5000?");
      } else {
        setErrorMessage(error.message || "Could not analyze playlist.");
      }
      setStatusMessage("");
    } finally {
      setIsLoading(false);
    }
  };

  // --- STEP 2: Send Updated JSON to Generate Images ---
  const handleGenerateImages = async () => {
    if (!vibeData) {
      setErrorMessage("Please analyze a playlist first.");
      return;
    }

    setIsLoading(true);
    setStatusMessage("Generating your AI covers...");
    setErrorMessage("");
    setCovers([]);

    try {
      const response = await fetch("http://127.0.0.1:5000/api/generate", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ updatedVibePrompt: vibeData }),
      });

      const data = await response.json();

      // Expect 'base64Images' (plural array)
      if (response.ok && data.base64Images && data.base64Images.length > 0) {
        
        const generatedCovers = data.base64Images.map((base64Img, index) => {
          let imageSrc = base64Img;
          
          // Prepend the data URL prefix if it's not already there
          if (!imageSrc.startsWith('data:image') && !imageSrc.startsWith('http')) {
            imageSrc = `data:image/png;base64,${imageSrc}`;
          }
          
          return {
            id: `cover-${index + 1}`,
            imageUrl: imageSrc,
            prompt: `Vibe based on ${Object.keys(vibeData.mood || {}).join(', ')}`,
          };
        });

        setCovers(generatedCovers);
        setStatusMessage("Tap a cover to download it or tweak the bubbles and regenerate.");
      } else {
        throw new Error(data.error || "Failed to generate images.");
      }
    } catch (error) {
      console.error("Fetch error (Step 2):", error);
      setErrorMessage(error.message || "Could not generate cover art.");
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
          onSubmit={handleGetVibes} // Changed from handlePlaylistSubmit
          isLoading={isLoading && !vibeData} // Only show "Analyzing" on first step
          statusMessage={statusMessage || (bubbleTuples.length > 0 ? `Concept weight total: ${totalWeight.toFixed(2)}` : "")}
          errorMessage={errorMessage}
        />

        <BubbleCanvas conceptTuples={bubbleTuples} onAdjustBubble={handleAdjustBubble} />

        {/* --- New Generate Button --- */}
        {/* Only show this button after vibes are loaded and not currently loading */}
        {vibeData && (
          <div className="flex justify-center -mt-4">
            <button
              onClick={handleGenerateImages}
              disabled={isLoading}
              className="w-full rounded-2xl bg-primary px-8 py-4 font-semibold uppercase tracking-wide text-light shadow-glow transition hover:bg-primary-dark focus:outline-none focus:ring-4 focus:ring-primary/40 disabled:cursor-not-allowed disabled:bg-primary/40 md:w-auto"
            >
              {isLoading ? "Generating..." : "Generate Covers"}
            </button>
          </div>
        )}

        <CoverGallery covers={covers} onDownloadCover={handleDownloadCover} />
      </div>
    </div>
  );
}

export default App;