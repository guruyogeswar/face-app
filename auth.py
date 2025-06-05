# auth.py
import jwt
import datetime
import uuid
from config import JWT_SECRET

# Demo user database (in a real app, this would be a database)
USER_DB = {
    "admin": "admin123",
    "demo": "demo123",
    "sarah": "wedding123",
    "family": "reunion123"
}

# Demo album password database (in a real app, this would be in a database)
PASSWORD_DB = {
    "wedding": "wedding123",
    "family-reunion": "family123",
    "vacation-2023": "beach123",
    "graduation": "grad2023"
}

def authenticate_user(username, password):
    """Check if username and password are valid"""
    if username in USER_DB and USER_DB[username] == password:
        return True
    return False

def create_token(subject, expires_in=86400):  # Default: 24 hours
    """Create a JWT token for authentication
    
    Args:
        subject: Subject of the token (typically username)
        expires_in: Token validity period in seconds
    
    Returns:
        JWT token as string
    """
    now = datetime.datetime.utcnow()
    expiry = now + datetime.timedelta(seconds=expires_in)
    
    payload = {
        'sub': subject,
        'iat': now,
        'exp': expiry,
        'jti': str(uuid.uuid4())
    }
    
    token = jwt.encode(payload, JWT_SECRET, algorithm='HS256')
    return token

def verify_token(token):
    """Verify and decode a JWT token
    
    Args:
        token: JWT token to verify
    
    Returns:
        Decoded token payload
        
    Raises:
        Exception if token is invalid
    """
    payload = jwt.decode(token, JWT_SECRET, algorithms=['HS256'])
    return payload