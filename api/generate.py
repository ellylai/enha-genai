import os
import requests
import base64
from flask import Flask, request, jsonify
from flask_cors import CORS
import json

# --- Environment Setup ---
# On Vercel, set these in the "Environment Variables" settings
GOOGLE_API_KEY = os.environ.get("GOOGLE_API_KEY")
SPOTIFY_CLIENT_ID = os.environ.get("SPOTIFY_CLIENT_ID")
SPOTIFY_CLIENT_SECRET = os.environ.get("SPOTIFY_CLIENT_SECRET")
OPENROUTER_API_KEY = os.environ.get("OPENROUTER_API_KEY")

# --- API Endpoints ---
GEMINI_API_URL = f"https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-preview-09-2025:generateContent?key={GOOGLE_API_KEY}"
IMAGEN_API_URL = f"https://generativelanguage.googleapis.com/v1beta/models/imagen-3.0-generate-002:predict?key={GOOGLE_API_KEY}"
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


def get_playlist_vibes(track_list_string):
    """
    Calls the Gemini API twice to analyze vibes (as JSON) and then generate a final image prompt.
    """

    # --- First Call: Analyze Vibes (Optimized for JSON) ---
    system_prompt_1 = """
        You are a playlist vibe analyzer. A user has provided playlist details. 
        Analyze its core 'vibe' and return a JSON object with the following keys:
        - "light_or_dark": "dark" or "light"
        - "time_of_day": e.g., "midnight", "golden hour", "late afternoon", "sunrise"
        - "objects": a list of 3-4 specific, evocative objects (e.g., ["a neon sign", "a cracked mirror", "a single rose"])
        - "colors": a list of 3-4 coordinating colors (e.g., ["deep indigo", "electric pink", "gunmetal grey"])
        - "mood": a concise 2-5 word mood description (e.g., "melancholic urban solitude", "energetic summer joy")

        Return ONLY the valid JSON object and nothing else.
        """

    payload_1 = {
        "contents": [{"parts": [{"text": track_list_string}]}],
        "systemInstruction": {"parts": [{"text": system_prompt_1}]},
        "generationConfig": {
            "responseMimeType": "application/json",  # <-- Request JSON output
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
        vibe_data = json.loads(text_1)

        dark_light = vibe_data.get("light_or_dark", "neutral")
        time_of_day = vibe_data.get("time_of_day", "anytime")
        objects_list = vibe_data.get("objects", ["anything"])
        colors_list = vibe_data.get("colors", ["any color"])
        mood_desc = vibe_data.get("mood", "any mood")

        objects = ", ".join(objects_list)
        colors = ", ".join(colors_list)

    except (json.JSONDecodeError, AttributeError, KeyError) as e:
        print(f"JSON parsing failed: {e}")
        raise Exception("AI vibe analysis returned unparsable data.")

    user_prompt_2 = f"""
        Here are the vibes to synthesize:
        dark or light: {dark_light}
        time of day: {time_of_day}
        objects: {objects}
        colors: {colors}
        mood: {mood_desc}
    """
    print(f"USER_PROMPT_2 \n{user_prompt_2}")

    system_instruction_2 = """
        You are an expert prompt engineer for an AI image generator. 
        Your job is to take a set of vibe descriptions and synthesize them into a single, powerful, and evocative image prompt.
        Focus on visual composition, style, and atmosphere. DO NOT just list the items.
        Make it sound like a beautiful, artistic description.
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


def generate_image(vibe_prompt):
    """
    Calls OpenRouter (Nano Banana) to generate an image.
    """
    print(f"--- Calling OpenRouter (Nano Banana) with prompt: {vibe_prompt[:50]}...")

    # --- OpenRouter Headers ---
    openrouter_headers = {
        "Authorization": f"Bearer {OPENROUTER_API_KEY}",
        "Content-Type": "application/json",
        "HTTP-Referer": "http://localhost:5000",  # Can be any URL
        "X-Title": "AI Playlist Cover Gen",  # App name
    }

    # This model uses a special payload structure on OpenRouter
    payload = {
        "model": "google/gemini-2.5-flash-image",  # Nano Banana
        "messages": [{"role": "user", "content": vibe_prompt}],
        "generationConfig": {
            "responseModalities": ["IMAGE"]  # Pass this config for this model
        },
    }

    response = requests.post(
        OPENROUTER_API_URL, headers=openrouter_headers, json=payload
    )
    response.raise_for_status()
    result = response.json()

    # The response structure is different. The image is in the 'content' list.
    parts = result.get("choices", [{}])[0].get("message", {}).get("content", [])

    base64_image = None
    for part in parts:
        if "inlineData" in part:
            base64_image = part["inlineData"].get("data")
            break  # Found the image

    if not base64_image:
        raise Exception("AI could not generate an image (OpenRouter/Nano Banana).")

    return base64_image

    # BEFORE having access to API, RETURN A DUMMY IMAGE
    script_dir = os.path.dirname(os.path.abspath(__file__))
    image_path = os.path.join(script_dir, "dummy.png")
    with open(image_path, "rb") as image_file:
        image_data = image_file.read()
        dummy_base64_image = base64.b64encode(image_data).decode("utf-8")
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
    if not all([OPENROUTER_API_KEY, SPOTIFY_CLIENT_ID, SPOTIFY_CLIENT_SECRET]):
        return jsonify({"error": "Server is missing API key configuration."}), 500

    try:
        data = request.json
        playlist_link = data.get("playlistLink")
        if not playlist_link:
            return jsonify({"error": "No playlistLink provided."}), 400

        playlist_id = extract_playlist_id(playlist_link)
        if not playlist_id:
            return jsonify({"error": "Invalid Spotify playlist link."}), 400

        # Full API Workflow
        token = get_spotify_token()
        details = get_playlist_details(playlist_id, token)
        vibe_prompt = get_playlist_vibes(details)
        base64_image = generate_image(vibe_prompt)

        return jsonify({"base64Image": base64_image})

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
    app.run(debug=True)
