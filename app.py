# app.py
import os
from flask import Flask, request, jsonify, send_from_directory
from flask_cors import CORS
from werkzeug.utils import secure_filename
import uuid
import json # Make sure json is imported
import datetime
import requests

# Import our custom modules
from r2_storage import upload_to_r2, list_objects, get_object_url, delete_from_r2 # <-- Import delete_from_r2
from auth import create_token, verify_token, authenticate_user, PASSWORD_DB

app = Flask(__name__, static_folder='frontend')
CORS(app)

# --- Configuration ---
UPLOAD_FOLDER = 'uploads' # Used for temporary storage before R2
ALLOWED_EXTENSIONS = {'png', 'jpg', 'jpeg', 'gif'}
ML_API_BASE_URL = "https://facerecognition-api-149850785336.asia-south1.run.app"

if not os.path.exists(UPLOAD_FOLDER):
    os.makedirs(UPLOAD_FOLDER)

def allowed_file(filename):
    return '.' in filename and filename.rsplit('.', 1)[1].lower() in ALLOWED_EXTENSIONS

def trigger_single_embedding(image_url, album_name):
    embedding_filename = f"{album_name}_embeddings.json" # Ensure album_name here is the R2 folder name
    api_endpoint = f"{ML_API_BASE_URL}/add_embeddings_from_urls/" # Your ML API
    
    payload = [('urls', image_url)]
    payload.append(('embedding_file', embedding_filename))
    
    try:
        print(f"Calling ML API for URL: {image_url}, embedding file: {embedding_filename}")
        response = requests.post(api_endpoint, data=payload, timeout=60) # Increased timeout
        
        if response.status_code == 200:
            return True, response.json()
        else:
            print(f"ML API Error ({response.status_code}): {response.text}")
            return False, {"error": "ML API processing failed", "details": response.text}
            
    except requests.exceptions.RequestException as e:
        print(f"ML API Request Exception: {e}")
        return False, {"error": "ML API request failed", "details": str(e)}

@app.route('/')
def index():
    return send_from_directory('frontend', 'index.html')

@app.route('/<path:path>')
def serve_static(path):
    # Check if the path is for the album_detail_template.html
    if path == 'album_detail_template.html':
        return send_from_directory('frontend', path) # Serve it from frontend directory
    return send_from_directory('frontend', path)


@app.route('/api/auth/login', methods=['POST'])
def login():
    data = request.get_json()
    if not data or 'username' not in data or 'password' not in data:
        return jsonify({"error": "Missing username or password"}), 400
    username = data['username']
    password = data['password']
    if authenticate_user(username, password):
        token = create_token(username)
        # Optionally, include email if your USER_DB stores it or you have a way to fetch it
        user_email = f"{username}@example.com" # Placeholder
        return jsonify({"token": token, "username": username, "email": user_email })
    return jsonify({"error": "Invalid credentials"}), 401

@app.route('/api/auth/verify', methods=['GET'])
def verify_auth_token(): # Renamed to avoid conflict if you have a 'verify' blueprint elsewhere
    token = request.headers.get('Authorization', '').replace('Bearer ', '')
    try:
        payload = verify_token(token)
        # Optionally, include email
        user_email = f"{payload['sub']}@example.com" # Placeholder
        return jsonify({"valid": True, "username": payload['sub'], "email": user_email})
    except Exception as e:
        print(f"Token verification error: {e}")
        return jsonify({"valid": False, "error": str(e)}), 401


@app.route('/api/upload', methods=['POST'])
def upload_file():
    token = request.headers.get('Authorization', '').replace('Bearer ', '')
    try:
        payload = verify_token(token)
        username = payload['sub']
        
        if 'files' not in request.files:
            return jsonify({"error": "No file part"}), 400
            
        files = request.files.getlist('files')
        album_id = request.form.get('album') # album_id is the folder name

        if not album_id:
            return jsonify({"error": "Album ID is missing"}), 400
        
        successful_uploads = []
        upload_errors = [] # More detailed error tracking
        embedding_results = []

        for file_to_upload in files:
            if file_to_upload.filename == '':
                continue # Skip empty file submissions
            
            if allowed_file(file_to_upload.filename):
                original_filename = secure_filename(file_to_upload.filename)
                # Use a unique name for storage to avoid collisions, but can keep original for display
                unique_storage_filename = f"{uuid.uuid4()}_{original_filename}"
                
                # Temporarily save locally (optional, can stream directly to R2 if preferred)
                local_path = os.path.join(UPLOAD_FOLDER, unique_storage_filename)
                file_to_upload.save(local_path)
                
                r2_object_path = f"{username}/{album_id}/{unique_storage_filename}"
                upload_success, public_url = upload_to_r2(local_path, r2_object_path)
                
                try: # Ensure local file is removed even if R2 upload fails partially
                    os.remove(local_path)
                except OSError as e:
                    print(f"Error removing temporary local file {local_path}: {e}")

                if upload_success:
                    successful_uploads.append({ "name": original_filename, "url": public_url, "id": unique_storage_filename })
                    
                    # Trigger embedding for this specific image
                    # The 'album_name' for embeddings should match the R2 folder name (album_id)
                    emb_success, emb_message = trigger_single_embedding(public_url, album_id)
                    embedding_results.append({
                        "file": original_filename,
                        "status": "Success" if emb_success else "Failed",
                        "details": emb_message
                    })
                else:
                    upload_errors.append({"file": original_filename, "error": f"Failed to upload to R2 storage."})
            else:
                upload_errors.append({"file": file_to_upload.filename, "error": "File type not allowed."})

        if not successful_uploads and not upload_errors:
             return jsonify({"error": "No files were selected or processed"}), 400

        return jsonify({
            "message": "Upload process finished",
            "successful_uploads": successful_uploads, # Contains name, url, and id
            "upload_errors": upload_errors,
            "embedding_results": embedding_results
        }), 200 # Return 200 even if some errors, details are in response
            
    except Exception as e:
        print(f"Upload endpoint error: {e}") # Log the full error
        return jsonify({"error": "An unexpected error occurred during upload.", "details": str(e)}), 500


@app.route('/api/albums', methods=['GET'])
def get_albums():
    token = request.headers.get('Authorization', '').replace('Bearer ', '')
    try:
        payload = verify_token(token)
        username = payload['sub']
        # List "directories" under the username's prefix
        user_prefix = f"{username}/"
        album_prefixes = list_objects(user_prefix, delimiter="/") 
        
        formatted_albums = []
        if album_prefixes: # Ensure album_prefixes is not None
            for album_full_prefix in album_prefixes:
                if album_full_prefix == user_prefix: # Skip the root prefix itself if returned
                    continue
                
                # Extract album_id (folder name)
                album_id = album_full_prefix.rstrip('/').split('/')[-1]
                if not album_id: # Skip if somehow an empty name results
                    continue

                # Try to get a cover image
                album_content_path = f"{username}/{album_id}/"
                images_in_album = list_objects(album_content_path, limit=1) # Get first object as potential cover
                cover_image_url = None
                photo_count = 0

                # Get actual files, not prefixes, for cover and count
                all_files_in_album = list_objects(album_content_path) # No delimiter
                actual_photos = [obj for obj in all_files_in_album if not obj.endswith('/') and not obj.endswith('.placeholder')]
                photo_count = len(actual_photos)

                if actual_photos:
                    cover_image_url = get_object_url(actual_photos[0])


                album_data = {
                    "id": album_id, # This is the folder name, e.g., "summer-vacation"
                    "name": album_id.replace('-', ' ').title(), # User-friendly display name
                    "path": album_content_path, # For internal use if needed
                    "cover": cover_image_url,
                    "date": datetime.datetime.now().strftime("%Y-%m-%d"), # Placeholder, ideally from metadata
                    "photo_count": photo_count
                }
                formatted_albums.append(album_data)
        return jsonify(formatted_albums)
    except Exception as e:
        print(f"Error in get_albums: {e}")
        return jsonify({"error": "Could not retrieve albums.", "details": str(e)}), 500

@app.route('/api/albums/<album_id>', methods=['GET'])
def get_album_photos(album_id):
    token = request.headers.get('Authorization', '').replace('Bearer ', '')
    try:
        payload = verify_token(token)
        username = payload['sub']
        album_path_prefix = f"{username}/{album_id}/"
        
        objects_in_album = list_objects(album_path_prefix) # No delimiter to get all files
        photos = []
        if objects_in_album: # Check if list_objects returned something
            for r2_key in objects_in_album:
                # Ensure it's a file and not the placeholder or a "subfolder" if any
                if not r2_key.endswith('/') and not r2_key.endswith('.placeholder'):
                    filename = r2_key.split('/')[-1]
                    photo_data = {
                        "id": filename, # Use the filename as ID for photos within an album
                        "name": filename,
                        "url": get_object_url(r2_key),
                        "date": datetime.datetime.now().strftime("%Y-%m-%d") # Placeholder
                    }
                    photos.append(photo_data)
        return jsonify(photos)
    except Exception as e:
        print(f"Error in get_album_photos for {album_id}: {e}")
        return jsonify({"error": "Could not retrieve album photos.", "details": str(e)}), 500

# --- NEW/MODIFIED DELETE ENDPOINT ---
@app.route('/api/albums/<album_id>/photos/delete', methods=['POST']) # Changed to POST as it modifies data
def delete_album_photos(album_id):
    token = request.headers.get('Authorization', '').replace('Bearer ', '')
    try:
        payload = verify_token(token)
        username = payload['sub']
    except Exception as e:
        print(f"Delete photos auth error: {e}")
        return jsonify({"error": "Authentication failed", "details": str(e)}), 401

    data = request.get_json()
    if not data or 'photo_ids' not in data or not isinstance(data['photo_ids'], list):
        return jsonify({"error": "Invalid request: 'photo_ids' list is required."}), 400

    photo_ids_to_delete = data['photo_ids']
    if not photo_ids_to_delete:
        return jsonify({"message": "No photos specified for deletion."}), 200 # Or 400 if you consider it an error

    deleted_count = 0
    errors = []

    for photo_filename in photo_ids_to_delete:
        if not isinstance(photo_filename, str) or not photo_filename: # Basic validation
            errors.append({"photo_id": photo_filename, "error": "Invalid photo ID format."})
            continue
        
        r2_object_key = f"{username}/{album_id}/{secure_filename(photo_filename)}" # Ensure filename is secured
        
        print(f"Attempting to delete from R2: {r2_object_key}") # Log before delete
        success, error_msg = delete_from_r2(r2_object_key) # Assumes delete_from_r2 returns (bool, str_error_msg_or_None)
        
        if success:
            deleted_count += 1
            # TODO: Trigger removal from ML embeddings file if necessary
            # This is a complex step. For now, we focus on R2 deletion.
            # Example: remove_embedding_for_photo(album_id, photo_filename)
            print(f"Successfully deleted {r2_object_key} from R2.")
        else:
            print(f"Failed to delete {r2_object_key} from R2: {error_msg}")
            errors.append({"photo_id": photo_filename, "error": error_msg or "Failed to delete from storage."})

    if errors:
        return jsonify({
            "message": f"Deletion process completed with some errors. {deleted_count} photo(s) deleted.",
            "deleted_count": deleted_count,
            "errors": errors
        }), 207 # Multi-Status response
    
    return jsonify({
        "message": f"Successfully deleted {deleted_count} photo(s).",
        "deleted_count": deleted_count
    }), 200


@app.route('/api/create-album', methods=['POST'])
def create_album():
    token = request.headers.get('Authorization', '').replace('Bearer ', '')
    data = request.get_json()
    try:
        payload = verify_token(token)
        username = payload['sub']
        if not data or 'name' not in data:
            return jsonify({"error": "Missing album name"}), 400
        
        album_display_name = data['name']
        # Create a URL-friendly/R2-key-friendly album_id
        album_id = album_display_name.lower().replace(' ', '-').replace('_', '-')
        album_id = secure_filename(album_id) # Further secure it

        if not album_id: # If secure_filename results in empty string
            return jsonify({"error": "Invalid album name resulting in empty ID."}), 400

        # Create a .placeholder file to "create" the folder in R2
        r2_placeholder_path = f"{username}/{album_id}/.placeholder"
        
        # Check if album (placeholder) already exists (optional, R2 doesn't strictly have folders)
        # existing_objects = list_objects(f"{username}/{album_id}/")
        # if existing_objects and any(obj.endswith('.placeholder') for obj in existing_objects):
        # return jsonify({"error": f"Album '{album_display_name}' already exists."}), 409


        temp_placeholder_file = os.path.join(UPLOAD_FOLDER, f"{uuid.uuid4()}_.placeholder")
        with open(temp_placeholder_file, 'w') as f:
            f.write('') # Create an empty file for upload
        
        upload_success, _ = upload_to_r2(temp_placeholder_file, r2_placeholder_path)
        
        try:
            os.remove(temp_placeholder_file)
        except OSError as e:
            print(f"Error removing temp placeholder {temp_placeholder_file}: {e}")

        if upload_success:
            return jsonify({
                "message": "Album created successfully",
                "album": { "id": album_id, "name": album_display_name } # Return both id and display name
            }), 201 # 201 Created
        else:
            return jsonify({"error": "Failed to create album in storage"}), 500
    except Exception as e:
        print(f"Create album error: {e}")
        return jsonify({"error": "An unexpected error occurred.", "details": str(e)}), 500


@app.route('/api/find-matches', methods=['POST'])
def find_matches():
    token = request.headers.get('Authorization', '').replace('Bearer ', '') # Get token
    try:
        payload = verify_token(token) # Verify token
        username = payload['sub'] # Not directly used here but good for auth check
    except Exception as e:
        return jsonify({"error": "Authentication failed", "details": str(e)}), 401


    if 'file' not in request.files:
        return jsonify({"error": "No file part for matching"}), 400
    file = request.files['file']
    album_id = request.form.get('album') # This is the album_id (folder name)

    if not album_id:
        return jsonify({"error": "Missing album name/ID"}), 400
    if file.filename == '':
        return jsonify({"error": "No selected file"}), 400
    
    # The embedding file name is based on the album_id (R2 folder name)
    embedding_file_name_for_ml_api = f"{album_id}_embeddings.json" 
    api_endpoint = f"{ML_API_BASE_URL}/find_similar_faces/"
    
    try:
        files_payload = {"file": (secure_filename(file.filename), file.read(), file.content_type)}
        data_payload = {"embedding_file": embedding_file_name_for_ml_api, "threshold": "0.5"}
        
        print(f"Forwarding request to ML API to find matches in {embedding_file_name_for_ml_api}")
        response = requests.post(api_endpoint, files=files_payload, data=data_payload, timeout=60)
        
        if response.status_code == 200:
            return jsonify(response.json()), 200
        else:
            print(f"ML API Error for find_matches ({response.status_code}): {response.text}")
            return jsonify({"error": "Failed to get matches from ML API", "details": response.text}), response.status_code
    except Exception as e:
        print(f"Find matches exception: {e}")
        return jsonify({"error": "An error occurred while finding matches.", "details": str(e)}), 500


# (Keep existing check_album_password if used for other purposes, or remove if not)
@app.route('/api/check-password/<album_id>', methods=['POST'])
def check_album_password(album_id):
    data = request.get_json()
    if not data or 'password' not in data:
        return jsonify({"error": "Missing password"}), 400
    password = data['password']
    # This is a demo password check, replace with your actual logic if needed
    if album_id in PASSWORD_DB and PASSWORD_DB[album_id] == password: 
        # Create a guest token if password matches (optional feature)
        guest_token = create_token(f"guest-{album_id}", expires_in=60*60) # 1 hour expiry
        return jsonify({"valid": True, "token": guest_token}) # Send back a token if using guest access
    return jsonify({"valid": False, "error": "Incorrect password"}), 401


if __name__ == '__main__':
    app.run(debug=True, host='0.0.0.0', port=int(os.environ.get("PORT", 8080)))
