/**
 * modules/listings.js
 * Handles fetching, creating, and rendering listing data.
 */

import { db, auth, storage, collection, addDoc, getDocs, query, orderBy, limit, ref, uploadBytes, getDownloadURL } from '../../firebase-config.js';

// --- FEEDS & RENDERING ---

export async function initListings(container) {
    if (!container) return;

    container.innerHTML = '<div class="col-span-full text-center py-10"><div class="loading-spinner"></div> Loading Market...</div>';

    try {
        const q = query(collection(db, 'listings'), orderBy('createdAt', 'desc'), limit(50));
        const snapshot = await getDocs(q);

        const listings = [];
        snapshot.forEach(doc => {
            listings.push({ id: doc.id, ...doc.data() });
        });

        renderGrid(listings, container);

    } catch (error) {
        console.error("Error fetching listings:", error);
        container.innerHTML = '<div class="col-span-full text-center text-red-400">Error loading listings. <br> <small class="text-gray-500">' + error.message + '</small></div>';
    }
}

function renderGrid(listings, container) {
    if (listings.length === 0) {
        container.innerHTML = '<div class="col-span-full text-center text-gray-500">No active listings found. Be the first to sell!</div>';
        return;
    }

    container.innerHTML = listings.map(item => `
        <a href="/community/market/${item.id}" class="market-card glass-panel group block hover:no-underline transition-transform hover:-translate-y-1">
            <div class="relative aspect-video overflow-hidden rounded-t-lg bg-gray-800">
                <img src="${item.images && item.images.length > 0 ? item.images[0] : '/assets/images/product-placeholder.png'}" alt="${item.title}" class="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110">
                <div class="absolute top-2 right-2">
                    <span class="badge ${getConditionColor(item.condition)} text-xs font-bold px-2 py-1 rounded shadow-lg">
                        ${item.condition}
                    </span>
                </div>
            </div>
            
            <div class="p-4">
                <div class="flex justify-between items-start mb-2">
                    <h3 class="text-white font-medium text-lg leading-tight line-clamp-2 h-12">${item.title}</h3>
                </div>
                
                <div class="flex justify-between items-end mt-4">
                    <div class="price text-accent-cyan font-bold text-xl">
                        ${formatPrice(item.price)}
                    </div>
                    <div class="text-xs text-gray-400 flex items-center gap-1">
                         <span class="text-green-400">✓</span>
                        ${item.sellerName}
                    </div>
                </div>
            </div>
        </a>
    `).join('');
}

export async function getListingById(id) {
    if (!id) return null;
    try {
        const docRef = doc(db, "listings", id);
        const docSnap = await getDoc(docRef);

        if (docSnap.exists()) {
            return { id: docSnap.id, ...docSnap.data() };
        } else {
            console.log("No such listing!");
            return null;
        }
    } catch (error) {
        console.error("Error getting listing:", error);
        return null;
    }
}

// --- CREATION WIZARD ---

export function setupWizard(form) {
    if (!form) return;

    let currentStep = 1;
    const totalSteps = 3;
    const uploadedImages = []; // Stores Files

    // Elements
    const nextBtn = document.getElementById('next-btn');
    const prevBtn = document.getElementById('prev-btn');
    const submitBtn = document.getElementById('submit-btn');
    const stepIndicator = document.getElementById('wizard-step-num');

    // Steps
    const step1 = document.getElementById('step-1');
    const step2 = document.getElementById('step-2');
    const step3 = document.getElementById('step-3');

    // Navigation Logic
    function showStep(step) {
        // Hide all
        step1.classList.add('hidden');
        step2.classList.add('hidden');
        step3.classList.add('hidden');

        // Show current
        if (step === 1) step1.classList.remove('hidden');
        if (step === 2) step2.classList.remove('hidden');
        if (step === 3) step3.classList.remove('hidden');

        // Update Buttons
        if (step === 1) {
            prevBtn.classList.add('hidden');
        } else {
            prevBtn.classList.remove('hidden');
        }

        if (step === totalSteps) {
            nextBtn.classList.add('hidden');
            submitBtn.classList.remove('hidden');
        } else {
            nextBtn.classList.remove('hidden');
            submitBtn.classList.add('hidden');
        }

        stepIndicator.textContent = step;
        currentStep = step;
    }

    nextBtn.addEventListener('click', () => {
        if (currentStep < totalSteps) {
            if (validateStep(currentStep)) {
                showStep(currentStep + 1);
            }
        }
    });

    prevBtn.addEventListener('click', () => {
        if (currentStep > 1) {
            showStep(currentStep - 1);
        }
    });

    // Validation
    function validateStep(step) {
        const inputs = document.getElementById(`step-${step}`).querySelectorAll('input[required], textarea[required], select[required]');
        for (const input of inputs) {
            if (!input.value.trim()) {
                input.focus();
                input.classList.add('border-red-500');
                return false;
            }
            input.classList.remove('border-red-500');
        }
        return true;
    }

    // Step 2: Image Logic
    const dropZone = document.getElementById('drop-zone');
    const fileInput = document.getElementById('file-input');
    const previewGrid = document.getElementById('image-preview-grid');

    dropZone.addEventListener('click', () => fileInput.click());

    dropZone.addEventListener('dragover', (e) => {
        e.preventDefault();
        dropZone.classList.add('border-cyan-400');
    });

    dropZone.addEventListener('dragleave', () => {
        dropZone.classList.remove('border-cyan-400');
    });

    dropZone.addEventListener('drop', (e) => {
        e.preventDefault();
        dropZone.classList.remove('border-cyan-400');
        handleFiles(e.dataTransfer.files);
    });

    fileInput.addEventListener('change', () => {
        handleFiles(fileInput.files);
    });

    function handleFiles(files) {
        if (uploadedImages.length + files.length > 3) {
            alert('Max 3 images allowed.');
            return;
        }

        for (const file of files) {
            if (!file.type.startsWith('image/')) continue;

            uploadedImages.push(file);

            // Render Preview
            const reader = new FileReader();
            reader.onload = (e) => {
                const div = document.createElement('div');
                div.className = 'relative aspect-square bg-gray-800 rounded overflow-hidden group';
                div.innerHTML = `
                    <img src="${e.target.result}" class="w-full h-full object-cover">
                    <button type="button" class="absolute top-1 right-1 bg-red-500 text-white rounded-full w-6 h-6 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">×</button>
                `;

                // Remove Logic
                div.querySelector('button').addEventListener('click', () => {
                    const idx = uploadedImages.indexOf(file);
                    if (idx > -1) uploadedImages.splice(idx, 1);
                    div.remove();
                });

                previewGrid.appendChild(div);
            };
            reader.readAsDataURL(file);
        }
    }

    // Step 3: Calculation Logic
    const priceInput = form.querySelector('input[name="price"]');
    const sumPrice = document.getElementById('summary-price');
    const sumFee = document.getElementById('summary-fee');
    const sumTotal = document.getElementById('summary-total');

    function updateCalc() {
        const price = parseFloat(priceInput.value) || 0;
        const fee = Math.max(1, price * 0.06); // Min 1 EUR, else 6%
        const total = Math.max(0, price - fee);

        sumPrice.textContent = formatPrice(price * 100);
        sumFee.textContent = '-' + formatPrice(fee * 100);
        sumTotal.textContent = formatPrice(total * 100);
    }

    priceInput.addEventListener('input', updateCalc);

    // SUBMIT
    form.addEventListener('submit', async (e) => {
        e.preventDefault();

        if (!auth.currentUser) {
            alert('You must be logged in to sell.');
            return;
        }

        submitBtn.disabled = true;
        submitBtn.textContent = 'Uploading...';

        try {
            // 1. Upload Images
            const imageUrls = [];
            for (const file of uploadedImages) {
                const storageRef = ref(storage, `listings/${auth.currentUser.uid}/${Date.now()}_${file.name}`);
                await uploadBytes(storageRef, file);
                const url = await getDownloadURL(storageRef);
                imageUrls.push(url);
            }

            // 2. Create Doc
            const formData = new FormData(form);
            const priceCents = Math.round(parseFloat(formData.get('price')) * 100);

            const docData = {
                title: formData.get('title'),
                description: formData.get('description'),
                category: formData.get('category'),
                condition: formData.get('condition'),
                price: priceCents,
                currency: 'EUR',
                images: imageUrls,
                sellerId: auth.currentUser.uid,
                sellerName: auth.currentUser.displayName || 'Anonymous',
                sellerAvatar: auth.currentUser.photoURL,
                status: 'active',
                createdAt: new Date().toISOString()
            };

            await addDoc(collection(db, 'listings'), docData);

            alert('Listing created successfully!');
            // Redirect to feed
            window.location.href = '/community/market';

        } catch (error) {
            console.error('Error creating listing:', error);
            alert('Error: ' + error.message);
            submitBtn.disabled = false;
            submitBtn.textContent = 'Post Listing';
        }
    });
}

function formatPrice(cents) {
    return new Intl.NumberFormat('de-DE', { style: 'currency', currency: 'EUR' }).format(cents / 100);
}

function getConditionColor(condition) {
    if (condition.includes('New')) return 'bg-cyan-500 text-black';
    if (condition.includes('Open')) return 'bg-purple-500 text-white';
    return 'bg-gray-600 text-gray-200';
}
