# main_fastapi.py

import os
import io
import json
import uvicorn
import requests
import numpy as np
from PIL import Image
from typing import List
from concurrent.futures import ThreadPoolExecutor

from fastapi import FastAPI, UploadFile, File, Form, HTTPException
from mtcnn.mtcnn import MTCNN
from tensorflow.keras.models import load_model
from sklearn.preprocessing import Normalizer
from scipy.spatial import distance
import boto3
from botocore.exceptions import ClientError

# --- Configuration ---
from config import R2_CONFIG

FACENET_MODEL_PATH = 'facenet_keras.h5'
EMBEDDINGS_DIR = "data/embeddings"  # Directory for temporary local storage
os.makedirs(EMBEDDINGS_DIR, exist_ok=True)

# --- FastAPI App Initialization ---
app = FastAPI(title="Face Recognition API")

# --- Global Resources ---
facenet_model = None
mtcnn_detector = None
in_encoder = Normalizer()
s3_client = None

@app.on_event("startup")
def load_resources():
    """Load models and initialize R2 client at startup."""
    global facenet_model, mtcnn_detector, s3_client

    # Load ML Models
    if os.path.exists(FACENET_MODEL_PATH):
        facenet_model = load_model(FACENET_MODEL_PATH)
        mtcnn_detector = MTCNN()
        print("✅ Models loaded successfully.")
    else:
        print(f"❌ ERROR: Model file not found at {FACENET_MODEL_PATH}")

    # Initialize R2/S3 Client
    try:
        s3_client = boto3.client(
            's3',
            endpoint_url=R2_CONFIG["endpoint_url"],
            aws_access_key_id=R2_CONFIG["aws_access_key_id"],
            aws_secret_access_key=R2_CONFIG["aws_secret_access_key"],
        )
        print("✅ R2/S3 client initialized successfully.")
    except Exception as e:
        print(f"❌ ERROR: Failed to initialize R2/S3 client: {e}")


# --- Core Functions (No changes needed here) ---
def extract_face(image_bytes: bytes, required_size=(160, 160)):
    try:
        image = Image.open(io.BytesIO(image_bytes)).convert("RGB")
        pixels = np.asarray(image)
        results = mtcnn_detector.detect_faces(pixels)
        if not results:
            return None
        x1, y1, width, height = results[0]['box']
        x1, y1 = abs(x1), abs(y1)
        x2, y2 = x1 + width, y1 + height
        face_pixels = pixels[y1:y2, x1:x2]
        face_image = Image.fromarray(face_pixels).resize(required_size)
        return np.asarray(face_image)
    except Exception as e:
        print(f"Face extraction error: {e}")
        return None

def get_embedding(face_pixels: np.ndarray) -> np.ndarray:
    face_pixels = face_pixels.astype('float32')
    mean, std = face_pixels.mean(), face_pixels.std()
    face_pixels = (face_pixels - mean) / std
    sample = np.expand_dims(face_pixels, axis=0)
    embedding = facenet_model.predict(sample)
    return embedding[0]

# --- API Endpoints (Modified for R2 Storage) ---

@app.post("/add_embeddings_from_urls/")
async def add_embeddings_from_urls(
    urls: List[str] = Form(...),
    embedding_file: str = Form(...)
):
    """
    Generates embeddings and saves them to a JSON file in R2 storage.
    """
    if not facenet_model or not s3_client:
        raise HTTPException(status_code=503, detail="A core service (ML model or Storage) is not available.")

    local_temp_path = os.path.join(EMBEDDINGS_DIR, embedding_file)
    url_embedding_map = []

    # 1. Download existing embeddings file from R2 if it exists
    try:
        print(f"Downloading {embedding_file} from R2 bucket...")
        s3_client.download_file(R2_CONFIG["bucket_name"], embedding_file, local_temp_path)
        with open(local_temp_path, 'r') as f:
            url_embedding_map = json.load(f)
        print("Successfully loaded existing embeddings.")
    except ClientError as e:
        if e.response['Error']['Code'] == '404':
            print(f"Info: {embedding_file} not found in R2. A new file will be created.")
            url_embedding_map = []
        else:
            raise HTTPException(status_code=500, detail=f"R2 download error: {e}")

    # 2. Process new URLs and generate embeddings
    def process_url(url: str):
        try:
            response = requests.get(url, timeout=20)
            if response.status_code != 200: return None
            face_pixels = extract_face(response.content)
            if face_pixels is None: return None
            embedding = get_embedding(face_pixels)
            normalized_embedding = in_encoder.transform([embedding])[0]
            print(f"  [SUCCESS] Embedding created for {url}")
            return {"url": url, "embedding": normalized_embedding.tolist()}
        except Exception as e:
            print(f"  [ERROR] Processing {url}: {e}")
            return None

    new_embeddings = []
    with ThreadPoolExecutor(max_workers=8) as executor:
        results = executor.map(process_url, urls)
        new_embeddings = [res for res in results if res]

    # 3. Append new embeddings and upload the updated file back to R2
    if new_embeddings:
        url_embedding_map.extend(new_embeddings)
        with open(local_temp_path, 'w') as f:
            json.dump(url_embedding_map, f, indent=4)
        
        try:
            print(f"Uploading updated {embedding_file} to R2...")
            s3_client.upload_file(local_temp_path, R2_CONFIG["bucket_name"], embedding_file)
            print("✅ Upload successful.")
        except Exception as e:
            raise HTTPException(status_code=500, detail=f"Failed to upload embeddings to R2: {e}")
        finally:
            if os.path.exists(local_temp_path):
                os.remove(local_temp_path)
    
    return {
        "message": f"Successfully updated {embedding_file} with {len(new_embeddings)} new embeddings.",
        "total_embeddings": len(url_embedding_map)
    }

@app.post("/find_similar_faces/")
async def find_similar_faces(
    file: UploadFile = File(...),
    embedding_file: str = Form(...),
    threshold: float = Form(0.55)
):
    if not facenet_model or not s3_client:
        raise HTTPException(status_code=503, detail="A core service (ML model or Storage) is not available.")

    local_temp_path = os.path.join(EMBEDDINGS_DIR, embedding_file)

    # 1. Download the required embeddings file from R2
    try:
        print(f"Downloading {embedding_file} from R2 for search...")
        s3_client.download_file(R2_CONFIG["bucket_name"], embedding_file, local_temp_path)
    except ClientError as e:
        if e.response['Error']['Code'] == '404':
            return {"match_count": 0, "matches": [], "message": f"Album embeddings '{embedding_file}' not found."}
        else:
            raise HTTPException(status_code=500, detail=f"R2 download error: {e}")

    with open(local_temp_path, 'r') as f:
        url_embedding_map = json.load(f)
    
    if os.path.exists(local_temp_path):
        os.remove(local_temp_path) # Clean up immediately

    # 2. Process input image and find matches
    input_bytes = await file.read()
    face_pixels = extract_face(input_bytes)
    if face_pixels is None:
        raise HTTPException(status_code=400, detail="No face detected in the uploaded image.")

    input_embedding = get_embedding(face_pixels)
    normalized_input_embedding = in_encoder.transform([input_embedding])[0]

    results = []
    for item in url_embedding_map:
        similarity = 1 - distance.cosine(normalized_input_embedding, np.array(item["embedding"]))
        if similarity > threshold:
            results.append({"url": item["url"], "score": float(similarity)})

    results.sort(key=lambda x: x["score"], reverse=True)
    return {"match_count": len(results), "matches": results[:10]} # Return top 10 matches


@app.get("/")
def root():
    return {"status": "✅ API Running", "model_loaded": facenet_model is not None}


if __name__ == "__main__":
    uvicorn.run("main_fastapi:app", host="0.0.0.0", port=8080, reload=True)