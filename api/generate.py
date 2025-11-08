import os
import requests
import base64
from flask import Flask, request, jsonify
from flask_cors import CORS
import json
from dotenv import load_dotenv

load_dotenv(os.path.join(os.path.dirname(__file__), ".env"))

# --- Environment Setup ---
# On Vercel, set these in the "Environment Variables" settings
GOOGLE_API_KEY = os.environ.get("GOOGLE_API_KEY")
SPOTIFY_CLIENT_ID = os.environ.get("SPOTIFY_CLIENT_ID")
SPOTIFY_CLIENT_SECRET = os.environ.get("SPOTIFY_CLIENT_SECRET")
OPENROUTER_API_KEY = os.environ.get("OPENROUTER_API_KEY")

# --- API Endpoints ---
GEMINI_API_URL = f"https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-preview-09-2025:generateContent?key={GOOGLE_API_KEY}"
SPOTIFY_TOKEN_URL = "https://accounts.spotify.com/api/token"
SPOTIFY_PLAYLIST_API_BASE = "https://api.spotify.com/v1/playlists/"
OPENROUTER_API_URL = "https://openrouter.ai/api/v1/chat/completions"

# --- Flask App Setup ---
app = Flask(__name__)
CORS(app)  # Enable Cross-Origin Resource Sharing


def get_spotify_token():
    """Gets an access token from the Spotify API."""
    auth_string = f"{SPOTIFY_CLIENT_ID}:{SPOTIFY_CLIENT_SECRET}"
    auth_base64 = base64.b64encode(auth_string.encode()).decode()

    response = requests.post(
        SPOTIFY_TOKEN_URL,
        headers={
            "Authorization": f"Basic {auth_base64}",
            "Content-Type": "application/x-www-form-urlencoded",
        },
        data="grant_type=client_credentials",
    )
    response.raise_for_status()  # Raise an exception for bad status codes
    data = response.json()
    if "access_token" not in data:
        raise Exception("Could not authenticate with Spotify.")
    return data["access_token"]


def get_playlist_details(playlist_id, token):
    """Fetches playlist details from Spotify."""
    fields = "name,description,tracks.items(track(name,artists(name)))"
    url = f"{SPOTIFY_PLAYLIST_API_BASE}{playlist_id}?fields={fields}&limit=50"

    response = requests.get(url, headers={"Authorization": f"Bearer {token}"})
    response.raise_for_status()
    data = response.json()

    content = f"Playlist Name: {data.get('name', 'N/A')}\n"
    if data.get("description"):
        content += f"Playlist Description: {data['description']}\n"

    content += "Tracks:\n"
    for item in data.get("tracks", {}).get("items", []):
        track = item.get("track")
        if track:
            track_name = track.get("name") or "Unknown Track"
            artist_list = [
                a.get("name") or "Unknown Artist" for a in track.get("artists", [])
            ]
            artist_name = ", ".join(artist_list)
            content += f"- {track_name} by {artist_name}\n"
    return content


def get_playlist_vibes(track_list_string: str) -> dict:
    """
    Calls the Gemini API twice to analyze vibes (as JSON) and then generate a final image prompt.
    """

    # --- First Call: Analyze Vibes (Optimized for JSON) ---
    system_prompt_1 = """
        You are a playlist vibe analyzer. A user has provided playlist details. 
        Analyze its core 'vibe' and return a JSON object with the following structure:
        {
            "lighting": ["<description>"],
            "time of day": ["<description>"],
            "mood": {
                "<mood_1>": "<rating>/5",
                "<mood_2>": "<rating>/5",
                "<mood_3>": "<rating>/5"
            },
            "colors": {
                "<color_1>": "<rating>/5",
                "<color_2>": "<rating>/5",
                "<color_3>": "<rating>/5"
            },
            "objects": {
                "<object_1>": "<rating>/5",
                "<object_2>": "<rating>/5",
                "<object_3>": "<rating>/5"
            },
            "style": "<description>"
        }
        
        - All keys are required.
        - Ratings should be from 0/5 to 5/5, representing presence or importance.
        - Provide 3 items each for "mood", "colors", and "objects". Each should be a short phrase or single word.
        - "lighting" and "time of day" should be lists containing a single or multiple phrases.
        - "style" should be a single descriptive string, such as "blurry film photo taken in passing".

        Return ONLY the valid JSON object and nothing else.
        """

    payload_1 = {
        "contents": [{"parts": [{"text": track_list_string}]}],
        "systemInstruction": {"parts": [{"text": system_prompt_1}]},
        "generationConfig": {
            "responseMimeType": "application/json",
        },
    }

    response_1 = requests.post(GEMINI_API_URL, json=payload_1)
    response_1.raise_for_status()
    result_1 = response_1.json()

    try:
        text_1 = (
            result_1.get("candidates", [{}])[0]
            .get("content", {})
            .get("parts", [{}])[0]
            .get("text", "{}")
        )
        return json.loads(text_1)

    except (json.JSONDecodeError, AttributeError, KeyError) as e:
        print(f"JSON parsing failed: {e}")
        raise Exception("AI vibe analysis returned unparsable data.")


def get_imagegen_prompt(user_prompt_2: dict) -> str:
    # with open("prompts.json", "r") as f:
    #     prompts_file = json.load(f)
    #     user_prompt_2 = json.dumps(prompts_file["prompt4"])
    #     print(f"USER_PROMPT_2 \n{user_prompt_2}")

    user_prompt_2 = json.dumps(user_prompt_2)

    system_instruction_2 = """
        You are an expert prompt engineer for an AI image generator. 
        Your job is to take a set of vibe descriptions with their scoring and synthesize them into a single, powerful, and evocative image prompt for a playlist cover.
        Focus on visual composition, style, and atmosphere. DO NOT just list the items.
        Make it sound like a beautiful, artistic description for an ABSTRACT image.
        The output MUST be only the final prompt itself, with no preamble.
    """

    payload_2 = {
        "contents": [
            {"parts": [{"text": user_prompt_2}]}
        ],  # Use vibe data as user content
        "systemInstruction": {
            "parts": [{"text": system_instruction_2}]
        },  # Use new instruction
    }

    response_2 = requests.post(GEMINI_API_URL, json=payload_2)
    response_2.raise_for_status()
    result_2 = response_2.json()

    final_prompt_text = (
        result_2.get("candidates", [{}])[0]
        .get("content", {})
        .get("parts", [{}])[0]
        .get("text")
    )

    if not final_prompt_text:
        raise Exception("AI could not generate the final image prompt.")

    print(f"FINAL PROMPT TEXT \n{final_prompt_text}")
    return final_prompt_text.strip()


def generate_image(vibe_prompt: str):
    """
    Calls OpenRouter (Nano Banana / Gemini 2.5) to generate an image.
    Returns a string that can be used directly in <img src="">.
    It handles both Base64 and URL responses.
    """
    return get_dummy_image()
    print(f"--- Calling OpenRouter (Nano Banana) with prompt: {vibe_prompt[:50]}...")

    openrouter_headers = {
        "Authorization": f"Bearer {OPENROUTER_API_KEY}",
        "Content-Type": "application/json",
        "HTTP-Referer": "http://localhost:5000",
        "X-Title": "AI Playlist Cover Gen",
    }

    payload = {
        "model": "google/gemini-2.5-flash-image",
        "messages": [{"role": "user", "content": vibe_prompt}],
        "generationConfig": {"responseModalities": ["IMAGE"]},
    }

    try:
        response = requests.post(
            OPENROUTER_API_URL, headers=openrouter_headers, json=payload, timeout=45
        )
        response.raise_for_status()
        result = response.json()

        choice = result.get("choices", [{}])[0]
        message = choice.get("message", {})
        images = message.get("images", [])

        if not images:
            print("--- [WARN] No images found in response, returning dummy image.")
            return get_dummy_image()

        first_image = images[0]

        # --- Check for Base64 or URL ---
        if "b64_json" in first_image:
            b64_data = first_image["b64_json"]
            return f"data:image/png;base64,{b64_data}"

        elif "image_url" in first_image:
            img_url = first_image["image_url"]
            # image_url can be a dict with 'url' or 'b64'
            if isinstance(img_url, dict):
                if "b64" in img_url:
                    print("returned b64")
                    image_data = img_url["b64"]
                elif "url" in img_url:
                    print("returned url")
                    image_data = img_url["url"]
                # Detect if it's a base64 or a URL
                print(image_data[:100])
                if image_data.startswith("http"):
                    pass
                elif image_data.startswith("data:image"):
                    image_data = image_data.split(",", 1)[-1]
                else:
                    image_data = f"data:image/png;base64,{image_data}"
                return image_data
            else:
                return img_url

        else:
            print("--- [WARN] No valid image data found, returning dummy image.")
            return get_dummy_image()

    except Exception as e:
        print(f"--- [ERROR] Image generation failed: {e}")
        return get_dummy_image()


def get_dummy_image():
    """Returns a Base64-encoded dummy image for fallback purposes."""
    script_dir = os.path.dirname(os.path.abspath(__file__))
    image_path = os.path.join(script_dir, "dummy.png")
    with open(image_path, "rb") as image_file:
        image_data = image_file.read()
        dummy_base64_image = base64.b64encode(image_data).decode("utf-8")
    print(dummy_base64_image[:100])
    return dummy_base64_image

def extract_playlist_id(url):
    """Extracts the playlist ID from a Spotify URL."""
    try:
        return url.split("playlist/")[1].split("?")[0]
    except IndexError:
        return None


# --- Main API Route ---
# Vercel will route requests to /api/generate to this function
@app.route("/api/generate", methods=["POST"])
def handler():
    if not all(
        [OPENROUTER_API_KEY, GOOGLE_API_KEY, SPOTIFY_CLIENT_ID, SPOTIFY_CLIENT_SECRET]
    ):
        return jsonify({"error": "Server is missing API key configuration."}), 500

    try:
        data = request.json
        
        if "playlistLink" in data:
            playlist_link = data.get("playlistLink")
            if not playlist_link:
                return jsonify({"error": "No playlistLink provided."}), 400

            playlist_id = extract_playlist_id(playlist_link)
            if not playlist_id:
                return jsonify({"error": "Invalid Spotify playlist link."}), 400

            # Full API Workflow
            token = get_spotify_token()
            details = get_playlist_details(playlist_id, token)
            naive_vibe_prompt = get_playlist_vibes(details)
            
            # send naive_vibe_prompt to the frontend so the user can update it
            return jsonify({"vibePrompt": naive_vibe_prompt})
        
        # send it back to backend for generation
        elif "updatedVibePrompt" in data:
            updated_vibe_prompt = data.get("updatedVibePrompt")
            if not updated_vibe_prompt:
                 return jsonify({"error": "No updatedVibePrompt provided."}), 400

            imagegen_prompt = get_imagegen_prompt(updated_vibe_prompt)
            image_data = generate_image(imagegen_prompt)
            return jsonify({"base64Image": image_data})

    except requests.exceptions.HTTPError as e:
        # Log the actual error on the server
        print(f"HTTPError: {e.response.text}")
        return (
            jsonify({"error": f"API error: {e.response.status_code}"}),
            e.response.status_code,
        )
    except Exception as e:
        # Log the actual error on the server
        print(f"Exception: {e}")
        return jsonify({"error": str(e)}), 500


# Vercel needs this to run the app
if __name__ == "__main__":
    app.run(debug=True, port=5000)
