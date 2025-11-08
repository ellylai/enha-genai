import { useMemo, useState } from "react";
import PlaylistInput from "./components/PlaylistInput";
import BubbleCanvas from "./components/BubbleCanvas";
import CoverGallery from "./components/CoverGallery";
import VibeControls from "./components/VibeControls";

const PLACEHOLDER_IMAGE =
  "data:image/svg+xml;base64," +
  btoa(
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512"><defs><linearGradient id="a" x1="0%" y1="0%" x2="100%" y2="100%"><stop offset="0%" stop-color="#c41e3a"/><stop offset="100%" stop-color="#8b0000"/></linearGradient></defs><rect width="512" height="512" fill="#1a1a1a"/><circle cx="256" cy="256" r="200" fill="url(#a)" opacity="0.75"/><text x="50%" y="50%" font-family="Bebas Neue, Arial" font-size="64" text-anchor="middle" fill="#e0e0e0" letter-spacing="10" transform="translate(0 20)">COVER</text></svg>`,
  );

/**
 * Converts the vibe JSON from the API into the
 * array of objects used by the BubbleCanvas.
 * This now ONLY processes categories with weights (mood, colors, objects).
 * 'style', 'lighting', and 'time' are handled in VibeControls.
 */
const convertVibeToBubbleConcepts = (vibe) => {
  if (!vibe) return [];
  const concepts = [];
  let idCounter = 0;

  const addCategory = (category, items) => {
    if (items) {
      Object.entries(items).forEach(([label, weight]) => {
        let numericWeight = 1.0;
        if (typeof weight === "number") {
          numericWeight = weight;
        } else if (typeof weight === "string" && weight.includes('/')) {
          try {
            const parts = weight.split('/');
            // Convert "4/5" to 0.8
            numericWeight = parseFloat(parts[0]) / parseFloat(parts[1]);
          } catch (e) { /* ignore */ }
        }
        
        concepts.push({
          id: `${category}-${label.replace(/\s+/g, "-")}-${idCounter++}`,
          category,
          label,
          weight: numericWeight, // Store the 0.0 - 1.0 value
        });
      });
    }
  };

  addCategory('mood', vibe.mood);
  addCategory('colors', vibe.colors);
  addCategory('objects', vibe.objects);
  
  // 'style', 'lighting', and 'time_of_day' are no longer processed here.
  
  return concepts;
};


function App() {
  const [playlistLink, setPlaylistLink] = useState("");
  // This state holds the master JSON from/to the API
  const [vibeData, setVibeData] = useState(null);
  // This state powers the BubbleCanvas UI
  const [bubbleConcepts, setBubbleConcepts] = useState([]);
  
  const [covers, setCovers] = useState([]);
  const [statusMessage, setStatusMessage] = useState("");
  const [errorMessage, setErrorMessage] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const totalWeight = useMemo(
    () => bubbleConcepts.reduce((acc, item) => acc + item.weight, 0),
    [bubbleConcepts],
  );

  /**
   * (Req #Bubble Click)
   * Finds the bubble by ID and updates its weight in both states
   */
  const handleWeightChange = (bubbleId, weight) => {
    let bubbleToUpdate = null;

    setBubbleConcepts((previous) =>
      previous.map((bubble) => {
        if (bubble.id === bubbleId) {
          bubbleToUpdate = { ...bubble, weight };
          return bubbleToUpdate;
        }
        return bubble;
      }),
    );

    if (bubbleToUpdate && vibeData[bubbleToUpdate.category]) {
      setVibeData(prevVibe => ({
        ...prevVibe,
        [bubbleToUpdate.category]: {
          ...prevVibe[bubbleToUpdate.category],
          [bubbleToUpdate.label]: weight, // Update weight in JSON
        }
      }));
    }
  };

  /**
   * (Req #1)
   * Handles user input for the 'style' text field
   */
  const handleStyleChange = (newStyle) => {
    setVibeData(prev => ({ ...prev, style: newStyle }));
  };

  /**
   * (Req #2)
   * Handles deleting a bubble from the canvas
   */
  const handleDeleteBubble = (bubbleId) => {
    const bubbleToDelete = bubbleConcepts.find(b => b.id === bubbleId);
    if (!bubbleToDelete) return;

    // 1. Remove from UI state
    setBubbleConcepts(prev => prev.filter(b => b.id !== bubbleId));

    // 2. Remove from JSON state
    setVibeData(prevVibe => {
      const newVibe = { ...prevVibe };
      const category = bubbleToDelete.category;

      if (newVibe[category]) {
        // This handles object categories (mood, colors, objects)
        if (typeof newVibe[category] === 'object' && !Array.isArray(newVibe[category])) {
          const newCategory = { ...newVibe[category] };
          delete newCategory[bubbleToDelete.label];
          newVibe[category] = newCategory;
        }
      }
      return newVibe;
    });
  };

  /**
   * (Req #3)
   * Handles editing a bubble's label
   */
  const handleLabelChange = (bubbleId, newLabel) => {
    const bubbleToEdit = bubbleConcepts.find(b => b.id === bubbleId);
    if (!bubbleToEdit || bubbleToEdit.label === newLabel) return;
    
    const oldLabel = bubbleToEdit.label;

    // 1. Update UI state
    setBubbleConcepts(prev => 
      prev.map(b => b.id === bubbleId ? { ...b, label: newLabel } : b)
    );

    // 2. Update JSON state (replace key)
    setVibeData(prevVibe => {
      const newVibe = { ...prevVibe };
      const category = bubbleToEdit.category;

      if (newVibe[category]) {
        // This handles object categories (mood, colors, objects)
        if (typeof newVibe[category] === 'object' && !Array.isArray(newVibe[category])) {
          const newCategory = { ...newVibe[category] };
          const weight = newCategory[oldLabel];
          delete newCategory[oldLabel];
          newCategory[newLabel] = weight;
          newVibe[category] = newCategory;
        }
      }
      return newVibe;
    });
  };

  /**
   * (Req #4)
   * Handles adding a new bubble from the VibeControls form
   */
  const handleAddNewBubble = ({ category, label, weight }) => {
    // 1. Add to JSON state
    setVibeData(prevVibe => ({
      ...prevVibe,
      [category]: {
        ...prevVibe[category],
        [label]: weight,
      }
    }));

    // 2. Add to UI state
    setBubbleConcepts(prev => [
      ...prev,
      {
        id: `${category}-${label.replace(/\s+/g, "-")}-${Date.now()}`,
        category,
        label,
        weight,
      }
    ]);
  };

  /**
   * (Req #Last)
   * Handles adding a new tag (lighting, time)
   */
  const handleAddTag = (category, tagLabel) => {
    setVibeData(prevVibe => {
      const currentTags = prevVibe[category] || [];
      if (currentTags.includes(tagLabel)) return prevVibe; // Avoid duplicates
      return {
        ...prevVibe,
        [category]: [...currentTags, tagLabel]
      };
    });
  };

  /**
   * (Req #Last)
   * Handles deleting a tag (lighting, time)
   */
  const handleDeleteTag = (category, tagLabel) => {
    setVibeData(prevVibe => {
      const currentTags = prevVibe[category] || [];
      return {
        ...prevVibe,
        [category]: currentTags.filter(tag => tag !== tagLabel)
      };
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
        headers: { "Content-Type": "application/json" },
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
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ updatedVibePrompt: vibeData }),
      });
      const data = await response.json();
      if (response.ok && data.base64Images && data.base64Images.length > 0) {
        const generatedCovers = data.base64Images.map((base64Img, index) => {
          let imageSrc = base64Img;
          if (!imageSrc.startsWith('data:image') && !imageSrc.startsWith('http')) {
            imageSrc = `data:image/png;base64,${imageSrc}`;
          }
          return {
            id: `cover-${index + 1}`,
            imageUrl: imageSrc,
            // Title is used for alt text and download filename
            title: `Generated-Cover-${index + 1}`, 
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
    } finally {
      setIsLoading(false);
    }
  };

  const handleDownloadCover = async (cover) => {
    try {
      const link = document.createElement("a");
      link.href = cover.imageUrl || PLACEHOLDER_IMAGE;
      link.download = `${cover.title.replace(/\s+/g, '-')}.png`;
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
          onSubmit={handleGetVibes}
          isLoading={isLoading && !vibeData}
          statusMessage={statusMessage || (bubbleConcepts.length > 0 ? `Concept weight total: ${totalWeight.toFixed(2)}` : "")}
          errorMessage={errorMessage}
        />
        
        {vibeData && (
          <VibeControls 
            vibeData={vibeData}
            onStyleChange={handleStyleChange}
            onAddNewBubble={handleAddNewBubble}
            onAddTag={handleAddTag} 
            onDeleteTag={handleDeleteTag}
          />
        )}

        <BubbleCanvas 
          bubbleConcepts={bubbleConcepts}
          onWeightChange={handleWeightChange}
          onLabelChange={handleLabelChange}
          onDeleteBubble={handleDeleteBubble}
        />
        
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