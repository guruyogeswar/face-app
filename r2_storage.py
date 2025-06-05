# r2_storage.py
import boto3
import os
from config import R2_CONFIG

# Initialize S3 client for Cloudflare R2
s3 = boto3.client(
    "s3",
    endpoint_url=R2_CONFIG["endpoint_url"],
    aws_access_key_id=R2_CONFIG["aws_access_key_id"],
    aws_secret_access_key=R2_CONFIG["aws_secret_access_key"],
)

def upload_to_r2(local_file_path, r2_object_path):
    """Upload a local file to Cloudflare R2 storage
    
    Args:
        local_file_path: Local path to the file
        r2_object_path: Path/key for the object in R2
        
    Returns:
        Tuple (success, url)
    """
    try:
        # Get file content type based on extension
        content_type = get_content_type(local_file_path)
        
        # Upload file with appropriate content-type
        s3.upload_file(
            local_file_path, 
            R2_CONFIG["bucket_name"], 
            r2_object_path,
            ExtraArgs={
                'ContentType': content_type,
                'ACL': 'public-read'  # Make the file publicly accessible
            }
        )
        
        # Return the public URL
        url = f"{R2_CONFIG['public_base_url']}/{r2_object_path}"
        return True, url
    except Exception as e:
        print(f"Error uploading to R2: {e}")
        return False, None

def list_objects(prefix="", delimiter="", limit=1000):
    """List objects in the R2 bucket
    
    Args:
        prefix: Prefix filter for objects
        delimiter: Delimiter for hierarchical listing
        limit: Maximum number of objects to return
        
    Returns:
        List of object keys
    """
    try:
        if delimiter:
            response = s3.list_objects_v2(
                Bucket=R2_CONFIG["bucket_name"],
                Prefix=prefix,
                Delimiter=delimiter,
                MaxKeys=limit
            )
            
            # Include both objects and common prefixes (folders)
            result = []
            
            # Add regular objects
            if 'Contents' in response:
                result.extend([item['Key'] for item in response['Contents']])
            
            # Add folders
            if 'CommonPrefixes' in response:
                result.extend([item['Prefix'] for item in response['CommonPrefixes']])
                
            return result
        else:
            response = s3.list_objects_v2(
                Bucket=R2_CONFIG["bucket_name"],
                Prefix=prefix,
                MaxKeys=limit
            )
            
            if 'Contents' not in response:
                return []
                
            return [item['Key'] for item in response['Contents']]
    except Exception as e:
        print(f"Error listing objects in R2: {e}")
        return []

def get_object_url(object_key):
    """Get the public URL for an R2 object
    
    Args:
        object_key: The key of the object in R2
        
    Returns:
        Public URL of the object
    """
    return f"{R2_CONFIG['public_base_url']}/{object_key}"

def get_content_type(file_path):
    """Determine the content type based on file extension"""
    extension = os.path.splitext(file_path)[1].lower()
    
    # Map common extensions to content types
    content_types = {
        '.jpg': 'image/jpeg',
        '.jpeg': 'image/jpeg',
        '.png': 'image/png',
        '.gif': 'image/gif',
        '.webp': 'image/webp',
        '.svg': 'image/svg+xml',
        '.pdf': 'application/pdf',
        '.txt': 'text/plain',
    }
    
    return content_types.get(extension, 'application/octet-stream')

def delete_from_r2(r2_object_key):
    """Delete an object from Cloudflare R2 storage
    
    Args:
        r2_object_key: The key of the object in R2 to delete.
        
    Returns:
        Tuple (success: bool, error_message: str or None)
    """
    try:
        print(f"R2_STORAGE: Attempting to delete object: {r2_object_key}")
        s3.delete_object(
            Bucket=R2_CONFIG["bucket_name"],
            Key=r2_object_key
        )
        print(f"R2_STORAGE: Successfully initiated delete for {r2_object_key}")
        return True, None
    except Exception as e:
        error_msg = f"Error deleting {r2_object_key} from R2: {e}"
        print(error_msg)
        return False, error_msg