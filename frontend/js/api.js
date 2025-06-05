// api.js - API client for interacting with the backend
class APIClient {
    constructor() {
        this.baseURL = ''; // Empty since we're using relative URLs
        this.token = localStorage.getItem('authToken') || null;
    }

    // Set the authentication token
    setToken(token) {
        this.token = token;
        localStorage.setItem('authToken', token);
    }

    // Clear the authentication token
    clearToken() {
        this.token = null;
        localStorage.removeItem('authToken');
    }

    // Check if user is authenticated
    isAuthenticated() {
        return !!this.token;
    }

    // Helper method for headers
    getHeaders(includeAuth = true) {
        const headers = {
            'Content-Type': 'application/json'
        };

        if (includeAuth && this.token) {
            headers['Authorization'] = `Bearer ${this.token}`;
        }

        return headers;
    }

    // User authentication
    async login(username, password) {
        try {
            const response = await fetch(`${this.baseURL}/api/auth/login`, {
                method: 'POST',
                headers: this.getHeaders(false),
                body: JSON.stringify({ username, password })
            });

            const data = await response.json();
            
            if (!response.ok) {
                throw new Error(data.error || 'Login failed');
            }

            this.setToken(data.token);
            return data;
        } catch (error) {
            console.error('Login error:', error);
            throw error;
        }
    }

    // Verify token validity
    async verifyToken() {
        try {
            const response = await fetch(`${this.baseURL}/api/auth/verify`, {
                method: 'GET',
                headers: this.getHeaders()
            });

            const data = await response.json();
            
            if (!response.ok) {
                this.clearToken();
                return false;
            }

            return data.valid;
        } catch (error) {
            console.error('Token verification error:', error);
            this.clearToken();
            return false;
        }
    }

    // Check album password
    async checkAlbumPassword(albumId, password) {
        try {
            const response = await fetch(`${this.baseURL}/api/check-password/${albumId}`, {
                method: 'POST',
                headers: this.getHeaders(false),
                body: JSON.stringify({ password })
            });

            const data = await response.json();
            
            if (!response.ok) {
                throw new Error(data.error || 'Password verification failed');
            }

            return data;
        } catch (error) {
            console.error('Password check error:', error);
            throw error;
        }
    }

    // Get all albums
    async getAlbums() {
        try {
            const response = await fetch(`${this.baseURL}/api/albums`, {
                method: 'GET',
                headers: this.getHeaders()
            });

            const data = await response.json();
            
            if (!response.ok) {
                throw new Error(data.error || 'Failed to fetch albums');
            }

            return data;
        } catch (error) {
            console.error('Get albums error:', error);
            throw error;
        }
    }

    // Get photos in an album
    async getAlbumPhotos(albumId) {
        try {
            const response = await fetch(`${this.baseURL}/api/albums/${albumId}`, {
                method: 'GET',
                headers: this.getHeaders()
            });

            const data = await response.json();
            
            if (!response.ok) {
                throw new Error(data.error || 'Failed to fetch album photos');
            }

            return data;
        } catch (error) {
            console.error('Get album photos error:', error);
            throw error;
        }
    }

    // Create a new album
    async createAlbum(name) {
        try {
            const response = await fetch(`${this.baseURL}/api/create-album`, {
                method: 'POST',
                headers: this.getHeaders(),
                body: JSON.stringify({ name })
            });

            const data = await response.json();
            
            if (!response.ok) {
                throw new Error(data.error || 'Failed to create album');
            }

            return data;
        } catch (error) {
            console.error('Create album error:', error);
            throw error;
        }
    }

    // Upload a file
    async uploadFile(file, albumId = 'default') {
        try {
            const formData = new FormData();
            formData.append('file', file);
            formData.append('album', albumId);

            const headers = {};
            if (this.token) {
                headers['Authorization'] = `Bearer ${this.token}`;
            }

            const response = await fetch(`${this.baseURL}/api/upload`, {
                method: 'POST',
                headers: headers,
                body: formData
            });

            const data = await response.json();
            
            if (!response.ok) {
                throw new Error(data.error || 'Upload failed');
            }

            return data;
        } catch (error) {
            console.error('Upload error:', error);
            throw error;
        }
    }
}

// Create a global instance
const api = new APIClient();