import os
import shutil
import uvicorn
import requests
import io
import json
from fastapi import FastAPI, UploadFile, File, Form, HTTPException
from typing import List
from PIL import Image
import numpy as np
from mtcnn.mtcnn import MTCNN
from tensorflow.keras.models import load_model
from sklearn.preprocessing import Normalizer
from scipy.spatial import distance
from concurrent.futures import ThreadPoolExecutor

# --- Configuration ---
FACENET_MODEL_PATH = 'facenet_keras.h5'
EMBEDDINGS_DIR = "data/embeddings"  # Directory to store embedding files
os.makedirs(EMBEDDINGS_DIR, exist_ok=True)

# --- FastAPI App Initialization ---
app = FastAPI(title="Face Recognition API")

# --- Global Resources ---
# These are loaded once at startup to avoid reloading them for each request.
facenet_model = None
mtcnn_detector = None
in_encoder = Normalizer()

@app.on_event("startup")
def load_resources():
    """Load the ML models into memory when the application starts."""
    global facenet_model, mtcnn_detector
    if os.path.exists(FACENET_MODEL_PATH):
        facenet_model = load_model(FACENET_MODEL_PATH)
        mtcnn_detector = MTCNN()
        print("✅ Models loaded successfully.")
    else:
        print(f"❌ ERROR: Model file not found at {FACENET_MODEL_PATH}")
        facenet_model = None  # Ensure model is None if loading fails
        mtcnn_detector = None

# --- Core Functions ---

def extract_face(image_bytes: bytes, required_size=(160, 160)):
    """Detects and extracts a single face from image bytes using MTCNN."""
    try:
        image = Image.open(io.BytesIO(image_bytes)).convert("RGB")
        pixels = np.asarray(image)
        results = mtcnn_detector.detect_faces(pixels)
        if not results:
            return None  # No face detected
        # Extract coordinates of the first face found
        x1, y1, width, height = results[0]['box']
        x1, y1 = abs(x1), abs(y1)
        x2, y2 = x1 + width, y1 + height
        face_pixels = pixels[y1:y2, x1:x2]
        # Resize face to the model's required input size
        face_image = Image.fromarray(face_pixels).resize(required_size)
        return np.asarray(face_image)
    except Exception as e:
        # This will catch errors from PIL, like for corrupted images
        print(f"Face extraction error: {e}")
        return None

def get_embedding(face_pixels: np.ndarray) -> np.ndarray:
    """Generates a 128-dimensional embedding for a given face."""
    face_pixels = face_pixels.astype('float32')
    # Standardize pixel values
    mean, std = face_pixels.mean(), face_pixels.std()
    face_pixels = (face_pixels - mean) / std
    # Add batch dimension and predict
    sample = np.expand_dims(face_pixels, axis=0)
    embedding = facenet_model.predict(sample)
    return embedding[0]

# --- API Endpoints ---

@app.post("/add_embeddings_from_urls/")
async def add_embeddings_from_urls(
    urls: List[str] = Form(...),
    embedding_file: str = Form("embeddings.json")
):
    """
    Downloads images from URLs concurrently, generates face embeddings, 
    and appends them to a specified JSON file.
    """
    if not facenet_model:
        raise HTTPException(status_code=503, detail="Model not loaded. Cannot process request.")

    embedding_filepath = os.path.join(EMBEDDINGS_DIR, embedding_file)
    
    # Load existing embeddings if the file exists
    url_embedding_map = []
    if os.path.exists(embedding_filepath):
        with open(embedding_filepath, 'r') as f:
            try:
                url_embedding_map = json.load(f)
            except json.JSONDecodeError:
                url_embedding_map = []

    total_urls = len(urls)
    print(f"Received {total_urls} URLs to process.")

    def process_url(url: str, index: int):
        """Worker function to download an image, extract face, and get embedding."""
        # --- Progress Indicator ---
        print(f"--> Processing URL {index + 1}/{total_urls}: {url}")
        
        try:
            response = requests.get(url, timeout=10)
            if response.status_code != 200:
                print(f"    [FAILED] Download failed for {url} with status code: {response.status_code}")
                return None
            
            image_bytes = response.content
            face_pixels = extract_face(image_bytes)
            if face_pixels is not None:
                embedding = get_embedding(face_pixels)
                normalized_embedding = in_encoder.transform([embedding])[0]
                print(f"    [SUCCESS] Embedding created for {url}")
                return {"url": url, "embedding": normalized_embedding.tolist()}
            else:
                print(f"    [FAILED] No face detected in {url}")
                return None
        except requests.exceptions.RequestException as e:
            print(f"    [ERROR] Network error for {url}: {e}")
        except Exception as e:
            print(f"    [ERROR] An unexpected error occurred for {url}: {e}")
        return None

    new_embeddings = []
    # Use ThreadPoolExecutor for concurrent processing
    with ThreadPoolExecutor(max_workers=8) as executor:
        # Submit all URLs with their index to the executor
        futures = [executor.submit(process_url, url, i) for i, url in enumerate(urls)]
        
        for future in futures:
            result = future.result()
            if result:
                new_embeddings.append(result)

    # Append new valid embeddings to the existing map
    if new_embeddings:
        url_embedding_map.extend(new_embeddings)
        # Save the updated list back to the file
        with open(embedding_filepath, 'w') as f:
            json.dump(url_embedding_map, f, indent=4)
        
    print(f"--- Finished processing. Added {len(new_embeddings)} new embeddings. ---")
    
    return {
        "message": f"Successfully processed {total_urls} URLs and added {len(new_embeddings)} new embeddings.",
        "embedding_file": embedding_file,
        "total_embeddings": len(url_embedding_map)
    }

@app.post("/find_similar_faces/")
async def find_similar_faces(
    file: UploadFile = File(...),
    embedding_file: str = Form("embeddings.json"),
    threshold: float = Form(0.5)
):
    """
    Compares an uploaded face to a stored list of embeddings, returning the
    top 5 most similar image URLs and their similarity scores.
    """
    if not facenet_model:
        raise HTTPException(status_code=503, detail="Model not loaded. Cannot process request.")

    embedding_filepath = os.path.join(EMBEDDINGS_DIR, embedding_file)
    if not os.path.exists(embedding_filepath):
        raise HTTPException(status_code=404, detail=f"Embedding file not found: {embedding_file}")

    # Load the stored URL-embedding map
    with open(embedding_filepath, 'r') as f:
        try:
            url_embedding_map = json.load(f)
        except json.JSONDecodeError:
             raise HTTPException(status_code=500, detail="Embedding file is corrupted or not valid JSON.")


    # Process the input image
    input_bytes = await file.read()
    face_pixels = extract_face(input_bytes)
    if face_pixels is None:
        raise HTTPException(status_code=400, detail="No face detected in the uploaded image.")

    input_embedding = get_embedding(face_pixels)
    normalized_input_embedding = in_encoder.transform([input_embedding])[0]

    # Find matches above the threshold
    results = []
    for item in url_embedding_map:
        # --- ADD THIS CHECK ---
        # Defensively check if the item is a dictionary with the required keys
        if not isinstance(item, dict) or "embedding" not in item or "url" not in item:
            print(f"WARNING: Skipping malformed entry in {embedding_file}: {item}")
            continue
        # --- END CHECK ---

        # Cosine similarity is 1 minus cosine distance
        similarity = 1 - distance.cosine(normalized_input_embedding, np.array(item["embedding"]))
        if similarity > threshold:
            results.append({"url": item["url"], "score": float(similarity)})

    # Sort matches by similarity score (descending) and return the top 5
    results.sort(key=lambda x: x["score"], reverse=True)

    return {"match_count": len(results), "matches": results}

@app.get("/")
def root():
    """Health check endpoint."""
    return {"status": "✅ API Running", "model_loaded": facenet_model is not None}

# --- To run the app locally ---
if __name__ == "__main__":
    print("To run the app, use the command:")
    print("uvicorn main_fastapi:app --host 0.0.0.0 --port 8080 --reload")
    uvicorn.run("main_fastapi:app", host="0.0.0.0", port=8080, reload=True)