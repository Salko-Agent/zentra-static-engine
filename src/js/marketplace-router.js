/**
 * marketplace-router.js
 * Handles client-side routing for the Zentra Marketplace.
 * Routes:
 * - /community/market/        -> Landing / Feed
 * - /community/market/new     -> Create Listing
 * - /community/market/:id     -> Item Detail
 * - /community/chat           -> Chat Interface
 */

import { initListings } from './modules/listings.js';

const ROUTES = {
    LANDING: /^\/community\/market\/?$/,
    NEW_LISTING: /^\/community\/market\/new\/?$/,
    ITEM_DETAIL: /^\/community\/market\/([\w-]+)\/?$/,
    CHAT: /^\/community\/chat\/?$/,
    PROFILE: /^\/community\/profile\/?(.*)?$/
};

class MarketplaceRouter {
    constructor() {
        this.root = document.getElementById('market-root');
        this.communityContainer = document.querySelector('.community-layout');
        this.init();
    }

    init() {
        // Listen for popstate (back/forward)
        window.addEventListener('popstate', () => this.handleRoute());

        // Intercept links
        document.body.addEventListener('click', (e) => {
            const link = e.target.closest('a');
            if (link && link.href.includes('/community/market') || link.href.includes('/community/chat')) {
                // Allow control/cmd click to open in new tab
                if (e.ctrlKey || e.metaKey) return;

                // Internal routing
                if (link.origin === window.location.origin) {
                    e.preventDefault();
                    window.history.pushState({}, '', link.href);
                    this.handleRoute();
                }
            }
        });

        // Initial check
        this.handleRoute();
    }

    handleRoute() {
        const path = window.location.pathname;

        // Check if we are in the marketplace sub-app
        if (!path.includes('/community/market') && !path.includes('/community/chat') && !path.includes('/community/profile')) {
            this.toggleView('community');
            return;
        }

        this.toggleView('market');
        this.root.innerHTML = '<div class="loading-spinner"></div>'; // Clear previous view

        if (ROUTES.NEW_LISTING.test(path)) {
            this.renderCreateListing();
        } else if (ROUTES.ITEM_DETAIL.test(path)) {
            const match = path.match(ROUTES.ITEM_DETAIL);
            this.renderItemDetail(match[1]);
        } else if (ROUTES.CHAT.test(path)) {
            this.renderChat();
        } else if (ROUTES.PROFILE.test(path)) {
            this.renderProfile();
        } else {
            // Default to Landing/Feed
            this.renderLanding();
        }
    }

    toggleView(mode) {
        if (mode === 'market') {
            if (this.communityContainer) this.communityContainer.style.display = 'none';
            this.root.classList.remove('hidden');
        } else {
            if (this.communityContainer) this.communityContainer.style.display = 'flex'; // Restore grid
            this.root.classList.add('hidden');
        }
    }

    // --- Views ---

    renderLanding() {
        this.root.innerHTML = `
            <div class="market-landing fade-in-up">
                <div class="market-header glass-panel p-4 mb-4 flex justify-between items-center">
                    <div>
                        <h1 class="text-2xl font-bold gradient-text">Marketplace</h1>
                        <p class="text-gray-400">Verified Hardware & Tech</p>
                    </div>
                    <a href="/community/market/new" class="btn-primary">Sell Item</a>
                </div>
                
                <div class="market-filters flex gap-2 overflow-x-auto mb-6 pb-2">
                    <button class="filter-chip active">All</button>
                    <button class="filter-chip">GPUs</button>
                    <button class="filter-chip">CPUs</button>
                    <button class="filter-chip">Drones</button>
                    <button class="filter-chip">Photography</button>
                    <button class="filter-chip">Consoles</button>
                </div>

                <div id="market-feed-grid" class="market-grid">
                    <!-- Listings injected here -->
                </div>
            </div>
        `;

        // Initialize Listings Module to fetch data
        const grid = document.getElementById('market-feed-grid');
        initListings(grid);

        // Filter Logic
        const filterBtns = this.root.querySelectorAll('.filter-chip');
        filterBtns.forEach(btn => {
            btn.addEventListener('click', () => {
                // Update UI
                filterBtns.forEach(b => b.classList.remove('active'));
                btn.classList.add('active');

                // Fetch Data
                const category = btn.textContent;
                initListings(grid, category);
            });
        });
    }

    renderCreateListing() {
        this.root.innerHTML = `
            <div class="max-w-2xl mx-auto mt-10 p-6 glass-panel fade-in-up">
                <div class="mb-6 flex justify-between items-center">
                    <div>
                        <a href="/community/market" class="text-cyan-400 hover:underline text-sm">&larr; Back to Market</a>
                        <h1 class="text-2xl font-bold mt-2">Sell an Item</h1>
                    </div>
                    <div class="text-gray-400 text-sm">Step <span id="wizard-step-num">1</span> of 3</div>
                </div>
                
                <form id="create-listing-form" class="space-y-6">
                    
                    <!-- Step 1: Basic Info -->
                    <div id="step-1" class="wizard-step">
                        <div class="form-group">
                            <label class="block text-gray-400 text-sm mb-2">Title</label>
                            <input type="text" name="title" required class="w-full bg-gray-900 border border-gray-700 rounded p-3 text-white focus:border-cyan-400 focus:outline-none" placeholder="e.g. NVIDIA RTX 4090 Founder's Edition">
                        </div>

                        <div class="grid grid-cols-2 gap-4 mt-4">
                            <div class="form-group">
                                <label class="block text-gray-400 text-sm mb-2">Category</label>
                                <select name="category" class="w-full bg-gray-900 border border-gray-700 rounded p-3 text-white focus:border-cyan-400 focus:outline-none">
                                    <option value="gpus">Graphics Cards</option>
                                    <option value="cpus">CPUs / Processors</option>
                                    <option value="drones">Drones</option>
                                    <option value="cameras">Cameras & Lenses</option>
                                    <option value="audio">Audio / Headphones</option>
                                    <option value="consoles">Gaming Consoles</option>
                                    <option value="other">Other Tech</option>
                                </select>
                            </div>
                            <div class="form-group">
                                <label class="block text-gray-400 text-sm mb-2">Condition</label>
                                <select name="condition" class="w-full bg-gray-900 border border-gray-700 rounded p-3 text-white focus:border-cyan-400 focus:outline-none">
                                    <option value="New">New (Sealed)</option>
                                    <option value="Open Box">Open Box</option>
                                    <option value="Used - Like New">Used - Like New</option>
                                    <option value="Used - Good">Used - Good</option>
                                    <option value="Used - Fair">Used - Fair</option>
                                </select>
                            </div>
                        </div>

                        <div class="form-group mt-4">
                            <label class="block text-gray-400 text-sm mb-2">Description</label>
                            <textarea name="description" required rows="4" class="w-full bg-gray-900 border border-gray-700 rounded p-3 text-white focus:border-cyan-400 focus:outline-none" placeholder="Describe the item condition, accessories included, and history..."></textarea>
                        </div>
                    </div>

                    <!-- Step 2: Media -->
                    <div id="step-2" class="wizard-step hidden">
                        <label class="block text-gray-400 text-sm mb-2">Photos (Max 3)</label>
                        <div class="border-2 border-dashed border-gray-700 rounded-lg p-8 text-center hover:border-cyan-400 transition-colors cursor-pointer" id="drop-zone">
                            <input type="file" id="file-input" multiple accept="image/*" class="hidden">
                            <div class="text-4xl mb-2">📷</div>
                            <p class="text-gray-400">Click to upload or drag and drop</p>
                            <p class="text-xs text-gray-500 mt-2">JPG, PNG up to 5MB</p>
                        </div>
                        <div id="image-preview-grid" class="grid grid-cols-3 gap-4 mt-4">
                            <!-- Previews injected here -->
                        </div>
                    </div>

                    <!-- Step 3: Price & Shipping -->
                    <div id="step-3" class="wizard-step hidden">
                        <div class="form-group">
                            <label class="block text-gray-400 text-sm mb-2">Price (EUR)</label>
                            <div class="relative">
                                <span class="absolute left-3 top-3 text-gray-400">€</span>
                                <input type="number" name="price" required min="1" step="0.01" class="w-full bg-gray-900 border border-gray-700 rounded p-3 pl-8 text-white focus:border-cyan-400 focus:outline-none text-lg font-bold" placeholder="0.00">
                            </div>
                        </div>

                        <div class="glass-panel p-4 mt-6 bg-opacity-20">
                            <h3 class="text-sm font-bold text-gray-300 mb-2">Summary</h3>
                            <div class="flex justify-between text-sm mb-1">
                                <span class="text-gray-400">Listing Price</span>
                                <span class="text-white" id="summary-price">€0.00</span>
                            </div>
                            <div class="flex justify-between text-sm mb-1">
                                <span class="text-gray-400">Zentra Fee (6%)</span>
                                <span class="text-red-400" id="summary-fee">-€0.00</span>
                            </div>
                            <div class="border-t border-gray-700 my-2"></div>
                            <div class="flex justify-between font-bold">
                                <span class="text-cyan-400">You Receive</span>
                                <span class="text-cyan-400" id="summary-total">€0.00</span>
                            </div>
                        </div>
                    </div>

                    <!-- Navigation -->
                    <div class="flex justify-between pt-6 border-t border-gray-800">
                        <button type="button" id="prev-btn" class="btn-secondary small hidden">Back</button>
                        <div class="flex-1"></div>
                        <button type="button" id="next-btn" class="btn-primary">Next Step</button>
                        <button type="submit" id="submit-btn" class="btn-primary hidden">Post Listing</button>
                    </div>
                </form>
            </div>
        `;

        // Initialize Logic for this form
        import('./modules/listings.js').then(module => {
            module.setupWizard(document.getElementById('create-listing-form'));
        });
    }

    async renderItemDetail(id) {
        this.root.innerHTML = '<div class="loading-spinner"></div>';

        try {
            // Import dynamically
            const { getListingById } = await import('./modules/listings.js');
            const item = await getListingById(id);

            if (!item) {
                this.root.innerHTML = '<div class="text-center p-10 text-red-400">Item not found</div>';
                return;
            }

            const mainImage = item.images && item.images.length > 0 ? item.images[0] : '/assets/images/product-placeholder.png';

            this.root.innerHTML = `
                <div class="item-detail-view fade-in-up flex flex-col md:flex-row gap-8 max-w-6xl mx-auto p-4">
                    <!-- Left: Images -->
                    <div class="w-full md:w-1/2">
                        <div class="aspect-video bg-gray-800 rounded-xl overflow-hidden mb-4 border border-gray-700">
                             <img src="${mainImage}" class="w-full h-full object-contain">
                        </div>
                        <div class="grid grid-cols-3 gap-2">
                            ${item.images ? item.images.map(img => `
                                <div class="aspect-square bg-gray-800 rounded-lg overflow-hidden border border-gray-700 cursor-pointer hover:border-cyan-400">
                                    <img src="${img}" class="w-full h-full object-cover">
                                </div>
                            `).join('') : ''}
                        </div>
                    </div>

                    <!-- Right: Info -->
                    <div class="w-full md:w-1/2 space-y-6">
                        <div>
                            <div class="flex justify-between items-start">
                                <h1 class="text-3xl font-bold mb-2">${item.title}</h1>
                                <span class="badge bg-gray-800 border border-cyan-400 text-cyan-400 px-3 py-1 rounded-full text-sm">${item.condition}</span>
                            </div>
                            <p class="text-3xl font-mono text-cyan-400 font-bold mt-2">${this.formatPrice(item.price)}</p>
                        </div>

                        <div class="glass-panel p-6 bg-opacity-20">
                            <h3 class="font-bold text-gray-400 mb-2 uppercase text-xs tracking-wider">Description</h3>
                            <p class="text-gray-200 leading-relaxed whitespace-pre-wrap">${item.description}</p>
                        </div>

                        <div class="glass-panel p-4 flex items-center justify-between">
                            <div class="flex items-center gap-3">
                                <div class="w-10 h-10 rounded-full bg-cyan-900 text-cyan-400 flex items-center justify-center font-bold text-xl">
                                    ${item.sellerName ? item.sellerName[0].toUpperCase() : '?'}
                                </div>
                                <div>
                                    <p class="font-bold text-white">${item.sellerName}</p>
                                    <p class="text-xs text-green-400">Verified Seller</p>
                                </div>
                            </div>
                            <!-- Buttons -->
                            <div class="flex gap-2">
                                <button id="chat-seller-btn" class="btn-secondary small">Message</button>
                                <button id="buy-now-btn" class="btn-primary">Buy Now</button>
                            </div>
                        </div>
                    </div>
                </div>
            `;

            // Setup Details Logic
            document.getElementById('chat-seller-btn').addEventListener('click', async () => {
                const { ChatSystem } = await import('./modules/chat.js');
                const roomId = await ChatSystem.startChat(item.id, item.sellerId, item.title);
                if (roomId) {
                    window.history.pushState({}, '', '/community/chat');
                    this.renderChat(roomId);
                }
            });

            document.getElementById('buy-now-btn').addEventListener('click', async () => {
                if (item.status === 'sold') {
                    alert('This item has already been sold.');
                    return;
                }
                const { TransactionSystem } = await import('./modules/transactions.js');
                const system = new TransactionSystem();
                system.initiatePurchase(item);
            });

        } catch (error) {
            console.error(error);
            this.root.innerHTML = '<div class="text-center p-10 text-red-400">Error loading details</div>';
        }
    }

    formatPrice(cents) {
        return new Intl.NumberFormat('de-DE', { style: 'currency', currency: 'EUR' }).format(cents / 100);
    }

    renderChat(autoOpenRoomId = null) {
        this.root.innerHTML = `<div id="chat-container"></div>`;
        import('./modules/chat.js').then(({ ChatSystem }) => {
            const chat = new ChatSystem(document.getElementById('chat-container'));
            chat.init();
            if (autoOpenRoomId) {
                // Give it a moment to load listeners (imperfect but functional for MVP)
                setTimeout(() => {
                    // We need a way to open it even if not in the list yet, but openRoom handles that
                    // We just need the listing data, but openRoom fetches messages. 
                    // Ideally check list or fetch room doc. For now, we trust the ID.
                    // We need to fetch the room data to populate the header correctly if it wasn't in list.
                    // For MVP, we might rely on the user clicking the list or passing simple data.
                    // Let's just try to highlight it.
                    chat.activeRoomId = autoOpenRoomId;
                }, 500);
            }
        });
    }

    async renderProfile() {
        this.root.innerHTML = '<div class="loading-spinner"></div>';

        // Dynamic Import
        const { getUserDashboardData, markAsShipped, confirmReceipt } = await import('./modules/profile.js');
        const data = await getUserDashboardData();

        if (!data) {
            this.root.innerHTML = '<div class="text-center p-10">Please log in to view your dashboard.</div>';
            return;
        }

        const formatMoney = (cents) => new Intl.NumberFormat('de-DE', { style: 'currency', currency: 'EUR' }).format(cents / 100);

        this.root.innerHTML = `
            <div class="profile-dashboard container mx-auto fade-in-up pb-10">
                <h1 class="text-3xl font-bold mb-8">My Dashboard</h1>

                <!-- Stats Cards -->
                <div class="grid grid-cols-1 md:grid-cols-3 gap-6 mb-10">
                     <div class="glass-panel p-6 border-l-4 border-cyan-400">
                        <h3 class="text-gray-400 text-sm uppercase tracking-wider mb-2">Available Payouts</h3>
                        <div class="text-3xl font-mono text-white">${formatMoney(data.stats.availableBalance)}</div>
                     </div>
                     <div class="glass-panel p-6 border-l-4 border-yellow-500">
                        <h3 class="text-gray-400 text-sm uppercase tracking-wider mb-2">Pending Escrow</h3>
                        <div class="text-3xl font-mono text-white">${formatMoney(data.stats.pendingBalance)}</div>
                     </div>
                     <div class="glass-panel p-6 border-l-4 border-purple-500">
                        <h3 class="text-gray-400 text-sm uppercase tracking-wider mb-2">Active Listings</h3>
                        <div class="text-3xl font-mono text-white">${data.stats.activeListings} Items</div>
                     </div>
                </div>

                <!-- Tabs (Simplified for MVP, just stacking sections) -->
                
                <!-- 1. My Orders (Buying) -->
                <div class="mb-10">
                    <h2 class="text-xl font-bold mb-4 flex items-center gap-2">
                        <span>🛒</span> My Orders (Buying)
                    </h2>
                    ${data.purchases.length === 0 ? '<p class="text-gray-500">No purchases yet.</p>' : `
                        <div class="space-y-4">
                            ${data.purchases.map(tx => `
                                <div class="glass-panel p-4 flex flex-col md:flex-row items-center justify-between gap-4">
                                    <div class="flex items-center gap-4 flex-1">
                                        <div class="w-16 h-16 bg-gray-800 rounded overflow-hidden">
                                            <img src="${tx.listingImage || ''}" class="w-full h-full object-cover">
                                        </div>
                                        <div>
                                            <h4 class="font-bold">${tx.listingTitle}</h4>
                                            <p class="text-sm text-gray-400">Sold by ${tx.sellerName}</p>
                                            <div class="mt-1 badge px-2 py-0.5 rounded text-xs inline-block ${getStatusColor(tx.status)}">
                                                ${formatStatus(tx.status)}
                                            </div>
                                        </div>
                                    </div>
                                    <div class="text-right">
                                        <p class="font-mono text-lg">${formatMoney(tx.price)}</p>
                                        ${getBuyerActions(tx)}
                                    </div>
                                </div>
                            `).join('')}
                        </div>
                    `}
                </div>

                <!-- 2. My Sales (Selling) -->
                <div class="mb-10">
                    <h2 class="text-xl font-bold mb-4 flex items-center gap-2">
                        <span>📈</span> My Sales (Selling)
                    </h2>
                    ${data.sales.length === 0 ? '<p class="text-gray-500">No sales yet.</p>' : `
                        <div class="space-y-4">
                            ${data.sales.map(tx => `
                                <div class="glass-panel p-4 flex flex-col md:flex-row items-center justify-between gap-4">
                                    <div class="flex items-center gap-4 flex-1">
                                        <div class="w-16 h-16 bg-gray-800 rounded overflow-hidden">
                                            <img src="${tx.listingImage || ''}" class="w-full h-full object-cover">
                                        </div>
                                        <div>
                                            <h4 class="font-bold">${tx.listingTitle}</h4>
                                            <p class="text-sm text-gray-400">Buyer: ${tx.buyerName}</p>
                                            <div class="mt-1 badge px-2 py-0.5 rounded text-xs inline-block ${getStatusColor(tx.status)}">
                                                ${formatStatus(tx.status)}
                                            </div>
                                        </div>
                                    </div>
                                    <div class="text-right">
                                        <p class="font-mono text-lg text-green-400">+${formatMoney(tx.price * 0.94)}</p>
                                        <p class="text-xs text-gray-500">after fees</p>
                                        ${getSellerActions(tx)}
                                    </div>
                                </div>
                            `).join('')}
                        </div>
                    `}
                </div>
            </div>
        `;

        // Event Delegation for Actions
        this.root.addEventListener('click', async (e) => {
            if (e.target.classList.contains('action-shipped')) {
                const txId = e.target.dataset.id;
                if (confirm('Confirm you have shipped this item? Tracking info can be sent via chat.')) {
                    await markAsShipped(txId);
                    this.renderProfile(); // Refresh
                }
            }
            if (e.target.classList.contains('action-received')) {
                const txId = e.target.dataset.id;
                if (confirm('Confirm you received the item? This will release funds to the seller.')) {
                    await confirmReceipt(txId);
                    this.renderProfile(); // Refresh
                }
            }
        });
    }
}

// Initialize on load
document.addEventListener('DOMContentLoaded', () => {
    // Only init if market-root exists (which we will add to community.html)
    if (document.getElementById('market-root')) {
        new MarketplaceRouter();
    }
});

// Helpers
function getStatusColor(status) {
    switch (status) {
        case 'pending_escrow': return 'bg-yellow-500/20 text-yellow-400 border border-yellow-500/50';
        case 'held_in_escrow': return 'bg-blue-500/20 text-blue-400 border border-blue-500/50';
        case 'shipped': return 'bg-purple-500/20 text-purple-400 border border-purple-500/50';
        case 'completed': return 'bg-green-500/20 text-green-400 border border-green-500/50';
        default: return 'bg-gray-700 text-gray-400';
    }
}

function formatStatus(status) {
    if (!status) return '';
    return status.replace(/_/g, ' ').toUpperCase();
}

function getBuyerActions(tx) {
    if (tx.status === 'shipped') {
        return `<button class="btn-primary small mt-2 action-received" data-id="${tx.id}">Confirm Receipt</button>`;
    }
    if (tx.status === 'held_in_escrow') {
        return `<span class="text-xs text-blue-400 mt-2 block">Waiting for shipment</span>`;
    }
    return '';
}

function getSellerActions(tx) {
    if (tx.status === 'held_in_escrow') {
        return `<button class="btn-secondary small mt-2 action-shipped" data-id="${tx.id}">Mark Shipped</button>`;
    }
    if (tx.status === 'shipped') {
        return `<span class="text-xs text-purple-400 mt-2 block">In Transit</span>`;
    }
    return '';
}

export { MarketplaceRouter };
