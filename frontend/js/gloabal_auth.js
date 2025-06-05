
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

        hamburger: document.getElementById('hamburger'),
        mobileNavLinksMenu: document.getElementById('mobileNavLinksMenu'),
    };

    const API_BASE_URL = ''; // Assuming relative paths like /api/auth/verify

    function updateUserNavUI(isLoggedIn, userData = null) {
        const defaultEmail = "user@example.com"; 
        const defaultUsername = "User";

        // Desktop Nav
        if (DOMElements.loginBtnNav && DOMElements.signinBtnNav && DOMElements.profileDropdownContainer) {
            if (isLoggedIn && userData) {
                DOMElements.loginBtnNav.style.display = 'none';
                DOMElements.signinBtnNav.style.display = 'none';
                DOMElements.profileDropdownContainer.style.display = 'block';

                const username = userData.username || defaultUsername;
                const email = userData.email || (username !== defaultUsername ? `${username.toLowerCase().split(' ')[0]}@example.com` : defaultEmail) ;
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

        // Mobile Nav
        if (DOMElements.loginBtnNavMobile && DOMElements.signinBtnNavMobile && DOMElements.profileContainerMobile) {
            if (isLoggedIn && userData) {
                DOMElements.loginBtnNavMobile.style.display = 'none';
                DOMElements.signinBtnNavMobile.style.display = 'none';
                DOMElements.profileContainerMobile.style.display = 'block';
                const username = userData.username || defaultUsername;
                const email = userData.email || (username !== defaultUsername ? `${username.toLowerCase().split(' ')[0]}@example.com` : defaultEmail) ;
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

    async function checkUserLoginStatus() {
        const token = localStorage.getItem('authToken');
        const storedUsername = localStorage.getItem('username');
        const storedUserEmail = localStorage.getItem('userEmail'); 

        if (!token) {
            updateUserNavUI(false);
            return false;
        }
        
        if (storedUsername) { // Optimistic UI update
            updateUserNavUI(true, { username: storedUsername, email: storedUserEmail });
        }

        try {
            const response = await fetch(`${API_BASE_URL}/api/auth/verify`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (response.ok) {
                const data = await response.json();
                if (data.valid && data.username) {
                    const userData = { username: data.username, email: data.email || storedUserEmail };
                    updateUserNavUI(true, userData); 
                    localStorage.setItem('username', data.username); 
                    if(data.email) localStorage.setItem('userEmail', data.email);
                    else if (storedUserEmail) localStorage.setItem('userEmail', storedUserEmail);
                    return true;
                }
            }
            // If verification fails
            handleUserLogout(); // Clear storage and update UI
            return false;
        } catch (error) {
            console.error("Error verifying token:", error);
            handleUserLogout(); // Clear storage and update UI on error
            return false;
        }
    }

    function handleUserLogout() {
        localStorage.removeItem('authToken');
        localStorage.removeItem('username');
        localStorage.removeItem('userEmail'); 
        updateUserNavUI(false);
        
        // Close dropdowns if open
        if (DOMElements.profileDropdownMenu) DOMElements.profileDropdownMenu.classList.add('hidden');
        if (DOMElements.profileDropdownButton) DOMElements.profileDropdownButton.setAttribute('aria-expanded', 'false');
        if (DOMElements.mobileNavLinksMenu) DOMElements.mobileNavLinksMenu.classList.add('hidden');
        if (DOMElements.hamburger) DOMElements.hamburger.setAttribute('aria-expanded', 'false');
        
        // Optional: Redirect to login or home page if desired after logout
        // For example, if not on home page already:
        // if (!window.location.pathname.endsWith('/') && !window.location.pathname.endsWith('index.html')) {
        // window.location.href = 'index.html';
        // }
        // Do not show toast here as this is a global script. Page-specific logout might show toast.
    }

    // Hamburger Menu Toggle
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

    // Profile Dropdown Toggle
    DOMElements.profileDropdownButton?.addEventListener('click', (event) => {
        event.stopPropagation(); 
        if (DOMElements.profileDropdownMenu) {
            const isHidden = DOMElements.profileDropdownMenu.classList.toggle('hidden');
            if(DOMElements.profileDropdownButton) DOMElements.profileDropdownButton.setAttribute('aria-expanded', String(!isHidden));
        }
    });

    // Close dropdown if clicked outside
    document.addEventListener('click', (event) => {
        if (DOMElements.profileDropdownContainer && DOMElements.profileDropdownMenu &&
            !DOMElements.profileDropdownContainer.contains(event.target) && 
            !DOMElements.profileDropdownMenu.classList.contains('hidden')) {
            DOMElements.profileDropdownMenu.classList.add('hidden');
            if(DOMElements.profileDropdownButton) DOMElements.profileDropdownButton.setAttribute('aria-expanded', 'false');
        }
    });

    // Logout Button Event Listeners
    DOMElements.logoutBtnDropdown?.addEventListener('click', (e) => {
        e.preventDefault();
        handleUserLogout();
        // You might want to add a toast notification here or on the specific page
        alert("You have been logged out."); // Simple alert for now
    });
    DOMElements.logoutBtnNavMobile?.addEventListener('click', (e) => {
        e.preventDefault();
        handleUserLogout();
        alert("You have been logged out."); // Simple alert for now
    });

    // Initial check
    await checkUserLoginStatus();
});