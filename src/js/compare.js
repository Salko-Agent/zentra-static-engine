/**
 * Zentra Compare Engine
 * Client-side product comparison using LocalStorage.
 * No database required.
 */

const Compare = {
    MAX_ITEMS: 4,
    STORAGE_KEY: 'zentra_compare_v1',

    // Initialize (update UI counters)
    init: () => {
        Compare.updateCounter();
        if (window.location.pathname.includes('compare.html')) {
            Compare.renderTable();
        }
    },

    // Get current list
    getList: () => {
        const raw = localStorage.getItem(Compare.STORAGE_KEY);
        return raw ? JSON.parse(raw) : [];
    },

    // Add item
    add: (product) => {
        let list = Compare.getList();
        
        // Check duplicates
        if (list.find(p => p.id === product.id)) {
            Compare.showToast('Already added to comparison!', 'info');
            return;
        }

        // Check limit
        if (list.length >= Compare.MAX_ITEMS) {
            Compare.showToast(`Limit reached (Max ${Compare.MAX_ITEMS}). Remove an item first.`, 'warning');
            return;
        }

        list.push(product);
        localStorage.setItem(Compare.STORAGE_KEY, JSON.stringify(list));
        Compare.updateCounter();
        Compare.showToast('Added to comparison', 'success');
        
        // Slight animation on the generic counter if it exists
        const badge = document.getElementById('compare-count');
        if(badge) {
            badge.classList.add('pulse');
            setTimeout(() => badge.classList.remove('pulse'), 500);
        }
    },

    // Remove item
    remove: (id) => {
        let list = Compare.getList();
        list = list.filter(p => p.id !== id);
        localStorage.setItem(Compare.STORAGE_KEY, JSON.stringify(list));
        Compare.updateCounter();
        
        // If on compare page, re-render
        if (window.location.pathname.includes('compare.html')) {
            Compare.renderTable();
        }
    },

    // Clear all
    clear: () => {
        localStorage.removeItem(Compare.STORAGE_KEY);
        Compare.updateCounter();
        if (window.location.pathname.includes('compare.html')) {
            Compare.renderTable();
        }
    },

    // Update Header Counter
    updateCounter: () => {
        const list = Compare.getList();
        const badges = document.querySelectorAll('.compare-count-badge');
        badges.forEach(b => {
            b.innerText = list.length;
            b.style.display = list.length > 0 ? 'flex' : 'none';
        });
    },

    // Render the Compare Table
    renderTable: () => {
        const container = document.getElementById('compare-container');
        if (!container) return;

        const list = Compare.getList();

        if (list.length === 0) {
            container.innerHTML = `
                <div class="glass-panel text-center p-5">
                    <h2 class="text-white mb-3">Comparison Empty</h2>
                    <p class="text-muted mb-4">You haven't added any gear yet.</p>
                    <a href="/produkte/computing-workstation/index.html" class="btn-primary">Browse Gear</a>
                </div>
            `;
            return;
        }

        // Build HTML Table
        let html = '<div class="compare-grid" style="display: grid; grid-template-columns: 200px repeat(' + list.length + ', 1fr); gap: 1px; background: var(--border-glass); border: 1px solid var(--border-glass);">';
        
        // Headers
        html += '<div class="compare-cell header-col">Feature</div>';
        list.forEach(p => {
            html += `
                <div class="compare-cell product-header relative p-4 glass-panel">
                    <button onclick="Compare.remove('${p.id}')" class="absolute top-2 right-2 text-red-400 hover:text-red-300">×</button>
                    <img src="${p.image}" class="w-20 h-20 object-contain mx-auto mb-3" style="max-height: 100px;">
                    <h4 class="text-sm font-bold text-white mb-2"><a href="${p.url}" class="hover-cyan">${p.name}</a></h4>
                    <div class="text-cyan font-mono text-lg">${p.price}</div>
                    <a href="${p.affiliate}" target="_blank" class="btn-primary small mt-3 block text-center">Buy Now</a>
                </div>
            `;
        });

        // Rows
        const features = ['Brand', 'Category', 'Zentra Verdict']; // Flexible, can add more
        
        features.forEach(feat => {
            html += `<div class="compare-cell label-col p-3 glass-panel text-muted font-mono text-sm flex items-center">${feat}</div>`;
            list.forEach(p => {
                let val = p[feat.toLowerCase()] || '-';
                if (feat === 'Zentra Verdict') val = 'Approved for ' + (p.category || 'general use');
                html += `<div class="compare-cell val-col p-3 glass-panel text-white text-sm flex items-center justify-center text-center">${val}</div>`;
            });
        });

        html += '</div>';
        
        // Action Bar
        html += `
            <div class="mt-4 text-right">
                <button onclick="Compare.clear()" class="btn-secondary small text-red-400">Clear All</button>
            </div>
        `;

        container.innerHTML = html;
    },
    
    // Simple Toast Notification
    showToast: (msg, type = 'info') => {
        // Create toast element if not exists
        let toast = document.getElementById('zentra-toast');
        if (!toast) {
            toast = document.createElement('div');
            toast.id = 'zentra-toast';
            toast.style.cssText = 'position: fixed; bottom: 20px; right: 20px; background: #111; border: 1px solid var(--accent-cyan); color: #fff; padding: 15px 25px; border-radius: 4px; z-index: 9999; transform: translateY(100px); transition: transform 0.3s ease;';
            document.body.appendChild(toast);
        }
        
        // Style by type
        let color = 'var(--accent-cyan)';
        if (type === 'warning') color = '#ffaa00';
        if (type === 'error') color = '#ff0000';
        
        toast.style.borderColor = color;
        toast.innerHTML = `<i class="fas fa-info-circle" style="color: ${color}; margin-right: 10px;"></i> ${msg}`;
        
        // Show
        toast.style.transform = 'translateY(0)';
        
        // Hide
        setTimeout(() => {
            toast.style.transform = 'translateY(100px)';
        }, 3000);
    }
};

// Initialize on load
document.addEventListener('DOMContentLoaded', Compare.init);
