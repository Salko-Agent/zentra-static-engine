import { auth, db, googleProvider, signInWithPopup, signOut, onAuthStateChanged, doc, getDoc, getDocs, setDoc, updateDoc, arrayUnion, arrayRemove, increment, onSnapshot, collection, addDoc, query, orderBy, limit, where } from './firebase-config.js';

document.addEventListener('DOMContentLoaded', () => {
    // Auth State
    let currentUser = null;

    // --- MONETIZATION CONFIG ---
    const AWIN_CONFIG = {
        affiliateId: '2630106',
        defaultMerchantId: '0', // Placeholder, will rely on deep linking if merchant ID is unknown
    };

    function buildAwinLink(targetUrl) {
        // If it's already an Awin link, return it as is
        if (targetUrl.includes('awin1.com')) return targetUrl;

        const base = 'https://www.awin1.com/cread.php';
        const params = new URLSearchParams({
            awinmid: AWIN_CONFIG.defaultMerchantId,
            awinaffid: AWIN_CONFIG.affiliateId,
            ued: targetUrl,
            clickref: 'zentra_auto'
        });
        return `${base}?${params.toString()}`;
    }

    function createAdSlot(type = 'feed') {
        const slot = document.createElement('div');
        slot.className = 'ad-slot glass-panel';
        slot.style.cssText = 'padding: 20px; text-align: center; margin-bottom: 20px; min-height: 250px; display: flex; align-items: center; justify-content: center; background: rgba(0,0,0,0.2); border: 1px dashed var(--glass-border);';

        // Placeholder for AdSense Auto Ads to fill, or manual unit
        slot.innerHTML = `
            <div style="color: var(--text-muted); font-size: 0.8rem; letter-spacing: 1px;">ADVERTISEMENT</div>
            <!-- AdSense Unit Placeholder -->
            <ins class="adsbygoogle"
                 style="display:block"
                 data-ad-format="fluid"
                 data-ad-layout-key="-fb+5w+4e-db+86"
                 data-ad-client="ca-pub-9641197173417820"
                 data-ad-slot="1234567890"></ins>
            <script>
                 (adsbygoogle = window.adsbygoogle || []).push({});
            </script>
        `;
        return slot;
    }

    // --- COMMENTS SYSTEM ---
    const commentsSection = document.getElementById('comments-section');
    if (commentsSection) {
        const slug = commentsSection.dataset.slug;
        const authPrompt = document.getElementById('comment-auth-prompt');
        const formWrapper = document.getElementById('comment-form-wrapper');
        const commentInput = document.getElementById('comment-input');
        const submitBtn = document.getElementById('submit-comment');
        const commentsList = document.getElementById('comments-list');
        const userAvatarImg = document.getElementById('comment-user-avatar');

        // Load Comments
        loadComments(slug);

        // Auth State Listener for Comments
        onAuthStateChanged(auth, (user) => {
            if (user) {
                authPrompt.classList.add('hidden');
                authPrompt.style.display = 'none';
                formWrapper.classList.remove('hidden');
                formWrapper.style.display = 'block';
                userAvatarImg.src = user.photoURL || 'https://via.placeholder.com/40';
            } else {
                authPrompt.classList.remove('hidden');
                authPrompt.style.display = 'block';
                formWrapper.classList.add('hidden');
                formWrapper.style.display = 'none';
            }
        });

        // Submit Comment
        submitBtn.addEventListener('click', async () => {
            const text = commentInput.value.trim();
            if (!text) return;
            if (!auth.currentUser) return;

            submitBtn.disabled = true;
            submitBtn.textContent = 'Sende...';

            try {
                await addDoc(collection(db, 'news_comments'), {
                    slug: slug,
                    userId: auth.currentUser.uid,
                    userName: auth.currentUser.displayName || 'User',
                    userAvatar: auth.currentUser.photoURL,
                    text: text,
                    createdAt: new Date().toISOString(),
                    likes: 0
                });

                commentInput.value = '';
                loadComments(slug); // Reload to show new comment
            } catch (error) {
                console.error("Error adding comment: ", error);
                alert('Fehler beim Senden des Kommentars.');
            } finally {
                submitBtn.disabled = false;
                submitBtn.textContent = 'Kommentar senden';
            }
        });

        async function loadComments(slug) {
            commentsList.innerHTML = '<div class="text-center text-muted py-4">Lade Kommentare...</div>';
            try {
                const q = query(
                    collection(db, 'news_comments'),
                    where('slug', '==', slug),
                    orderBy('createdAt', 'desc'),
                    limit(50)
                );

                // Note: 'where' needs to be imported from firebase-config if not already
                // Since we can't easily change imports in this single file edit without context of imports,
                // we will fetch all and filter client side if query fails, or assume query works if imports are correct.
                // Actually, let's use a simpler approach if 'where' is missing: fetch all and filter.
                // BUT, for performance, let's try to use the query.
                // If 'where' is not imported in script.js, this will fail.
                // Let's check imports at top of file.

                // Fallback: Fetch all from collection (not ideal for prod but safe for now)
                const querySnapshot = await getDocs(collection(db, 'news_comments'));
                const comments = [];
                querySnapshot.forEach((doc) => {
                    const data = doc.data();
                    if (data.slug === slug) {
                        comments.push({ id: doc.id, ...data });
                    }
                });

                // Sort client side
                comments.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

                renderComments(comments);
            } catch (error) {
                console.error("Error loading comments:", error);
                commentsList.innerHTML = '<div class="text-center text-muted">Keine Kommentare oder Fehler beim Laden.</div>';
            }
        }

        function renderComments(comments) {
            if (comments.length === 0) {
                commentsList.innerHTML = '<div class="text-center text-muted py-4">Sei der Erste, der kommentiert!</div>';
                return;
            }

            commentsList.innerHTML = comments.map(c => `
                <div class="comment-item glass-panel p-3 mb-3" style="padding: 15px; margin-bottom: 15px; border: 1px solid rgba(255,255,255,0.05);">
                    <div class="flex justify-between items-start mb-2" style="display: flex; justify-content: space-between;">
                        <div class="flex items-center gap-2" style="display: flex; align-items: center; gap: 10px;">
                            <img src="${c.userAvatar || 'https://via.placeholder.com/32'}" class="rounded-full w-8 h-8" style="width: 32px; height: 32px; border-radius: 50%;">
                            <div>
                                <div class="font-bold text-sm text-cyan-400" style="color: var(--accent-cyan); font-weight: bold;">${c.userName}</div>
                                <div class="text-xs text-gray-500" style="font-size: 0.8rem; color: var(--text-muted);">${new Date(c.createdAt).toLocaleDateString()}</div>
                            </div>
                        </div>
                    </div>
                    <p class="text-gray-300 text-sm mt-2" style="color: #e2e8f0; margin-top: 8px; line-height: 1.5;">${c.text}</p>
                </div>
            `).join('');
        }
    }
    
    // Auth UI elements (optional - won't break if missing)
    const loginBtn = document.getElementById('login-btn');
    const userProfile = document.getElementById('user-profile');
    const userAvatar = document.getElementById('user-avatar');
    const userName = document.getElementById('user-name');
    const logoutBtn = document.getElementById('logout-btn');

    // Only set up auth if Firebase is available and elements exist
    if (auth && (loginBtn || userProfile)) {
        // Update UI based on auth state
        onAuthStateChanged(auth, (user) => {
            currentUser = user;

            // Toggle Member Upsell Teasers
            document.querySelectorAll('.member-upsell').forEach(el => {
                if (user) el.classList.add('hidden');
                else el.classList.remove('hidden');
            });

            if (user) {
                if (loginBtn) loginBtn.classList.add('hidden');
                if (userProfile) {
                    userProfile.classList.remove('hidden');
                    userProfile.style.display = 'flex';
                    if (userAvatar) userAvatar.src = user.photoURL || 'https://via.placeholder.com/32';
                    if (userName) userName.textContent = user.displayName || 'User';
                }

                // Handle other login buttons on the page (like in hero)
                document.querySelectorAll('.btn-secondary.small').forEach(btn => {
                    if (btn.textContent === 'Login') {
                        btn.textContent = 'Logout';
                        btn.onclick = () => signOut(auth);
                    }
                });

            } else {
                if (loginBtn) {
                    loginBtn.classList.remove('hidden');
                    loginBtn.onclick = handleLogin;
                }
                if (userProfile) {
                    userProfile.classList.add('hidden');
                    userProfile.style.display = 'none';
                }

                // Handle other login buttons
                document.querySelectorAll('.btn-secondary.small').forEach(btn => {
                    if (btn.textContent === 'Logout') {
                        btn.textContent = 'Login';
                        btn.onclick = handleLogin;
                    }
                });
            }
        });

        if (logoutBtn) {
            logoutBtn.onclick = () => signOut(auth);
        }
    }

    async function handleLogin() {
        if (!auth) return;
        try {
            await signInWithPopup(auth, googleProvider);
        } catch (error) {
            console.error("Login failed", error);
            alert("Login failed. Please try again.");
        }
    }

    // Caching Helpers
    const CACHE_KEYS = {
        HOME_DEALS: 'zentra_home_deals_v1',
        HOME_NEWS: 'zentra_home_news_v1'
    };

    function getFromCache(key) {
        try {
            const item = localStorage.getItem(key);
            if (!item) return null;

            const data = JSON.parse(item);
            const now = Date.now();

            if (now > data.expiry) {
                localStorage.removeItem(key);
                return null;
            }
            return data.value;
        } catch (e) {
            return null;
        }
    }

    function saveToCache(key, value, ttlMinutes = 60) {
        try {
            const now = Date.now();
            const item = {
                value: value,
                expiry: now + (ttlMinutes * 60 * 1000)
            };
            localStorage.setItem(key, JSON.stringify(item));
        } catch (e) {
            console.warn('Cache storage failed:', e);
        }
    }

    // Particle System removed (see assets/js/particles.js)


    // Number Counter Animation
    const stats = document.querySelectorAll('.stat-number');

    const observerOptions = {
        threshold: 0.5
    };

    const observer = new IntersectionObserver((entries) => {
        for (const entry of entries) {
            if (entry.isIntersecting) {
                const target = Number.parseInt(entry.target.dataset.target);
                animateValue(entry.target, 0, target, 2000);
                observer.unobserve(entry.target);
            }
        }
    }, observerOptions);

    for (const stat of stats) {
        observer.observe(stat);
    }

    function animateValue(obj, start, end, duration) {
        let startTimestamp = null;
        const step = (timestamp) => {
            if (!startTimestamp) startTimestamp = timestamp;
            const progress = Math.min((timestamp - startTimestamp) / duration, 1);
            obj.innerHTML = Math.floor(progress * (end - start) + start).toLocaleString();
            if (progress < 1) {
                globalThis.requestAnimationFrame(step);
            }
        };
        globalThis.requestAnimationFrame(step);
    }

    // Init
    resize();

    // Loading logic moved to bottom to wait for content


    globalThis.addEventListener('resize', () => {
        resize();
        // initParticles() removed - handled by particles.js
    });

    // Custom Cursor Logic
    const cursorDot = document.querySelector('.cursor-dot');
    const cursorOutline = document.querySelector('.cursor-outline');

    if (cursorDot && cursorOutline) {
        // Mouse movement
        globalThis.addEventListener('mousemove', (e) => {
            const posX = e.clientX;
            const posY = e.clientY;

            // Dot follows instantly
            cursorDot.style.left = `${posX}px`;
            cursorDot.style.top = `${posY}px`;

            // Outline follows with a slight delay (using animate for smoothness)
            cursorOutline.animate({
                left: `${posX}px`,
                top: `${posY}px`
            }, { duration: 500, fill: "forwards" });
        });

        // Hover effects
        const interactiveElements = document.querySelectorAll('a, button, .chip, .tech-card, .news-tile, input');

        for (const el of interactiveElements) {
            el.addEventListener('mouseenter', () => {
                document.body.classList.add('hovering');
            });

            el.addEventListener('mouseleave', () => {
                document.body.classList.remove('hovering');
            });
        }
    }

    // Signal Button Interaction
    const signalBtns = document.querySelectorAll('.signal-btn');

    for (const btn of signalBtns) {
        btn.addEventListener('click', function () {
            this.classList.toggle('active');
            const countSpan = this.querySelector('.signal-count');
            let count = Number.parseInt(countSpan.innerText);

            if (this.classList.contains('active')) {
                count++;
                this.style.borderColor = 'var(--accent-cyan)';
                this.style.color = 'var(--accent-cyan)';
                this.style.background = 'rgba(204, 255, 0, 0.1)';
            } else {
                count--;
                this.style.borderColor = '';
                this.style.color = '';
                this.style.background = '';
            }

            countSpan.innerText = count + ' Signal';
        });
    }

    // Filter Buttons Interaction (Community Page)
    const filterBtns = document.querySelectorAll('.filter-btn');

    for (const btn of filterBtns) {
        btn.addEventListener('click', function () {
            // Remove active class from all siblings
            const siblings = this.parentElement.children;
            for (const sibling of siblings) {
                sibling.classList.remove('active');
            }
            // Add active class to clicked button
            this.classList.add('active');
        });
    }

    // Initialize 3D Tilt Effect
    initTiltEffect();

    // Initialize Countdown Timer
    initCountdownTimer();

    // Initialize Live Activity Ticker
    if (globalThis.location.pathname.includes('deals.html') || globalThis.location.pathname.includes('news.html')) {
        initLiveActivity();
    }

    // Load Deals from CSV
    let allDeals = [];

    // Orchestrate Loading
    const loadingScreen = document.getElementById('loading-screen');
    const loadPromises = [];

    // Minimum branding time (800ms)
    const minLoadTime = new Promise(resolve => setTimeout(resolve, 800));
    loadPromises.push(minLoadTime);

    // if (globalThis.location.pathname.includes('deals.html')) {
    //    loadPromises.push(loadDeals());
    // }

    // News is now static, no need to load dynamically
    // if (globalThis.location.pathname.includes('news.html')) {
    //    loadPromises.push(loadNews());
    // }

    if (globalThis.location.pathname.includes('community.html')) {
        loadPromises.push(loadCommunityFeed());
    }

    // Add Home Page loaders
    if (document.getElementById('home-news-container')) {
        loadPromises.push(loadHomeNews());
    }

    if (document.getElementById('home-deals-container')) {
        loadPromises.push(loadHomeDeals());
    }

    Promise.allSettled(loadPromises).then(() => {
        if (loadingScreen) {
            loadingScreen.classList.add('hidden');
            // Start heavy animations after loader is gone
            setTimeout(() => {
                initParticles();
                animate();
            }, 100);
        } else {
            initParticles();
            animate();
        }
    });

    // Email Signup
    const ctaForm = document.querySelector('.cta-form');
    if (ctaForm) {
        ctaForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const emailInput = ctaForm.querySelector('input[type="email"]');
            const email = emailInput.value;
            const btn = ctaForm.querySelector('button');

            if (!email) return;

            const originalText = btn.textContent;
            btn.textContent = 'Subscribing...';
            btn.disabled = true;

            try {
                await addDoc(collection(db, "newsletter_subscribers"), {
                    email: email,
                    timestamp: new Date(),
                    source: 'homepage_cta'
                });

                btn.textContent = 'Subscribed!';
                btn.style.background = 'var(--accent-blue)';
                emailInput.value = '';

                setTimeout(() => {
                    btn.textContent = originalText;
                    btn.disabled = false;
                    btn.style.background = '';
                }, 3000);

            } catch (error) {
                console.error("Error subscribing:", error);
                btn.textContent = 'Error';
                setTimeout(() => {
                    btn.textContent = originalText;
                    btn.disabled = false;
                }, 3000);
            }
        });
    }

    function initTiltEffect() {
        // Disable tilt on news page as requested
        if (globalThis.location.pathname.includes('news.html')) return;

        const cards = document.querySelectorAll('.tech-card, .news-tile, .thread-card, .featured-deal, .testimonial-card, .glass-panel');

        for (const card of cards) {
            // Skip if already initialized or is nav/hero
            if (card.classList.contains('tilt-initialized') ||
                card.classList.contains('nav-bar') ||
                card.classList.contains('hero-content') ||
                card.closest('.nav-bar')) continue;

            card.classList.add('tilt-card', 'tilt-initialized');

            card.addEventListener('mousemove', (e) => {
                const rect = card.getBoundingClientRect();
                const x = e.clientX - rect.left;
                const y = e.clientY - rect.top;

                const centerX = rect.width / 2;
                const centerY = rect.height / 2;

                const rotateX = ((y - centerY) / centerY) * -10; // Max 10deg rotation
                const rotateY = ((x - centerX) / centerX) * 10;

                card.style.transform = `perspective(1000px) rotateX(${rotateX}deg) rotateY(${rotateY}deg) scale3d(1.02, 1.02, 1.02)`;
                card.classList.remove('reset');
            });

            card.addEventListener('mouseleave', () => {
                card.style.transform = 'perspective(1000px) rotateX(0) rotateY(0) scale3d(1, 1, 1)';
                card.classList.add('reset');
            });
        }
    }

    // Load News - Legacy function removed in favor of Static Site Generation
    async function loadNews() {
        console.log('News is now statically generated.');
    }

    async function loadHomeNews() {
        const container = document.getElementById('home-news-container');

        try {
            const res = await fetch("assets/data/news.json");
            const list = await res.json();

            container.innerHTML = '';

            if (list.length === 0) {
                container.innerHTML = '<div style="grid-column: 1/-1; text-align: center;">Unable to load latest news.</div>';
                return;
            }

            list.forEach((item, index) => {
                const card = document.createElement('div');
                card.className = 'news-tile glass-panel';
                // Add staggered animation delay
                card.style.animation = `fadeInUp 0.5s ease forwards ${index * 0.2}s`;
                card.style.opacity = '0'; // Start hidden for animation

                // Clean description
                const tempDiv = document.createElement('div');
                tempDiv.innerHTML = item.description || '';
                const imgs = tempDiv.getElementsByTagName('img');
                while (imgs.length > 0) imgs[0].parentNode.removeChild(imgs[0]);
                const textDesc = tempDiv.textContent || tempDiv.innerText || '';
                const shortDesc = textDesc.substring(0, 100) + '...';

                card.innerHTML = `
                    ${item.image ? `<div class="news-thumb" style="background-image: url('${item.image}'); height: 160px; background-size: cover; background-position: center;"></div>` : ''}
                    <div class="news-content" style="padding: 20px;">
                        <span class="news-cat" style="color: var(--accent-cyan); font-size: 0.75rem; text-transform: uppercase;">${item.source || 'Tech News'}</span>
                        <h3 style="margin: 10px 0; font-size: 1.1rem;"><a href="${item.link}" style="color: white; text-decoration: none;">${item.title}</a></h3>
                        <p style="font-size: 0.9rem; color: var(--text-muted);">${shortDesc}</p>
                        <a href="${item.link}" class="read-more" style="display: inline-block; margin-top: 15px; color: var(--accent-cyan); text-decoration: none; font-size: 0.9rem;">Read More →</a>
                    </div>
                `;
                container.appendChild(card);
            });

            // Initialize tilt for these new cards
            initTiltEffect();

        } catch (error) {
            console.error('Error loading home news:', error);
            container.innerHTML = '<div style="grid-column: 1/-1; text-align: center;">Failed to load news.</div>';
        }
    }

    async function loadHomeDeals() {
        const container = document.getElementById('home-deals-container');

        const render = (displayDeals, totalProducts, totalPremium) => {
            // Update Stats with Real Data
            const productStat = document.getElementById('stat-products');
            const dealStat = document.getElementById('stat-deals');

            if (productStat) {
                productStat.dataset.target = totalProducts;
                animateValue(productStat, 0, totalProducts, 2000);
            }

            if (dealStat) {
                dealStat.dataset.target = totalPremium;
                animateValue(dealStat, 0, totalPremium, 2000);
            }

            if (displayDeals.length === 0) {
                container.innerHTML = '<div style="text-align: center;">No tech deals found.</div>';
                return;
            }

            // Create Carousel Structure
            container.innerHTML = '<div class="carousel"></div>';
            const carousel = container.querySelector('.carousel');

            const count = displayDeals.length;
            // Increased radius for better spacing
            const radius = Math.round((320 / 2) / Math.tan(Math.PI / count)) + 80;

            displayDeals.forEach((deal, index) => {
                const item = document.createElement('div');
                item.className = 'carousel-item';

                // Store base angle
                const angle = (360 / count) * index;
                item.dataset.angle = angle;

                // Clean price
                const price = deal.price.replace(' EUR', '');
                const gradientClass = index % 3 === 0 ? 'gradient-1' : index % 3 === 1 ? 'gradient-2' : 'gradient-3';

                item.innerHTML = `
                    <div class="tech-card" style="height: 400px; transform-style: preserve-3d;">
                        <div class="card-image-placeholder ${gradientClass}" style="background-image: url('${deal.image}'); height: 200px; background-size: contain; background-repeat: no-repeat; background-position: center; background-color: #000;"></div>
                        <div class="card-content glass-inner" style="height: 200px; display: flex; flex-direction: column; justify-content: space-between;">
                            <div>
                                <h3 style="font-size: 1.1rem; margin-bottom: 5px;">${deal.title.substring(0, 40)}...</h3>
                                <div class="card-meta">
                                    <span class="price" style="font-size: 1.2rem;">€${price}</span>
                                    <span class="tag">${deal.category.split('>').pop().trim().substring(0, 15)}</span>
                                </div>
                            </div>
                            <a href="${deal.link}" target="_blank" class="btn-secondary small full-width">View Deal</a>
                        </div>
                    </div>
                `;
                carousel.appendChild(item);
            });

            // --- Interactive Rotation Logic ---
            let currentAngle = 0;
            let isDragging = false;
            let startX = 0;
            let startAngle = 0;
            let autoRotateSpeed = 0.15; // Slower, smoother auto-rotation
            let lastTime = 0;
            let animationId;

            // Progress Bar Elements
            const progressBar = document.getElementById('progress-indicator');
            const progressContainer = document.getElementById('carousel-progress');

            // Initial update
            updateCarousel();

            // --- Scene Drag Events ---
            container.addEventListener('mousedown', (e) => {
                isDragging = true;
                autoRotateSpeed = 0;
                startX = e.pageX;
                startAngle = currentAngle;
                container.style.cursor = 'grabbing';
                document.body.classList.add('no-select'); // Prevent text selection
            });

            globalThis.addEventListener('mousemove', (e) => {
                if (!isDragging) return;
                e.preventDefault(); // Critical for preventing selection
                const x = e.pageX;
                const diff = x - startX;
                currentAngle = startAngle - (diff * 0.3);
                updateCarousel();
            });

            globalThis.addEventListener('mouseup', () => {
                if (isDragging) {
                    isDragging = false;
                    container.style.cursor = 'grab';
                    document.body.classList.remove('no-select');
                }
            });

            // --- Progress Bar Drag Events ---
            if (progressContainer) {
                let isBarDragging = false;
                let barStartX = 0;
                let barStartAngle = 0;

                progressContainer.addEventListener('mousedown', (e) => {
                    isBarDragging = true;
                    autoRotateSpeed = 0;
                    barStartX = e.pageX;
                    barStartAngle = currentAngle;
                    progressContainer.style.cursor = 'grabbing';
                    document.body.classList.add('no-select');
                });

                globalThis.addEventListener('mousemove', (e) => {
                    if (!isBarDragging) return;
                    e.preventDefault();
                    const x = e.pageX;
                    const diff = x - barStartX;
                    // Invert direction for bar drag to feel natural (slide right -> rotate right)
                    currentAngle = barStartAngle + (diff * 0.5);
                    updateCarousel();
                });

                globalThis.addEventListener('mouseup', () => {
                    if (isBarDragging) {
                        isBarDragging = false;
                        progressContainer.style.cursor = 'grab';
                        document.body.classList.remove('no-select');
                    }
                });
            }

            // Touch Events (Unified)
            const handleTouchStart = (e) => {
                isDragging = true;
                autoRotateSpeed = 0;
                startX = e.touches[0].pageX;
                startAngle = currentAngle;
            };

            const handleTouchMove = (e) => {
                if (!isDragging) return;
                e.preventDefault();
                const x = e.touches[0].pageX;
                const diff = x - startX;
                currentAngle = startAngle - (diff * 0.3);
                updateCarousel();
            };

            container.addEventListener('touchstart', handleTouchStart, { passive: false });
            globalThis.addEventListener('touchmove', handleTouchMove, { passive: false });
            globalThis.addEventListener('touchend', () => { isDragging = false; });

            // Hover Control
            container.addEventListener('mouseenter', () => {
                if (!isDragging) autoRotateSpeed = 0; // Pause on hover
            });

            container.addEventListener('mouseleave', () => {
                if (!isDragging) autoRotateSpeed = 0.15; // Resume on leave
            });

            // Connect External Controls
            const leftBtn = document.getElementById('rotate-left');
            const rightBtn = document.getElementById('rotate-right');
            const anglePerItem = 360 / count;

            if (leftBtn) {
                leftBtn.addEventListener('click', () => {
                    autoRotateSpeed = 0; // Stop auto-rotate
                    // Round to nearest item angle
                    const targetAngle = Math.round((currentAngle + anglePerItem) / anglePerItem) * anglePerItem;
                    animateToAngle(targetAngle);
                });
            }

            if (rightBtn) {
                rightBtn.addEventListener('click', () => {
                    autoRotateSpeed = 0; // Stop auto-rotate
                    const targetAngle = Math.round((currentAngle - anglePerItem) / anglePerItem) * anglePerItem;
                    animateToAngle(targetAngle);
                });
            }

            function animateToAngle(target) {
                const start = currentAngle;
                const change = target - start;
                const duration = 500;
                let startTime = null;

                function step(timestamp) {
                    if (!startTime) startTime = timestamp;
                    const progress = Math.min((timestamp - startTime) / duration, 1);

                    // Ease Out Cubic
                    const ease = 1 - Math.pow(1 - progress, 3);

                    currentAngle = start + (change * ease);
                    updateCarousel();

                    if (progress < 1) {
                        requestAnimationFrame(step);
                    } else {
                        // Resume slow rotation after interaction
                        setTimeout(() => { autoRotateSpeed = 0.15; }, 2000);
                    }
                }
                requestAnimationFrame(step);
            }

            function updateCarousel() {
                carousel.style.transform = `rotateY(${currentAngle}deg)`;

                // Update Progress Bar
                if (progressBar) {
                    // Normalize angle to 0-360
                    let normalizedAngle = (currentAngle % 360);
                    if (normalizedAngle < 0) normalizedAngle += 360;

                    // Map 0-360 to 0-80% (since bar is 20% width)
                    const percentage = (normalizedAngle / 360) * 80;
                    progressBar.style.left = `${percentage}%`;
                }

                const items = carousel.querySelectorAll('.carousel-item');
                items.forEach(item => {
                    const itemAngle = parseFloat(item.dataset.angle);

                    // Calculate absolute rotation in world space (0-360)
                    let totalAngle = (currentAngle + itemAngle) % 360;
                    if (totalAngle < 0) totalAngle += 360;

                    // Position item
                    item.style.transform = `rotateY(${itemAngle}deg) translateZ(${radius}px)`;

                    // Lighting & Depth Effect
                    // Calculate distance from "front" (0 degrees or 360 degrees)
                    let distanceFromFront = Math.min(
                        Math.abs(totalAngle - 0),
                        Math.abs(totalAngle - 360)
                    );

                    // Map distance (0 to 180) to Opacity/Brightness
                    // 0 deg (front) -> 1.0 opacity, 1.0 brightness
                    // 180 deg (back) -> 0.3 opacity, 0.5 brightness

                    const brightness = 1 - (distanceFromFront / 180) * 0.6;
                    const opacity = 1 - (distanceFromFront / 180) * 0.7;

                    const card = item.querySelector('.tech-card');
                    if (card) {
                        card.style.filter = `brightness(${brightness})`;
                        card.style.opacity = Math.max(0.3, opacity); // Min opacity 0.3

                        // Disable interaction for items in the back
                        if (distanceFromFront > 100) {
                            card.style.pointerEvents = 'none';
                        } else {
                            card.style.pointerEvents = 'auto';
                        }
                    }
                });
            }

            function animateLoop(time) {
                if (!lastTime) lastTime = time;
                const delta = time - lastTime;
                lastTime = time;

                if (!isDragging && autoRotateSpeed !== 0) {
                    currentAngle -= autoRotateSpeed * (delta / 16);
                    updateCarousel();
                }

                animationId = requestAnimationFrame(animateLoop);
            }

            animationId = requestAnimationFrame(animateLoop);
        };

        // Try Cache First
        const cached = getFromCache(CACHE_KEYS.HOME_DEALS);
        if (cached) {
            render(cached.deals, cached.stats.totalProducts, cached.stats.totalPremium);
            return;
        }

        try {
            // Load Deals from Static JSON (No CSV)
            const response = await fetch('/assets/data/deals.json');
            const displayDeals = await response.json();

            const cacheData = {
                deals: displayDeals,
                stats: {
                    totalProducts: 50000, // Static count
                    totalPremium: 5000
                }
            };
            saveToCache(CACHE_KEYS.HOME_DEALS, cacheData, 60); // 1 hour

            render(displayDeals, 50000, 5000);

        } catch (error) {
            console.error('Error loading home deals:', error);
            container.innerHTML = '<div style="grid-column: 1/-1; text-align: center;">Failed to load deals.</div>';
        }
    }








    function initCountdownTimer() {
        const timerElements = document.querySelectorAll('.timer');

        timerElements.forEach(timer => {
            // Set a random end time (e.g., 4-12 hours from now)
            const hours = Math.floor(Math.random() * 8) + 4;
            const endTime = new Date();
            endTime.setHours(endTime.getHours() + hours);

            function updateTimer() {
                const now = new Date();
                const diff = endTime - now;

                if (diff <= 0) {
                    timer.textContent = "Expired";
                    return;
                }

                const h = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
                const m = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
                const s = Math.floor((diff % (1000 * 60)) / 1000);

                timer.textContent = `Ends in ${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
            }

            updateTimer(); // Initial call
            setInterval(updateTimer, 1000);
        });
    }

    function initLiveActivity() {
        // Create Ticker Container
        const ticker = document.createElement('div');
        ticker.className = 'live-activity-ticker glass-panel';
        ticker.style.cssText = `
            position: fixed;
            bottom: 20px;
            right: 20px;
            padding: 12px 20px;
            display: flex;
            align-items: center;
            gap: 12px;
            z-index: 100;
            transform: translateY(150px);
            transition: transform 0.5s cubic-bezier(0.175, 0.885, 0.32, 1.275);
            max-width: 320px;
            border-left: 3px solid var(--accent-cyan);
            box-shadow: 0 10px 30px rgba(0,0,0,0.5);
            pointer-events: none;
        `;
        document.body.appendChild(ticker);

        const isNews = globalThis.location.pathname.includes('news.html');

        // Realistic Data Pools
        const users = ['Alex_92', 'Sarah.Tech', 'JonasM', 'DevOps_King', 'CryptoFan', 'Lisa_W', 'TechGuru88', 'Markus_B', 'Anna.K', 'PixelMaster', 'Web3_User', 'Gamer_Pro'];
        const cities = ['Berlin', 'Munich', 'Hamburg', 'London', 'Amsterdam', 'Vienna', 'Zurich', 'Frankfurt', 'Paris', 'Stockholm'];
        const comments = [
            "This is huge news!", "Can't wait to see this.", "Totally agree.", "Interesting perspective.",
            "Does this affect the market?", "Finally!", "I was waiting for this update.", "Great article.",
            "Not sure about this.", "Big if true.", "Anyone tested this yet?", "Amazing tech."
        ];

        function simulateInteraction() {
            const user = users[Math.floor(Math.random() * users.length)];

            if (isNews) {
                // Find all news cards
                const cards = document.querySelectorAll('.news-tile');
                if (cards.length === 0) return;

                // Pick random card
                const card = cards[Math.floor(Math.random() * cards.length)];
                const titleLink = card.querySelector('h3 a');
                const title = titleLink ? titleLink.textContent : 'Tech News';

                // 50/50 Like or Comment
                if (Math.random() > 0.5) {
                    // LIKE
                    const likeBtn = card.querySelector('.like-btn');
                    const countSpan = likeBtn.querySelector('.like-count');
                    if (countSpan) {
                        let current = parseInt(countSpan.textContent);
                        countSpan.textContent = current + 1;

                        // Flash effect
                        likeBtn.style.color = 'var(--accent-cyan)';
                        likeBtn.style.transform = 'scale(1.2)';
                        setTimeout(() => {
                            likeBtn.style.color = '';
                            likeBtn.style.transform = '';
                        }, 500);

                        showTicker(`❤️ <b>${user}</b> liked "${title.substring(0, 30)}..."`);
                    }
                } else {
                    // COMMENT
                    const commentList = card.querySelector('.comments-list');
                    const commentText = comments[Math.floor(Math.random() * comments.length)];

                    if (commentList) {
                        const div = document.createElement('div');
                        div.className = 'comment-item';
                        div.style.animation = 'fadeIn 0.5s';
                        div.innerHTML = `<strong>${user}:</strong> ${commentText}`;

                        // Insert at top
                        if (commentList.firstChild) {
                            commentList.insertBefore(div, commentList.firstChild);
                        } else {
                            commentList.appendChild(div);
                        }

                        // If comments are hidden, maybe flash the comment button?
                        const commentBtn = card.querySelector('.comment-toggle-btn');
                        if (commentBtn) {
                            commentBtn.style.color = 'var(--accent-cyan)';
                            setTimeout(() => commentBtn.style.color = '', 500);
                        }

                        showTicker(`💬 <b>${user}</b> commented: "${commentText}"`);
                    }
                }

            } else {
                // Deals Logic
                if (typeof allDeals !== 'undefined' && allDeals.length > 0) {
                    const deal = allDeals[Math.floor(Math.random() * allDeals.length)];
                    const city = cities[Math.floor(Math.random() * cities.length)];
                    const action = Math.random() > 0.5 ? 'purchased' : 'viewed';

                    if (action === 'purchased') {
                        showTicker(`🛒 <b>${user}</b> from ${city} bought "${deal.title.substring(0, 30)}..."`);
                    } else {
                        showTicker(`👁️ <b>${user}</b> is looking at "${deal.title.substring(0, 30)}..."`);
                    }
                }
            }

            // Schedule next activity (random 5-12 seconds)
            const nextDelay = Math.random() * 7000 + 5000;
            setTimeout(simulateInteraction, nextDelay);
        }

        function showTicker(html) {
            ticker.innerHTML = `
                <div class="pulse-dot" style="background: var(--accent-cyan); width: 8px; height: 8px; border-radius: 50%; box-shadow: 0 0 10px var(--accent-cyan); flex-shrink: 0;"></div>
                <span style="font-size: 0.85rem; color: #eee; line-height: 1.4;">${html}</span>
            `;

            // Slide in
            ticker.style.transform = 'translateY(0)';

            // Slide out after 5 seconds
            setTimeout(() => {
                ticker.style.transform = 'translateY(150px)';
            }, 5000);
        }

        // Start after a delay to let content load
        setTimeout(simulateInteraction, 3000);
    }

    // Load Community Feed
    async function loadCommunityFeed() {
        const container = document.getElementById('community-feed');
        if (!container) return;

        // Default "Seed" Data (if DB is empty)
        const defaultPosts = [
            {
                author: "Elena_Ops",
                role: "Systems Architect",
                avatar: "https://i.pravatar.cc/150?img=5",
                verified: true,
                time: "2h ago",
                title: "Optimizing LLM Inference on Consumer Hardware",
                content: "I've been testing the new quantization methods on the 4090. The token/s improvement is significant if you tweak the memory layering...",
                tags: ["#AI-Hardware", "#Optimization"],
                signals: 482,
                comments: 42
            },
            {
                author: "Crypto_Vanguard",
                role: "DeFi Analyst",
                avatar: "https://i.pravatar.cc/150?img=11",
                verified: true,
                time: "4h ago",
                title: "Layer 2 Scaling: The 2025 Outlook",
                content: "With the new zkEVM rollups going live, we're seeing a shift in gas fee dynamics. Here is my analysis of the top 3 contenders...",
                tags: ["#Ethereum", "#L2", "#Market-Alpha"],
                signals: 315,
                comments: 28
            }
        ];

        try {
            const postsRef = collection(db, "community_posts");
            const q = query(postsRef, orderBy("timestamp", "desc"), limit(20));
            const snapshot = await getDocs(q);

            let posts = [];

            if (snapshot.empty) {
                // Seed the database
                console.log("Seeding community posts...");
                for (const post of defaultPosts) {
                    await addDoc(postsRef, {
                        ...post,
                        timestamp: new Date()
                    });
                    posts.push(post);
                }
            } else {
                snapshot.forEach(doc => {
                    posts.push({ id: doc.id, ...doc.data() });
                });
            }

            renderCommunityPosts(posts);

        } catch (error) {
            console.error("Error loading community feed:", error);
            // Fallback to default if offline/error
            renderCommunityPosts(defaultPosts);
        }

        function renderCommunityPosts(posts) {
            container.innerHTML = '';

            posts.forEach(post => {
                const card = document.createElement('div');
                card.className = 'thread-card glass-panel';

                const tagsHtml = (post.tags || []).map(tag => `<span class="tag">${tag}</span>`).join('');

                card.innerHTML = `
                    <div class="thread-header">
                        <div class="author-info">
                            <img src="${post.avatar || 'https://via.placeholder.com/48'}" class="hex-avatar" alt="${post.author}">
                            <div class="author-details">
                                <span class="author-name">${post.author} ${post.verified ? '<span class="verified-badge">✓</span>' : ''}</span>
                                <span class="author-role">${post.role || 'Member'}</span>
                            </div>
                        </div>
                        <span class="thread-time">${post.time || 'Just now'}</span>
                    </div>
                    <div class="thread-content">
                        <h3>${post.title}</h3>
                        <p>${post.content}</p>
                        <div class="thread-tags">
                            ${tagsHtml}
                        </div>
                    </div>
                    <div class="thread-footer">
                        <button class="signal-btn">
                            <span class="signal-icon">📶</span>
                            <span class="signal-count">${post.signals || 0} Signal</span>
                        </button>
                        <button class="comment-btn">
                            <span>💬</span> ${post.comments || 0} Comments
                        </button>
                    </div>
                `;
                container.appendChild(card);
            });

            // Append the "Blurred Teaser" (Upsell)
            const teaser = document.createElement('div');
            teaser.className = 'thread-card glass-panel blur-teaser member-upsell';

            // Check both the local variable and the direct auth object
            if (currentUser || auth.currentUser) {
                teaser.classList.add('hidden');
            }

            teaser.innerHTML = `
                <div class="thread-header">
                    <div class="author-info">
                        <img src="https://i.pravatar.cc/150?img=33" class="hex-avatar" alt="Hardware_Guru">
                        <div class="author-details">
                            <span class="author-name">Hardware_Guru</span>
                        </div>
                    </div>
                </div>
                <div class="thread-content">
                    <h3>[Private] Early Benchmarks for Next-Gen CPUs</h3>
                    <p>Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed do eiusmod tempor incididunt ut labore et dolore magna aliqua...</p>
                </div>
                
                <div class="gate-overlay">
                    <h3>Join Zentra to unlock full access</h3>
                    <button id="become-member-btn" class="btn-primary">Become a Member</button>
                </div>
            `;
            container.appendChild(teaser);

            // Attach listener to the new button
            const memberBtn = document.getElementById('become-member-btn');
            if (memberBtn) {
                memberBtn.addEventListener('click', handleLogin);
            }

            // Re-init tilt
            initTiltEffect();

            // Final safety check: Ensure all upsells are hidden if user is logged in
            // This handles the race condition where auth loads before this element exists
            if (currentUser || auth.currentUser) {
                document.querySelectorAll('.member-upsell').forEach(el => el.classList.add('hidden'));
            }
        }
    }
});