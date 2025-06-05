// Main JavaScript
document.addEventListener('DOMContentLoaded', function() {
    console.log('Document ready!');
    
    // Secure Albums - Tab System
    const tabBtns = document.querySelectorAll('.tab-btn');
    const tabPanes = document.querySelectorAll('.tab-pane');
    
    if (tabBtns.length > 0 && tabPanes.length > 0) {
        tabBtns.forEach(btn => {
            btn.addEventListener('click', () => {
                // Remove active class from all buttons and panes
                tabBtns.forEach(b => b.classList.remove('active'));
                tabPanes.forEach(p => p.classList.remove('active'));
                
                // Add active class to clicked button
                btn.classList.add('active');
                
                // Show corresponding pane
                const tabId = btn.getAttribute('data-tab');
                document.getElementById(tabId).classList.add('active');
            });
        });
    }

    
    // Password Access Functionality
    const passwordInput = document.querySelector('.password-input input');
    const accessBtn = document.querySelector('.access-btn');
    
    if (passwordInput && accessBtn) {
        accessBtn.addEventListener('click', () => {
            const password = passwordInput.value.trim();
            
            if (password === '') {
                alert('Please enter the album password');
                return;
            }
            
            // Demo functionality - in real app would verify password
            simulateAlbumAccess('password');
        });
        
        // Also trigger on Enter key
        passwordInput.addEventListener('keyup', (e) => {
            if (e.key === 'Enter') {
                accessBtn.click();
            }
        });
    }
    
    // Face Recognition Functionality
    const scanBtn = document.querySelector('.scan-btn');
    
    if (scanBtn) {
        scanBtn.addEventListener('click', () => {
            // Demo functionality - would connect to external API in real implementation
            simulateAlbumAccess('face');
        });
    }
    
    // Simulate successful album access
    function simulateAlbumAccess(method) {
        const albumCard = method === 'password' ? 
            document.querySelector('#password-tab .album-card') : 
            document.querySelector('#face-tab .album-card');
            
        if (albumCard) {
            // Show loading state
            albumCard.innerHTML = `
                <div class="album-header">
                    <h4><i class="fas fa-spinner fa-spin"></i> Verifying...</h4>
                </div>
                <div class="album-verification">
                    <div class="verification-animation">
                        <i class="fas fa-circle-notch fa-spin"></i>
                    </div>
                    <p>Please wait, verifying your ${method === 'password' ? 'credentials' : 'identity'}...</p>
                </div>
            `;
            
            // After 2 seconds, show success
            setTimeout(() => {
                albumCard.innerHTML = `
                    <div class="album-header album-success">
                        <h4><i class="fas fa-check-circle"></i> Access Granted!</h4>
                    </div>
                    <div class="album-success-content">
                        <div class="success-animation">
                            <i class="fas fa-check-circle"></i>
                        </div>
                        <p>Welcome to your album! Your photos are being loaded...</p>
                        <div class="album-info">
                            <p><strong>${method === 'password' ? "Sarah's Wedding" : 'Family Reunion'}</strong></p>
                            <p><i class="fas fa-images"></i> 248 Photos</p>
                            <button class="btn btn-primary">View Album</button>
                        </div>
                    </div>
                `;
                
                // Add success styles
                const successAnimation = albumCard.querySelector('.success-animation');
                if (successAnimation) {
                    successAnimation.classList.add('active');
                }
            }, 2000);
        }
    }
    
    // Reveal animations on scroll
    const revealElements = document.querySelectorAll('.reveal');
    const windowHeight = window.innerHeight;

    function checkReveal() {
        revealElements.forEach(element => {
            const elementTop = element.getBoundingClientRect().top;
            if (elementTop < windowHeight - 100) {
                element.classList.add('active');
            }
        });
    }

    // Initial check in case elements are already in view
    checkReveal();

    // Check on scroll
    window.addEventListener('scroll', checkReveal);

    // Hamburger logic removed - handled by gloabal_auth.js

    // Before-after image slider
    const sliderHandle = document.querySelector('.slider-handle');
    const beforeImage = document.querySelector('.before-image');
    
    if (sliderHandle && beforeImage) {
        let isDragging = false;
        
        const slider = document.querySelector('.before-after-slider');
        const sliderWidth = slider.offsetWidth;

        function setSliderPosition(x) {
            let position = (x / sliderWidth) * 100;
            position = Math.max(0, Math.min(position, 100));
            
            sliderHandle.style.left = `${position}%`;
            beforeImage.style.width = `${position}%`;
        }

        sliderHandle.addEventListener('mousedown', (e) => {
            isDragging = true;
            e.preventDefault();
        });

        window.addEventListener('mouseup', () => {
            isDragging = false;
        });

        slider.addEventListener('mousemove', (e) => {
            if (isDragging) {
                const rect = slider.getBoundingClientRect();
                const x = e.clientX - rect.left;
                setSliderPosition(x);
            }
        });

        // For touch devices
        sliderHandle.addEventListener('touchstart', (e) => {
            isDragging = true;
        }, { passive: true });

        window.addEventListener('touchend', () => {
            isDragging = false;
        }, { passive: true });

        slider.addEventListener('touchmove', (e) => {
            if (isDragging) {
                const rect = slider.getBoundingClientRect();
                const x = e.touches[0].clientX - rect.left;
                setSliderPosition(x);
            }
        }, { passive: true });
    }

    // Pricing toggle
    const pricingToggle = document.getElementById('pricing-toggle');
    
    if (pricingToggle) {
        pricingToggle.addEventListener('change', () => {
            const isYearly = pricingToggle.checked;
            
            // Free plan stays the same
            
            // Premium plan pricing
            const premiumPrice = document.getElementById('premium-price');
            if (premiumPrice) {
                const premiumAmount = premiumPrice.querySelector('.amount');
                const premiumPeriod = premiumPrice.querySelector('.period');
                
                if (isYearly) {
                    premiumAmount.textContent = '9';
                    premiumPeriod.textContent = '/month (billed annually)';
                } else {
                    premiumAmount.textContent = '12';
                    premiumPeriod.textContent = '/month';
                }
            }
            
            // Business plan pricing
            const businessPrice = document.getElementById('business-price');
            if (businessPrice) {
                const businessAmount = businessPrice.querySelector('.amount');
                const businessPeriod = businessPrice.querySelector('.period');
                
                if (isYearly) {
                    businessAmount.textContent = '24';
                    businessPeriod.textContent = '/month (billed annually)';
                } else {
                    businessAmount.textContent = '29';
                    businessPeriod.textContent = '/month';
                }
            }
        });
    }

    // Testimonial Carousel
    const testimonialContainer = document.getElementById('testimonial-container');
    const dots = document.querySelectorAll('.dot');
    const prevBtn = document.getElementById('prev-testimonial');
    const nextBtn = document.getElementById('next-testimonial');
    
    if (testimonialContainer && dots.length && prevBtn && nextBtn) {
        let currentIndex = 0;
        const testimonials = document.querySelectorAll('.testimonial');
        const testimonialCount = testimonials.length;

        function updateCarousel() {
            testimonialContainer.style.transform = `translateX(-${currentIndex * 100}%)`;
            
            // Update dots
            dots.forEach(dot => dot.classList.remove('active'));
            dots[currentIndex].classList.add('active');
        }

        prevBtn.addEventListener('click', () => {
            currentIndex = (currentIndex - 1 + testimonialCount) % testimonialCount;
            updateCarousel();
        });

        nextBtn.addEventListener('click', () => {
            currentIndex = (currentIndex + 1) % testimonialCount;
            updateCarousel();
        });

        // Click on dots to navigate
        dots.forEach(dot => {
            dot.addEventListener('click', () => {
                currentIndex = parseInt(dot.dataset.index);
                updateCarousel();
            });
        });

        // Auto rotate testimonials
        setInterval(() => {
            currentIndex = (currentIndex + 1) % testimonialCount;
            updateCarousel();
        }, 8000);
    }

    // Smooth scrolling for anchor links
    const anchorLinks = document.querySelectorAll('a[href^="#"]:not([href="#"])');
    
    anchorLinks.forEach(anchor => {
        anchor.addEventListener('click', function(e) {
            e.preventDefault();
            
            const targetId = this.getAttribute('href');
            if (!targetId || targetId === '#') return;
            
            const targetElement = document.querySelector(targetId);
            if (targetElement) {
                // Close mobile menu if open and if gloabal_auth.js hasn't already closed it
                const mobileMenu = document.getElementById('mobileNavLinksMenu');
                if (mobileMenu && !mobileMenu.classList.contains('hidden')) {
                    const hamburgerButton = document.getElementById('hamburger');
                    if(hamburgerButton) hamburgerButton.click(); // Simulate click to close via gloabal_auth.js
                }
                
                window.scrollTo({
                    top: targetElement.offsetTop - 80, // Offset for fixed header
                    behavior: 'smooth'
                });
            }
        });
    });
});

// Contact Us page specific JS (from previous script.js content)
document.addEventListener('DOMContentLoaded', function() {
    // Form validation and submission for contact page
    const contactForm = document.getElementById('contactForm');
    
    if (contactForm) { // Only run if on contact page
        console.log('Contact Us page ready!');
        contactForm.addEventListener('submit', function(e) {
            e.preventDefault();
            
            const name = document.getElementById('name').value.trim();
            const email = document.getElementById('email').value.trim();
            const phone = document.getElementById('phone').value.trim();
            const subject = document.getElementById('subject').value.trim();
            const message = document.getElementById('message').value.trim();
            
            if (!name || !email || !message) {
                alert('Please fill out all required fields.');
                return;
            }
            
            const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
            if (!emailPattern.test(email)) {
                alert('Please enter a valid email address.');
                return;
            }
            
            console.log('Form submitted with:', { name, email, phone, subject, message });
            alert('Thank you for your message! We will get back to you soon.');
            contactForm.reset();
        });
    }
}); 

// Album password modal logic (from previous script.js content)
document.addEventListener('DOMContentLoaded', function() {
    const albumCards = document.querySelectorAll('.albums-container .album-card'); // More specific selector
    const modal = document.getElementById('password-modal');
    
    if (albumCards.length > 0 && modal) { // Only run if these elements exist
        console.log('Album password modal logic initialized.');
        const modalClose = document.querySelector('.close-modal');
        const passwordForm = document.getElementById('password-form');
        const passwordInput = document.getElementById('password-input');
        const errorMessage = document.getElementById('error-message');
        let currentAlbum = null;
        
        albumCards.forEach(card => {
            card.addEventListener('click', () => {
                currentAlbum = card;
                modal.style.display = 'flex';
                if(passwordInput) passwordInput.value = '';
                if(errorMessage) errorMessage.style.display = 'none';
                if(passwordInput) passwordInput.focus();
            });
        });
        
        if(modalClose) {
            modalClose.addEventListener('click', () => {
                modal.style.display = 'none';
            });
        }
        
        window.addEventListener('click', (event) => {
            if (event.target === modal) {
                modal.style.display = 'none';
            }
        });
        
        if(passwordForm) {
            passwordForm.addEventListener('submit', (e) => {
                e.preventDefault();
                if (!currentAlbum || !passwordInput) return;
                
                const enteredPassword = passwordInput.value;
                const correctPassword = currentAlbum.dataset.password;
                const albumId = currentAlbum.dataset.albumId;
                
                if (enteredPassword === correctPassword) {
                    modal.style.display = 'none';
                    alert(`Access granted to album: ${albumId}\nIn a real application, you would be redirected to the album page.`);
                    // window.location.href = `album_detail.html?id=${albumId}`; // Example redirect
                } else {
                    if(errorMessage) {
                        errorMessage.textContent = 'Incorrect password. Please try again.';
                        errorMessage.style.display = 'block';
                    }
                    passwordInput.value = '';
                    passwordInput.focus();
                }
            });
        }
    }
});