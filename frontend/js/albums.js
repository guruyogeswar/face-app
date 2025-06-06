// albums.js

document.addEventListener('DOMContentLoaded', async () => {
    const DOMElements = {
        // Desktop Nav
        loginBtnNav: document.getElementById('loginBtnNav'),
        signinBtnNav: document.getElementById('signinBtnNav'),
        profileDropdownContainer: document.getElementById('profileDropdownContainer'),
        profileDropdownButton: document.getElementById('profileDropdownButton'),
        profileDropdownMenu: document.getElementById('profileDropdownMenu'),
        profileInitials: document.getElementById('profileInitials'),
        dropdownProfileInitials: document.getElementById('dropdownProfileInitials'),
        dropdownUserName: document.getElementById('dropdownUserName'),
        dropdownUserEmail: document.getElementById('dropdownUserEmail'),
        logoutBtnDropdown: document.getElementById('logoutBtnDropdown'),
        
        // Mobile Nav
        loginBtnNavMobile: document.getElementById('loginBtnNavMobile'),
        signinBtnNavMobile: document.getElementById('signinBtnNavMobile'),
        profileContainerMobile: document.getElementById('profileContainerMobile'),
        profileInitialsMobile: document.getElementById('profileInitialsMobile'),
        userNameMobile: document.getElementById('userNameMobile'),
        userEmailMobile: document.getElementById('userEmailMobile'),
        logoutBtnNavMobile: document.getElementById('logoutBtnNavMobile'),

        loginPromptDiv: document.getElementById('login-prompt'),
        albumsMainContentDiv: document.getElementById('albums-main-content'),
        
        navTabButtons: document.querySelectorAll('.nav-tab-button'),
        viewContainer: document.getElementById('view-container'),
        manageAlbumsView: document.getElementById('manage-albums-view'),
        findImagesView: document.getElementById('find-images-view'),
        albumDetailView: document.getElementById('album-detail-view'),

        createAlbumBtn: document.getElementById('createAlbumBtn'),
        createAlbumFormContainer: document.getElementById('createAlbumFormContainer'),
        createAlbumForm: document.getElementById('createAlbumForm'),
        newAlbumNameInput: document.getElementById('newAlbumName'),
        cancelCreateAlbumBtn: document.getElementById('cancelCreateAlbumBtn'),
        albumGrid: document.getElementById('album-grid'),
        albumGridLoader: document.getElementById('album-grid-loader'),
        noAlbumsMessage: document.getElementById('no-albums-message'),

        faceSearchForm: document.getElementById('faceSearchForm'),
        searchAlbumSelect: document.getElementById('searchAlbumSelect'),
        faceSearchFileInput: document.getElementById('faceSearchFile'),
        searchResultsGrid: document.getElementById('search-results-grid'),
        searchResultsLoader: document.getElementById('search-results-loader'),
        noMatchesMessage: document.getElementById('no-matches-message'),
        searchStatusMessage: document.getElementById('search-status-message'),

        photoGrid: null, 
        photoGridLoader: null, 
        noPhotosMessage: null, 
        photoActionBar: null, 
        selectionCountSpan: null, 

        lightboxModal: document.getElementById('lightbox-modal'),
        lightboxImage: document.getElementById('lightbox-image'),
        lightboxCaption: document.getElementById('lightbox-caption'),
        closeLightboxBtn: document.getElementById('close-lightbox'),
        lightboxPrevBtn: document.getElementById('lightbox-prev'),
        lightboxNextBtn: document.getElementById('lightbox-next'),
        
        toastContainer: document.getElementById('toast-container'),

        hamburger: document.getElementById('hamburger'),
        mobileNavLinksMenu: document.getElementById('mobileNavLinksMenu'),
    };

    let currentUser = null; 
    let currentAlbums = [];
    let currentAlbumPhotos = []; 
    let selectedPhotos = new Set(); 
    let lightboxCurrentIndex = -1;

    // --- FIX: Both API URLs must be defined here ---
    const API_BASE_URL = ''; // For calls to our Flask backend (relative path)
    const ML_API_BASE_URL = 'http://127.0.0.1:8080'; // For calls to the external ML API

    function showToast(message, type = 'info') { 
        if (!DOMElements.toastContainer) {
            console.warn("Toast container not found.");
            alert(`${type.toUpperCase()}: ${message}`); 
            return;
        }
        const toastId = 'toast-' + Date.now();
        const toast = document.createElement('div');
        toast.className = `toast toast-${type}`;
        toast.id = toastId;
        toast.setAttribute('role', 'alert');
        toast.setAttribute('aria-live', 'assertive');

        let iconClass = 'fas fa-info-circle';
        if (type === 'success') iconClass = 'fas fa-check-circle';
        if (type === 'error') iconClass = 'fas fa-exclamation-circle';

        toast.innerHTML = `
            <i class="${iconClass} toast-icon"></i>
            <span class="toast-message flex-grow">${message}</span>
            <button class="toast-close ml-auto -mr-1 p-1" data-dismiss="${toastId}" aria-label="Close">&times;</button>
        `;
        DOMElements.toastContainer.appendChild(toast);
        
        setTimeout(() => toast.classList.add('show'), 10); 

        const autoDismissTimeout = setTimeout(() => {
            toast.classList.remove('show');
            setTimeout(() => toast.remove(), 300); 
        }, 5000);

        toast.querySelector('.toast-close').addEventListener('click', () => {
            clearTimeout(autoDismissTimeout); 
            toast.classList.remove('show');
            setTimeout(() => toast.remove(), 300);
        });
    }
    
    function updateUserNav(isLoggedIn, userData = null) {
        currentUser = isLoggedIn ? userData : null;
        const defaultEmail = "user@example.com"; 
        const defaultUsername = "User";

        if (DOMElements.loginBtnNav && DOMElements.signinBtnNav && DOMElements.profileDropdownContainer) {
            if (isLoggedIn && currentUser) {
                DOMElements.loginBtnNav.style.display = 'none';
                DOMElements.signinBtnNav.style.display = 'none';
                DOMElements.profileDropdownContainer.style.display = 'block';

                const username = currentUser.username || defaultUsername;
                const email = currentUser.email || (username !== defaultUsername ? `${username.toLowerCase().split(' ')[0]}@example.com` : defaultEmail) ;
                const initials = username.substring(0, 1).toUpperCase();
                
                if(DOMElements.profileInitials) DOMElements.profileInitials.textContent = initials;
                if(DOMElements.dropdownProfileInitials) DOMElements.dropdownProfileInitials.textContent = initials;
                if(DOMElements.dropdownUserName) DOMElements.dropdownUserName.textContent = username;
                if(DOMElements.dropdownUserEmail) DOMElements.dropdownUserEmail.textContent = email;
            } else {
                DOMElements.loginBtnNav.style.display = 'inline-block';
                DOMElements.signinBtnNav.style.display = 'inline-block';
                DOMElements.profileDropdownContainer.style.display = 'none';
                 if (DOMElements.profileDropdownMenu) {
                    DOMElements.profileDropdownMenu.classList.add('hidden');
                    if(DOMElements.profileDropdownButton) DOMElements.profileDropdownButton.setAttribute('aria-expanded', 'false');
                 }
            }
        }

        if (DOMElements.loginBtnNavMobile && DOMElements.signinBtnNavMobile && DOMElements.profileContainerMobile) {
            if (isLoggedIn && currentUser) {
                DOMElements.loginBtnNavMobile.style.display = 'none';
                DOMElements.signinBtnNavMobile.style.display = 'none';
                DOMElements.profileContainerMobile.style.display = 'block';
                const username = currentUser.username || defaultUsername;
                const email = currentUser.email || (username !== defaultUsername ? `${username.toLowerCase().split(' ')[0]}@example.com` : defaultEmail) ;
                const initials = username.substring(0, 1).toUpperCase();
                if(DOMElements.profileInitialsMobile) DOMElements.profileInitialsMobile.textContent = initials;
                if(DOMElements.userNameMobile) DOMElements.userNameMobile.textContent = username;
                if(DOMElements.userEmailMobile) DOMElements.userEmailMobile.textContent = email;
            } else {
                DOMElements.loginBtnNavMobile.style.display = 'block';
                DOMElements.signinBtnNavMobile.style.display = 'block';
                DOMElements.profileContainerMobile.style.display = 'none';
            }
        }
    }

    async function checkLoginStatus() {
        const token = localStorage.getItem('authToken');
        const storedUsername = localStorage.getItem('username');
        const storedUserEmail = localStorage.getItem('userEmail'); 

        if (!token) {
            updateUserNav(false);
            if (DOMElements.loginPromptDiv) DOMElements.loginPromptDiv.style.display = 'block';
            if (DOMElements.albumsMainContentDiv) DOMElements.albumsMainContentDiv.style.display = 'none';
            return false;
        }
        if (storedUsername) {
            updateUserNav(true, { username: storedUsername, email: storedUserEmail });
        }

        try {
            const response = await fetch(`${API_BASE_URL}/api/auth/verify`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (response.ok) {
                const data = await response.json();
                if (data.valid && data.username) {
                    const userData = { username: data.username, email: data.email || storedUserEmail }; 
                    updateUserNav(true, userData);
                    if (DOMElements.loginPromptDiv) DOMElements.loginPromptDiv.style.display = 'none';
                    if (DOMElements.albumsMainContentDiv) DOMElements.albumsMainContentDiv.style.display = 'block';
                    localStorage.setItem('username', data.username); 
                    if(data.email) localStorage.setItem('userEmail', data.email);
                    else if (storedUserEmail) localStorage.setItem('userEmail', storedUserEmail);
                    return true;
                }
            }
            localStorage.removeItem('authToken');
            localStorage.removeItem('username');
            localStorage.removeItem('userEmail');
            updateUserNav(false);
            if (DOMElements.loginPromptDiv) DOMElements.loginPromptDiv.style.display = 'block';
            if (DOMElements.albumsMainContentDiv) DOMElements.albumsMainContentDiv.style.display = 'none';
            return false;
        } catch (error) {
            console.error("Error verifying token:", error);
            showToast("Session check failed. Please log in again.", "error");
            localStorage.removeItem('authToken');
            localStorage.removeItem('username');
            localStorage.removeItem('userEmail');
            updateUserNav(false);
             if (DOMElements.loginPromptDiv) DOMElements.loginPromptDiv.style.display = 'block';
            if (DOMElements.albumsMainContentDiv) DOMElements.albumsMainContentDiv.style.display = 'none';
            return false;
        }
    }

    function switchView(viewId) {
        document.querySelectorAll('.view-section').forEach(section => {
            if (section) section.style.display = 'none';
        });
        const activeSection = document.getElementById(viewId);
        if (activeSection) {
            activeSection.style.display = 'block';
        } else {
            console.warn(`View section with ID '${viewId}' not found.`);
        }

        DOMElements.navTabButtons.forEach(button => {
            button.classList.remove('active-tab');
            if (button.dataset.view === viewId.replace('-view', '')) {
                button.classList.add('active-tab');
            }
        });
        
        if (viewId !== 'album-detail-view' && selectedPhotos.size > 0) {
            selectedPhotos.clear();
            updatePhotoSelectionUI(); 
        }
    }
    
    function showLoadingState(loaderElement, isLoading) {
        if (loaderElement) {
            loaderElement.style.display = isLoading ? 'grid' : 'none';
        }
    }

    async function fetchUserAlbums() {
        const token = localStorage.getItem('authToken');
        if (!token) return [];
        
        if (DOMElements.albumGridLoader) showLoadingState(DOMElements.albumGridLoader, true);
        if (DOMElements.albumGrid) DOMElements.albumGrid.style.display = 'none';
        if (DOMElements.noAlbumsMessage) DOMElements.noAlbumsMessage.style.display = 'none';
        
        try {
            const response = await fetch(`${API_BASE_URL}/api/albums`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (!response.ok) {
                 const errorData = await response.text();
                 throw new Error(`Failed to fetch albums: ${response.statusText} - ${errorData}`);
            }
            const albums = await response.json();
            currentAlbums = albums;
            return albums;
        } catch (error) {
            console.error("Error fetching albums:", error);
            showToast("Could not load your albums.", "error");
            return [];
        } finally {
            if (DOMElements.albumGridLoader) showLoadingState(DOMElements.albumGridLoader, false);
        }
    }

    function displayAlbums(albums) {
        if (!DOMElements.albumGrid || !DOMElements.searchAlbumSelect || !DOMElements.noAlbumsMessage) {
            console.error("One or more album display elements are missing from the DOM.");
            return;
        }
        DOMElements.albumGrid.innerHTML = '';
        if (DOMElements.searchAlbumSelect.options.length <= 1 || DOMElements.searchAlbumSelect.value === "") {
            DOMElements.searchAlbumSelect.innerHTML = '<option value="">-- Select Album --</option>';
        }

        if (!albums || albums.length === 0) {
            DOMElements.noAlbumsMessage.style.display = 'block';
            DOMElements.albumGrid.style.display = 'none';
            return;
        }

        DOMElements.noAlbumsMessage.style.display = 'none';
        DOMElements.albumGrid.style.display = 'grid';

        albums.forEach(album => {
            const card = document.createElement('div');
            card.className = 'album-card-item bg-white rounded-xl shadow-lg overflow-hidden cursor-pointer group hover:shadow-xl transition-all duration-300';
            card.dataset.albumId = album.id; 
            card.dataset.albumName = album.name; 
            
            const coverUrl = album.cover || `https://placehold.co/400x300/e0e0e0/777?text=${encodeURIComponent(album.name)}`;
            
            card.innerHTML = `
                <div class="w-full h-48 bg-gray-200 overflow-hidden">
                    <img src="${coverUrl}" alt="${album.name}" class="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" onerror="this.onerror=null;this.src='https://placehold.co/400x300/e0e0e0/777?text=Error';">
                </div>
                <div class="p-5">
                    <h3 class="text-lg font-semibold text-dark-color truncate mb-1" title="${album.name}">${album.name}</h3>
                    <p class="text-sm text-gray-color mb-1">ID: ${album.id}</p>
                    <p class="text-xs text-gray-500">${album.date || 'No date available'}</p>
                    ${album.photo_count !== undefined ? `<p class="text-xs text-gray-500">${album.photo_count} photos</p>` : ''}
                </div>
            `;
            card.addEventListener('click', () => loadAlbumDetailView(album.id, album.name));
            DOMElements.albumGrid.appendChild(card);

            let optionExists = false;
            for(let i=0; i < DOMElements.searchAlbumSelect.options.length; i++) {
                if(DOMElements.searchAlbumSelect.options[i].value === album.id) {
                    optionExists = true;
                    break;
                }
            }
            if (!optionExists) {
                const option = document.createElement('option');
                option.value = album.id; 
                option.textContent = album.name;
                DOMElements.searchAlbumSelect.appendChild(option);
            }
        });
    }
    
    DOMElements.createAlbumBtn?.addEventListener('click', () => {
        if (DOMElements.createAlbumFormContainer) {
            DOMElements.createAlbumFormContainer.style.display = 'block';
            if (DOMElements.newAlbumNameInput) DOMElements.newAlbumNameInput.focus();
        }
    });

    DOMElements.cancelCreateAlbumBtn?.addEventListener('click', () => {
        if (DOMElements.createAlbumFormContainer) DOMElements.createAlbumFormContainer.style.display = 'none';
        if (DOMElements.createAlbumForm) DOMElements.createAlbumForm.reset();
    });

    DOMElements.createAlbumForm?.addEventListener('submit', async (e) => {
        e.preventDefault();
        const albumName = DOMElements.newAlbumNameInput.value.trim();
        if (!albumName) {
            showToast("Album name is required.", "error");
            return;
        }
        const token = localStorage.getItem('authToken');
        if (!token) {
            showToast("You must be logged in to create an album.", "error");
            return;
        }
        try {
            const response = await fetch(`${API_BASE_URL}/api/create-album`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
                body: JSON.stringify({ name: albumName }) 
            });
            const result = await response.json();
            if (response.ok && result.album) {
                showToast(`Album "${result.album.name}" created!`, "success");
                if (DOMElements.createAlbumForm) DOMElements.createAlbumForm.reset();
                if (DOMElements.createAlbumFormContainer) DOMElements.createAlbumFormContainer.style.display = 'none';
                const albums = await fetchUserAlbums();
                displayAlbums(albums);
            } else {
                throw new Error(result.error || "Unknown error creating album.");
            }
        } catch (error) {
            console.error("Error creating album:", error);
            showToast(error.message || "Could not create album.", "error");
        }
    });

    async function loadAlbumDetailView(albumId, albumName) {
        switchView('album-detail-view');
        if (DOMElements.albumDetailView) {
            DOMElements.albumDetailView.innerHTML = '<div class="text-center py-10"><div class="spinner"></div><p class="mt-2 text-gray-color">Loading album details...</p></div>';
        }

        const token = localStorage.getItem('authToken');
        if (!token) {
            showToast("Please log in to view album details.", "error");
            switchView('login-prompt'); 
            return;
        }
        
        try {
            const templateResponse = await fetch('album_detail_template.html'); 
            if (!templateResponse.ok) {
                throw new Error("Could not load album view template. Status: " + templateResponse.status);
            }
            const templateHtml = await templateResponse.text();
            if (DOMElements.albumDetailView) DOMElements.albumDetailView.innerHTML = templateHtml;

            assignAlbumDetailDOMElements(); 
            
            if (DOMElements.albumDetailView) {
                const breadcrumbAlbumNameEl = DOMElements.albumDetailView.querySelector('#breadcrumb-album-name');
                const detailAlbumTitleEl = DOMElements.albumDetailView.querySelector('#detail-album-title');
                const breadcrumbAlbumsEl = DOMElements.albumDetailView.querySelector('#breadcrumb-albums');

                if(breadcrumbAlbumNameEl) breadcrumbAlbumNameEl.textContent = albumName;
                if(detailAlbumTitleEl) detailAlbumTitleEl.textContent = albumName;
                if(breadcrumbAlbumsEl) breadcrumbAlbumsEl.addEventListener('click', (e) => {
                    e.preventDefault();
                    switchView('manage-albums-view');
                });

                const uploadToAlbumBtn = DOMElements.albumDetailView.querySelector('#uploadToAlbumBtn');
                const uploadPhotosInput = DOMElements.albumDetailView.querySelector('#uploadPhotosInput');
                if (uploadToAlbumBtn && uploadPhotosInput) {
                    uploadToAlbumBtn.addEventListener('click', () => uploadPhotosInput.click());
                    uploadPhotosInput.addEventListener('change', (event) => {
                         if (event.target.files.length > 0) { 
                            handlePhotoUpload(event.target.files, albumId, albumName);
                         }
                    });
                }
            }

            if(DOMElements.photoGridLoader) showLoadingState(DOMElements.photoGridLoader, true);
            if(DOMElements.photoGrid) DOMElements.photoGrid.style.display = 'none';
            if(DOMElements.noPhotosMessage) DOMElements.noPhotosMessage.style.display = 'none';

            const response = await fetch(`${API_BASE_URL}/api/albums/${albumId}`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (!response.ok) {
                const errorText = await response.text();
                throw new Error(`Failed to fetch photos for album ${albumName}: ${response.statusText}. Details: ${errorText}`);
            }
            const photos = await response.json();
            currentAlbumPhotos = photos; 
            displayPhotosInGrid(photos, albumId);
            setupPhotoActionBarListeners(albumId);

        } catch (error) {
            console.error(`Error loading album ${albumName}:`, error);
            if (DOMElements.albumDetailView) {
                DOMElements.albumDetailView.innerHTML = `<div class="text-center py-10"><p class="text-red-500 text-lg">Error loading album: ${error.message}</p><button id="retryLoadAlbum" class="mt-4 px-4 py-2 bg-primary text-white rounded hover:bg-primary-dark">Try Again</button></div>`;
                const retryButton = DOMElements.albumDetailView.querySelector('#retryLoadAlbum');
                if(retryButton) retryButton.addEventListener('click', () => loadAlbumDetailView(albumId, albumName));
            }
            showToast(`Could not load album: ${albumName}. ${error.message}`, "error");
        } finally {
            if(DOMElements.photoGridLoader) showLoadingState(DOMElements.photoGridLoader, false);
        }
    }
    
    function assignAlbumDetailDOMElements() {
        if (!DOMElements.albumDetailView) return; 
        DOMElements.photoGrid = DOMElements.albumDetailView.querySelector('#photo-grid');
        DOMElements.photoGridLoader = DOMElements.albumDetailView.querySelector('#photo-grid-loader');
        DOMElements.noPhotosMessage = DOMElements.albumDetailView.querySelector('#no-photos-message');
        DOMElements.photoActionBar = DOMElements.albumDetailView.querySelector('#photo-action-bar');
        DOMElements.selectionCountSpan = DOMElements.albumDetailView.querySelector('#selection-count');
        if (!DOMElements.lightboxModal || !DOMElements.lightboxImage || !DOMElements.closeLightboxBtn) {
            console.warn("Lightbox elements not found. Ensure they are in the main HTML.");
        }
    }

    function displayPhotosInGrid(photos, albumId) {
        if (!DOMElements.photoGrid || !DOMElements.noPhotosMessage) {
            console.error("Photo grid or noPhotosMessage element not found in current view.");
            return;
        }
        DOMElements.photoGrid.innerHTML = '';
        selectedPhotos.clear(); 
        updatePhotoSelectionUI();

        if (!photos || photos.length === 0) {
            DOMElements.noPhotosMessage.style.display = 'block';
            DOMElements.photoGrid.style.display = 'none';
            return;
        }
        DOMElements.noPhotosMessage.style.display = 'none';
        DOMElements.photoGrid.style.display = 'grid';

        photos.forEach((photo, index) => {
            const photoItem = document.createElement('div');
            const photoIdToUse = photo.id || photo.name; 
            photoItem.className = 'photo-item group relative aspect-square rounded-lg overflow-hidden cursor-pointer shadow-sm hover:shadow-md transition-shadow duration-300 bg-gray-200';
            photoItem.dataset.photoId = photoIdToUse; 
            photoItem.dataset.photoUrl = photo.url;
            photoItem.dataset.photoName = photo.name;
            photoItem.dataset.photoIndex = index;

            photoItem.innerHTML = `
                <img src="${photo.url}" alt="${photo.name}" class="w-full h-full object-cover" onerror="this.onerror=null;this.src='https://placehold.co/300x300/e0e0e0/777?text=Image+Error';this.parentElement.classList.add('bg-red-100');">
                <div class="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-10 transition-opacity duration-300 flex items-center justify-center">
                    <i class="fas fa-search-plus fa-2x text-white opacity-0 group-hover:opacity-80 transition-opacity duration-300 pointer-events-none"></i>
                </div>
                <input type="checkbox" class="photo-checkbox absolute top-2 right-2 h-5 w-5 rounded-md text-primary focus:ring-offset-0 focus:ring-2 focus:ring-primary-dark opacity-0 group-hover:opacity-100 transition-opacity duration-300 z-10" data-photo-id="${photoIdToUse}">
                <div class="absolute bottom-0 left-0 right-0 p-2 bg-gradient-to-t from-black/60 to-transparent">
                    <p class="text-white text-xs truncate" title="${photo.name}">${photo.name}</p>
                </div>
            `;
            photoItem.addEventListener('click', (e) => {
                if (e.target.type !== 'checkbox') { 
                    openLightbox(index);
                }
            });
            
            const checkbox = photoItem.querySelector('.photo-checkbox');
            checkbox.addEventListener('change', (e) => {
                e.stopPropagation(); 
                handlePhotoSelection(photoIdToUse, photoItem, checkbox.checked);
            });
            DOMElements.photoGrid.appendChild(photoItem);
        });
    }

    function handlePhotoSelection(photoId, photoItemElement, isSelected) {
        if (isSelected) {
            selectedPhotos.add(photoId);
            photoItemElement.classList.add('selected-item');
        } else {
            selectedPhotos.delete(photoId);
            photoItemElement.classList.remove('selected-item');
        }
        updatePhotoSelectionUI();
    }

    function updatePhotoSelectionUI() {
        if (!DOMElements.photoActionBar || !DOMElements.selectionCountSpan) return;
        const count = selectedPhotos.size;
        if (count > 0) {
            DOMElements.photoActionBar.classList.remove('hidden');
            DOMElements.photoActionBar.classList.add('flex'); 
            DOMElements.selectionCountSpan.textContent = `${count} photo${count > 1 ? 's' : ''} selected`;
        } else {
            DOMElements.photoActionBar.classList.add('hidden');
            DOMElements.photoActionBar.classList.remove('flex');
        }
    }
    
    function setupPhotoActionBarListeners(currentAlbumId) {
        if (!DOMElements.albumDetailView) return; 
        
        const clearSelectionBtn = DOMElements.albumDetailView.querySelector('#clearSelectionBtn');
        const deleteSelectedBtn = DOMElements.albumDetailView.querySelector('#deleteSelectedBtn');
        const downloadSelectedBtn = DOMElements.albumDetailView.querySelector('#downloadSelectedBtn');

        clearSelectionBtn?.addEventListener('click', () => {
            if (!DOMElements.photoGrid) return;
            selectedPhotos.forEach(photoId => {
                const item = DOMElements.photoGrid.querySelector(`.photo-item[data-photo-id="${photoId}"]`);
                if (item) {
                    item.classList.remove('selected-item');
                    const checkbox = item.querySelector('.photo-checkbox');
                    if (checkbox) checkbox.checked = false;
                }
            });
            selectedPhotos.clear();
            updatePhotoSelectionUI();
        });

        deleteSelectedBtn?.addEventListener('click', async () => {
            if (selectedPhotos.size === 0) {
                showToast("No photos selected to delete.", "info");
                return;
            }
            
            const userConfirmed = window.confirm(`Are you sure you want to delete ${selectedPhotos.size} photo(s)? This action cannot be undone.`);

            if (!userConfirmed) {
                return;
            }

            const token = localStorage.getItem('authToken');
            if (!token) {
                 showToast("Authentication required to delete photos.", "error");
                 return;
            }
            const photosToDelete = Array.from(selectedPhotos);

            showToast(`Deleting ${photosToDelete.length} photos...`, "info");
            try {
                 const response = await fetch(`${API_BASE_URL}/api/albums/${currentAlbumId}/photos/delete`, {
                    method: 'POST', 
                    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
                    body: JSON.stringify({ photo_ids: photosToDelete }) 
                });

                const responseText = await response.text();
                let result;
                try {
                    result = JSON.parse(responseText);
                } catch (e) {
                    console.error("Failed to parse server response as JSON. Raw response:", responseText);
                    throw new Error(`Server returned non-JSON response (status ${response.status}). Check console for details.`);
                }

                if (!response.ok) {
                    throw new Error(result.error || result.message || `Failed to delete photos (status ${response.status}).`);
                }
                
                showToast(result.message || `${photosToDelete.length} photo(s) processed.`, "success");
                
                if(result.errors && result.errors.length > 0){
                    result.errors.forEach(err => showToast(`Error deleting ${err.photo_id}: ${err.error}`, "error"));
                }

                const albumName = DOMElements.albumDetailView.querySelector('#detail-album-title')?.textContent || currentAlbumId;
                loadAlbumDetailView(currentAlbumId, albumName); // Refresh view
            } catch (error) {
                console.error("Error deleting photos:", error);
                showToast(`Error deleting photos: ${error.message}`, "error");
            }
        });

        downloadSelectedBtn?.addEventListener('click', () => {
            if (selectedPhotos.size === 0) {
                showToast("No photos selected to download.", "info");
                return;
            }
            showToast(`Preparing ${selectedPhotos.size} photo(s) for download...`, "info");
            Array.from(selectedPhotos).forEach(photoId => {
                const photoItem = DOMElements.photoGrid?.querySelector(`.photo-item[data-photo-id="${photoId}"]`);
                if (photoItem && photoItem.dataset.photoUrl) {
                    const link = document.createElement('a');
                    link.href = photoItem.dataset.photoUrl;
                    link.download = photoItem.dataset.photoName || photoId; 
                    document.body.appendChild(link);
                    link.click();
                    document.body.removeChild(link);
                } else {
                    console.warn(`Could not find URL for selected photo ID: ${photoId}`);
                }
            });
        });
    }

    async function handlePhotoUpload(files, albumId, albumName) {
        if (!files || files.length === 0) return;
        const token = localStorage.getItem('authToken');
        if (!token) {
            showToast("You must be logged in to upload photos.", "error");
            return;
        }

        const uploadButton = DOMElements.albumDetailView?.querySelector('#uploadToAlbumBtn');
        if (uploadButton) {
            uploadButton.disabled = true;
            uploadButton.innerHTML = `<i class="fas fa-spinner fa-spin"></i><span class="ml-2">Uploading 0/${files.length}...</span>`;
        }

        const successfulUrls = [];
        let errorCount = 0;

        for (let i = 0; i < files.length; i++) {
            const file = files[i];
            const formData = new FormData();
            formData.append('file', file);
            formData.append('album', albumId);

            try {
                const response = await fetch(`${API_BASE_URL}/api/upload-single-file`, {
                    method: 'POST',
                    headers: { 'Authorization': `Bearer ${token}` },
                    body: formData
                });

                const result = await response.json();

                if (response.ok && result.success) {
                    successfulUrls.push(result.url);
                    if (uploadButton) {
                         uploadButton.innerHTML = `<i class="fas fa-spinner fa-spin"></i><span class="ml-2">Uploading ${i + 1}/${files.length}...</span>`;
                    }
                } else {
                    errorCount++;
                    showToast(`Failed to upload ${file.name}: ${result.error || 'Server error'}`, "error");
                }
            } catch (error) {
                errorCount++;
                showToast(`Failed to upload ${file.name}: ${error.message}`, "error");
            }
        }

        if (successfulUrls.length > 0) {
            showToast(`All files uploaded. Now processing faces... This may take a moment.`, "info");
            if (uploadButton) {
                uploadButton.innerHTML = `<i class="fas fa-brain"></i><span class="ml-2">Processing Faces...</span>`;
            }

            try {
                const embedding_filename = `${albumId}_embeddings.json`;
                const payload = new FormData();
                successfulUrls.forEach(url => payload.append('urls', url));
                payload.append('embedding_file', embedding_filename);
                
                const mlResponse = await fetch(`${ML_API_BASE_URL}/add_embeddings_from_urls/`, {
                    method: 'POST',
                    body: payload,
                });

                if (!mlResponse.ok) {
                    const mlError = await mlResponse.json();
                    throw new Error(mlError.detail || "Face processing failed on the ML server.");
                }
                
                showToast("Face processing complete!", "success");

            } catch (error) {
                console.error("Error during ML batch processing:", error);
                showToast(`Face processing failed: ${error.message}`, "error");
            }
        }

        if (uploadButton) {
            uploadButton.disabled = false;
            uploadButton.innerHTML = `<i class="fas fa-upload"></i><span class="ml-2">Upload Photos</span>`;
        }

        if (errorCount > 0) {
            showToast(`${errorCount} file(s) failed to upload.`, 'error');
        }

        loadAlbumDetailView(albumId, albumName);
        const uploadPhotosInput = DOMElements.albumDetailView?.querySelector('#uploadPhotosInput');
        if (uploadPhotosInput) uploadPhotosInput.value = null;
    }

    function openLightbox(index) {
        if (!DOMElements.lightboxModal || !DOMElements.lightboxImage || !DOMElements.lightboxCaption ||
            !DOMElements.lightboxPrevBtn || !DOMElements.lightboxNextBtn ||
            !currentAlbumPhotos || currentAlbumPhotos.length === 0) {
            console.error("Lightbox elements or photo data missing.");
            return;
        }
        lightboxCurrentIndex = index;
        updateLightboxContent();
        DOMElements.lightboxModal.style.display = 'flex';
        document.body.style.overflow = 'hidden'; 
    }

    function closeLightbox() {
        if (!DOMElements.lightboxModal) return;
        DOMElements.lightboxModal.style.display = 'none';
        document.body.style.overflow = 'auto';
    }

    function updateLightboxContent() {
        if (lightboxCurrentIndex < 0 || lightboxCurrentIndex >= currentAlbumPhotos.length) return;
        const photo = currentAlbumPhotos[lightboxCurrentIndex];
        if (!photo || !photo.url) {
             console.error("Invalid photo data for lightbox:", photo);
             DOMElements.lightboxImage.src = 'https://placehold.co/600x400/ff0000/ffffff?text=Error+Loading+Image';
             DOMElements.lightboxCaption.textContent = 'Error: Image data missing';
             return;
        }
        DOMElements.lightboxImage.src = photo.url;
        DOMElements.lightboxCaption.textContent = photo.name;
        DOMElements.lightboxPrevBtn.disabled = lightboxCurrentIndex === 0;
        DOMElements.lightboxNextBtn.disabled = lightboxCurrentIndex === currentAlbumPhotos.length - 1;
    }

    DOMElements.closeLightboxBtn?.addEventListener('click', closeLightbox);
    DOMElements.lightboxModal?.addEventListener('click', (e) => { 
        if (e.target === DOMElements.lightboxModal) closeLightbox();
    });
    DOMElements.lightboxPrevBtn?.addEventListener('click', () => {
        if (lightboxCurrentIndex > 0) {
            lightboxCurrentIndex--;
            updateLightboxContent();
        }
    });
    DOMElements.lightboxNextBtn?.addEventListener('click', () => {
        if (lightboxCurrentIndex < currentAlbumPhotos.length - 1) {
            lightboxCurrentIndex++;
            updateLightboxContent();
        }
    });
    document.addEventListener('keydown', (e) => { 
        if (DOMElements.lightboxModal && DOMElements.lightboxModal.style.display === 'flex') {
            if (e.key === 'Escape') closeLightbox();
            if (e.key === 'ArrowLeft' && DOMElements.lightboxPrevBtn && !DOMElements.lightboxPrevBtn.disabled) DOMElements.lightboxPrevBtn.click();
            if (e.key === 'ArrowRight' && DOMElements.lightboxNextBtn && !DOMElements.lightboxNextBtn.disabled) DOMElements.lightboxNextBtn.click();
        }
    });

    DOMElements.faceSearchForm?.addEventListener('submit', async (e) => {
        e.preventDefault();
        if(!DOMElements.searchAlbumSelect || !DOMElements.faceSearchFileInput || 
           !DOMElements.searchStatusMessage || !DOMElements.searchResultsLoader || 
           !DOMElements.searchResultsGrid || !DOMElements.noMatchesMessage) {
            console.error("One or more face search form elements are missing.");
            showToast("Face search UI is not set up correctly.", "error");
            return;
        }

        const albumId = DOMElements.searchAlbumSelect.value;
        const file = DOMElements.faceSearchFileInput.files[0];

        if (!albumId) {
            showToast("Please select an album to search in.", "error");
            if(DOMElements.searchStatusMessage) DOMElements.searchStatusMessage.textContent = '';
            return;
        }
        if (!file) {
            showToast("Please select an image file for face search.", "error");
            if(DOMElements.searchStatusMessage) DOMElements.searchStatusMessage.textContent = '';
            return;
        }

        const formData = new FormData();
        formData.append('album', albumId); 
        formData.append('file', file);
        
        if(DOMElements.searchStatusMessage) {
            DOMElements.searchStatusMessage.textContent = 'Searching for matching faces...';
            DOMElements.searchStatusMessage.className = 'mt-6 text-center text-gray-color';
        }
        if(DOMElements.searchResultsLoader) showLoadingState(DOMElements.searchResultsLoader, true);
        if(DOMElements.searchResultsGrid) DOMElements.searchResultsGrid.innerHTML = '';
        if(DOMElements.noMatchesMessage) DOMElements.noMatchesMessage.style.display = 'none';
        
        const token = localStorage.getItem('authToken');
        if (!token) {
             showToast("Authentication required for face search.", "error");
             if(DOMElements.searchResultsLoader) showLoadingState(DOMElements.searchResultsLoader, false);
             if(DOMElements.searchStatusMessage) DOMElements.searchStatusMessage.textContent = 'Authentication required.';
             return;
        }

        try {
            const response = await fetch(`${API_BASE_URL}/api/find-matches`, {
                method: 'POST',
                body: formData,
                 headers: { 'Authorization': `Bearer ${token}` }
            });
            const result = await response.json();
            if (!response.ok) throw new Error(result.error || result.details || "Face search request failed.");

            if(DOMElements.searchStatusMessage) DOMElements.searchStatusMessage.textContent = 'Search complete!';
            
            if (result.matches && result.matches.length > 0) {
                result.matches.forEach(match => { 
                    const imgContainer = document.createElement('div');
                    imgContainer.className = 'aspect-square bg-gray-100 rounded-lg overflow-hidden shadow-sm group';
                    
                    imgContainer.innerHTML = `
                        <img src="${match.url}" alt="Matching image" class="w-full h-full object-cover transition-transform group-hover:scale-105" onerror="this.onerror=null;this.src='https://placehold.co/300x300/e0e0e0/777?text=Match+Error';">
                        <div class="absolute bottom-0 left-0 right-0 p-1 bg-black bg-opacity-0 group-hover:bg-opacity-50 transition-colors text-white text-xs text-center">
                            Score: ${match.score.toFixed(2)}
                        </div>
                    `;
                    
                    if(DOMElements.searchResultsGrid) DOMElements.searchResultsGrid.appendChild(imgContainer);
                });
            } else {
                if(DOMElements.noMatchesMessage) DOMElements.noMatchesMessage.style.display = 'block';
                if(DOMElements.searchStatusMessage) DOMElements.searchStatusMessage.textContent = result.message || 'No matches found.';
            }
        } catch (error) {
            console.error("Error finding matches:", error);
            if(DOMElements.searchStatusMessage) {
                 DOMElements.searchStatusMessage.textContent = `Search failed: ${error.message}`;
                 DOMElements.searchStatusMessage.className = 'mt-6 text-center text-red-500';
            }
            showToast(`Face search failed: ${error.message}`, "error");
        } finally {
            if(DOMElements.searchResultsLoader) showLoadingState(DOMElements.searchResultsLoader, false);
        }
    });
    
    DOMElements.hamburger?.addEventListener('click', () => {
        if (!DOMElements.mobileNavLinksMenu || !DOMElements.hamburger) return;
        const isExpanded = DOMElements.hamburger.getAttribute('aria-expanded') === 'true' || false;
        DOMElements.hamburger.setAttribute('aria-expanded', String(!isExpanded));
        DOMElements.mobileNavLinksMenu.classList.toggle('hidden');
        
        const icon = DOMElements.hamburger.querySelector('i');
        if (icon) {
            icon.classList.toggle('fa-bars');
            icon.classList.toggle('fa-times');
        }
    });

    DOMElements.profileDropdownButton?.addEventListener('click', (event) => {
        event.stopPropagation(); 
        if (DOMElements.profileDropdownMenu) {
            const isHidden = DOMElements.profileDropdownMenu.classList.toggle('hidden');
            DOMElements.profileDropdownButton.setAttribute('aria-expanded', String(!isHidden));
        }
    });

    document.addEventListener('click', (event) => {
        if (DOMElements.profileDropdownContainer && DOMElements.profileDropdownMenu &&
            !DOMElements.profileDropdownContainer.contains(event.target) && 
            !DOMElements.profileDropdownMenu.classList.contains('hidden')) {
            DOMElements.profileDropdownMenu.classList.add('hidden');
            if(DOMElements.profileDropdownButton) DOMElements.profileDropdownButton.setAttribute('aria-expanded', 'false');
        }
    });

    function handleLogout() {
        localStorage.removeItem('authToken');
        localStorage.removeItem('username');
        localStorage.removeItem('userEmail'); 
        updateUserNav(false);
        if (DOMElements.loginPromptDiv) DOMElements.loginPromptDiv.style.display = 'block';
        if (DOMElements.albumsMainContentDiv) DOMElements.albumsMainContentDiv.style.display = 'none';
        switchView('login-prompt'); 
        showToast("You have been logged out.", "info");
        currentAlbums = []; 
        currentAlbumPhotos = []; 
        if(DOMElements.searchAlbumSelect) DOMElements.searchAlbumSelect.innerHTML = '<option value="">-- Select Album --</option>';
        if (DOMElements.profileDropdownMenu) {
             DOMElements.profileDropdownMenu.classList.add('hidden');
        }
        if(DOMElements.profileDropdownButton) {
            DOMElements.profileDropdownButton.setAttribute('aria-expanded', 'false');
        }
    }
    DOMElements.logoutBtnDropdown?.addEventListener('click', (e) => {
        e.preventDefault();
        handleLogout();
    });
    DOMElements.logoutBtnNavMobile?.addEventListener('click', (e) => {
        e.preventDefault();
        handleLogout();
    });

    async function initializePage() {
        await checkLoginStatus(); 
        const isLoggedIn = !!localStorage.getItem('authToken'); 

        if (isLoggedIn) {
            switchView('manage-albums-view');
            const albums = await fetchUserAlbums();
            displayAlbums(albums);
        }

        DOMElements.navTabButtons.forEach(button => {
            button.addEventListener('click', async () => {
                const viewId = button.dataset.view + "-view";
                switchView(viewId);
                if (viewId === 'manage-albums-view' && (!currentAlbums || currentAlbums.length === 0)) {
                    const albums = await fetchUserAlbums();
                    displayAlbums(albums);
                }
                if (viewId === 'find-images-view' && DOMElements.searchAlbumSelect && DOMElements.searchAlbumSelect.options.length <= 1) {
                     if (!currentAlbums || currentAlbums.length === 0) await fetchUserAlbums(); 
                     displayAlbums(currentAlbums); 
                }
            });
        });
    }

    initializePage();
});
