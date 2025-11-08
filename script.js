// AI GENERATED

// --- DOM Elements ---
const generateBtn = document.getElementById('generate-btn');
const playlistLinkInput = document.getElementById('playlist-link');

const loader = document.getElementById('loader');
const statusMessage = document.getElementById('status-message');
const errorMessage = document.getElementById('error-message');
const resultContainer = document.getElementById('result-container');
const resultImage = document.getElementById('result-image');

// --- Attach Event Listener ---
generateBtn.addEventListener('click', handleGeneration);

/**
 * Main function to handle the cover generation process.
 */
async function handleGeneration() {
    // 1. Reset UI
    resetUI();

    // 2. Get and Validate Inputs
    const playlistLink = playlistLinkInput.value.trim();

    if (!playlistLink) {
        showError("Please provide a playlist link.");
        return;
    }

    // 3. Start Generation Process
    try {
        setStatus("Starting generation process...");

        // Call our OWN backend serverless function
        const response = await fetch('http://127.0.0.1:5000/api/generate', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ playlistLink: playlistLink }),
        });

        const data = await response.json();

        if (!response.ok) {
            throw new Error(data.error || "An error occurred in the backend.");
        }

        // Step 5: Display Result
        displayResult(data.base64Image);

    } catch (error) {
        console.error(error);
        showError(error.message || "An unknown error occurred.");
    }
}

/**
 * Resets the UI to its initial state before a new generation.
 */
function resetUI() {
    loader.classList.remove('hidden');
    statusMessage.classList.remove('hidden');
    statusMessage.textContent = '';
    errorMessage.classList.add('hidden');
    errorMessage.textContent = '';
    resultContainer.classList.add('hidden');
    resultImage.src = '';
    generateBtn.disabled = true;
}

/**
 * Shows the loader and sets a status message.
 * @param {string} message - The status message to display.
 */
function setStatus(message) {
    statusMessage.textContent = message;
    loader.classList.remove('hidden');
    errorMessage.classList.add('hidden');
}

/**
 * Hides the loader and shows an error message.
 * @param {string} message - The error message to display.
 */
function showError(message) {
    loader.classList.add('hidden');
    statusMessage.classList.add('hidden');
    errorMessage.textContent = message;
    errorMessage.classList.remove('hidden');
    generateBtn.disabled = false;
}

/**
 * Hides all status indicators and shows the final image.
 * @param {string} base64Image - The base64 encoded image data.
 */
function displayResult(base64Image) {
    loader.classList.add('hidden');
    statusMessage.classList.add('hidden');
    errorMessage.classList.add('hidden');
    
    resultImage.src = `data:image/png;base64,${base64Image}`;
    resultContainer.classList.remove('hidden');
    generateBtn.disabled = false;
}