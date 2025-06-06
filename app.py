# app.py
import os
from flask import Flask, request, jsonify, send_from_directory
from flask_cors import CORS
from werkzeug.utils import secure_filename
import uuid
import requests
import datetime

# Import our custom modules
from config import ML_API_BASE_URL
from r2_storage import upload_to_r2, list_objects, get_object_url, delete_from_r2
from auth import create_token, verify_token, authenticate_user, PASSWORD_DB

app = Flask(__name__, static_folder='frontend')
CORS(app)

# --- Configuration ---
UPLOAD_FOLDER = 'uploads'
ALLOWED_EXTENSIONS = {'png', 'jpg', 'jpeg', 'gif'}
if not os.path.exists(UPLOAD_FOLDER):
    os.makedirs(UPLOAD_FOLDER)

def allowed_file(filename):
    """Checks if the file extension is allowed."""
    return '.' in filename and filename.rsplit('.', 1)[1].lower() in ALLOWED_EXTENSIONS

# This function is no longer called directly from an endpoint,
# but can be kept as a helper if needed elsewhere, though it is now unused.
def trigger_batch_embedding(image_urls, album_id):
    # ... (code for this function remains the same, but it's not used by any endpoint now)
    pass

def trigger_embedding_removal(album_id, image_url):
    """Calls the ML API to remove an embedding for a deleted photo."""
    embedding_filename = f"{album_id}_embeddings.json"
    api_endpoint = f"{ML_API_BASE_URL}/remove_embedding/"
    try:
        payload = {'image_url': image_url, 'embedding_file': embedding_filename}
        response = requests.post(api_endpoint, data=payload, timeout=60)
        return response.status_code == 200, response.json()
    except requests.exceptions.RequestException as e:
        print(f"ML API remove embedding request failed: {e}")
        return False, {"error": "API request to remove embedding failed.", "details": str(e)}

# --- Static File Serving ---
@app.route('/')
def index():
    return send_from_directory('frontend', 'index.html')

@app.route('/<path:path>')
def serve_static(path):
    return send_from_directory('frontend', path)

# --- API Endpoints ---
@app.route('/api/auth/login', methods=['POST'])
def login():
    data = request.get_json()
    username = data.get('username')
    password = data.get('password')
    if authenticate_user(username, password):
        token = create_token(username)
        return jsonify({"token": token, "username": username})
    return jsonify({"error": "Invalid credentials"}), 401

@app.route('/api/auth/verify', methods=['GET'])
def verify_auth_token():
    # ... (This endpoint remains the same)
    token = request.headers.get('Authorization', '').replace('Bearer ', '')
    try:
        payload = verify_token(token)
        return jsonify({"valid": True, "username": payload['sub']})
    except Exception as e:
        return jsonify({"valid": False, "error": str(e)}), 401


@app.route('/api/create-album', methods=['POST'])
def create_album():
    # ... (This endpoint remains the same)
    token = request.headers.get('Authorization', '').replace('Bearer ', '')
    try:
        payload = verify_token(token)
        username = payload['sub']
    except Exception as e:
        return jsonify({"error": "Authentication failed", "details": str(e)}), 401
    data = request.get_json()
    if not data or 'name' not in data:
        return jsonify({"error": "Missing album name"}), 400
    album_display_name = data['name']
    album_id = secure_filename(album_display_name.lower().replace(' ', '-'))
    if not album_id: return jsonify({"error": "Invalid album name"}), 400
    r2_placeholder_path = f"{username}/{album_id}/.placeholder"
    temp_placeholder_file = os.path.join(UPLOAD_FOLDER, f"{uuid.uuid4()}_.placeholder")
    with open(temp_placeholder_file, 'w') as f: f.write('')
    upload_success, _ = upload_to_r2(temp_placeholder_file, r2_placeholder_path)
    os.remove(temp_placeholder_file)
    if upload_success:
        return jsonify({"message": "Album created successfully", "album": {"id": album_id, "name": album_display_name}}), 201
    else:
        return jsonify({"error": "Failed to create album in storage"}), 500


### --- NEW ENDPOINT to handle a single file upload --- ###
# The frontend will call this endpoint repeatedly for each file.
@app.route('/api/upload-single-file', methods=['POST'])
def upload_single_file_route():
    token = request.headers.get('Authorization', '').replace('Bearer ', '')
    try:
        username = verify_token(token)['sub']
    except Exception as e:
        return jsonify({"error": "Authentication failed", "details": str(e)}), 401

    if 'file' not in request.files:
        return jsonify({"error": "No file part"}), 400
    
    file_to_upload = request.files['file']
    album_id = request.form.get('album')

    if not album_id:
        return jsonify({"error": "Album ID is missing"}), 400

    if file_to_upload and allowed_file(file_to_upload.filename):
        original_filename = secure_filename(file_to_upload.filename)
        unique_name = f"{uuid.uuid4()}_{original_filename}"
        local_path = os.path.join(UPLOAD_FOLDER, unique_name)
        file_to_upload.save(local_path)

        r2_path = f"{username}/{album_id}/{unique_name}"
        upload_success, public_url = upload_to_r2(local_path, r2_path)
        os.remove(local_path)

        if upload_success:
            return jsonify({"success": True, "name": original_filename, "url": public_url, "id": unique_name}), 200
        else:
            return jsonify({"success": False, "error": "Failed to upload to R2 storage."}), 500
    else:
        return jsonify({"success": False, "error": "File type not allowed or no file submitted."}), 400


# The old /api/upload endpoint is no longer needed as the logic is now split
# between the frontend and the new /api/upload-single-file endpoint.

@app.route('/api/albums', methods=['GET'])
def get_albums():
    # ... (This endpoint remains the same)
    token = request.headers.get('Authorization', '').replace('Bearer ', '')
    try:
        username = verify_token(token)['sub']
        album_prefixes = list_objects(f"{username}/", delimiter="/")
        formatted_albums = []
        if album_prefixes:
            for album_prefix in album_prefixes:
                album_id = album_prefix.rstrip('/').split('/')[-1]
                if not album_id: continue
                all_files = list_objects(album_prefix)
                actual_photos = [obj for obj in all_files if not obj.endswith('/') and not obj.endswith('.placeholder')]
                photo_count = len(actual_photos)
                cover_image_url = get_object_url(actual_photos[0]) if actual_photos else None
                formatted_albums.append({"id": album_id, "name": album_id.replace('-', ' ').title(), "cover": cover_image_url, "photo_count": photo_count})
        return jsonify(formatted_albums)
    except Exception as e:
        return jsonify({"error": "Could not retrieve albums.", "details": str(e)}), 500

@app.route('/api/albums/<album_id>', methods=['GET'])
def get_album_photos(album_id):
    # ... (This endpoint remains the same)
    token = request.headers.get('Authorization', '').replace('Bearer ', '')
    try:
        username = verify_token(token)['sub']
        photo_keys = list_objects(f"{username}/{album_id}/")
        photos = [{"id": key.split('/')[-1], "url": get_object_url(key), "name": key.split('/')[-1]} for key in photo_keys if not key.endswith('/') and not key.endswith('.placeholder')]
        return jsonify(photos)
    except Exception as e:
        return jsonify({"error": "Could not retrieve album photos.", "details": str(e)}), 500


@app.route('/api/albums/<album_id>/photos/delete', methods=['POST'])
def delete_album_photos(album_id):
    # ... (This endpoint remains the same)
    token = request.headers.get('Authorization', '').replace('Bearer ', '')
    try:
        username = verify_token(token)['sub']
    except Exception as e:
        return jsonify({"error": "Authentication failed", "details": str(e)}), 401
    data = request.get_json()
    if not data or 'photo_ids' not in data:
        return jsonify({"error": "Invalid request: 'photo_ids' list is required."}), 400
    photo_ids_to_delete = data['photo_ids']
    deleted_count, errors = 0, []
    for photo_filename in photo_ids_to_delete:
        r2_object_key = f"{username}/{album_id}/{secure_filename(photo_filename)}"
        public_url = get_object_url(r2_object_key)
        success, error_msg = delete_from_r2(r2_object_key)
        if success:
            deleted_count += 1
            trigger_embedding_removal(album_id, public_url)
        else:
            errors.append({"photo_id": photo_filename, "error": error_msg or "Failed to delete from storage."})
    if errors:
        return jsonify({"message": f"Deletion completed with {len(errors)} errors.", "deleted_count": deleted_count, "errors": errors}), 207
    return jsonify({"message": f"Successfully deleted {deleted_count} photo(s)."}), 200


@app.route('/api/find-matches', methods=['POST'])
def find_matches():
    # ... (This endpoint remains the same)
    token = request.headers.get('Authorization', '').replace('Bearer ', '')
    try:
        verify_token(token)
    except Exception as e:
        return jsonify({"error": "Authentication failed", "details": str(e)}), 401
    if 'file' not in request.files or 'album' not in request.form:
        return jsonify({"error": "Missing file or album ID"}), 400
    file = request.files['file']
    album_id = request.form['album']
    embedding_file_name = f"{album_id}_embeddings.json"
    try:
        api_endpoint = f"{ML_API_BASE_URL}/find_similar_faces/"
        files_payload = {"file": (secure_filename(file.filename), file.read(), file.content_type)}
        data_payload = {"embedding_file": embedding_file_name}
        response = requests.post(api_endpoint, files=files_payload, data=data_payload, timeout=60)
        return jsonify(response.json()), response.status_code
    except Exception as e:
        return jsonify({"error": "Error finding matches.", "details": str(e)}), 500

@app.route('/api/check-password/<album_id>', methods=['POST'])
def check_album_password(album_id):
    # ... (This endpoint remains the same)
    data = request.get_json()
    password = data.get('password')
    if album_id in PASSWORD_DB and PASSWORD_DB[album_id] == password:
        guest_token = create_token(f"guest-{album_id}", expires_in=3600)
        return jsonify({"valid": True, "token": guest_token})
    return jsonify({"valid": False, "error": "Incorrect password"}), 401

if __name__ == '__main__':
    app.run(debug=True, host='0.0.0.0', port=int(os.environ.get("PORT", 8000)))

