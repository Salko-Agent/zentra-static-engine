import { Auth } from './auth.js';
import { UI } from './ui.js';
import { Market } from './market.js';
import { Community } from './community.js';

// Global Exposure for inline scripts (templates)
window.Auth = Auth;
window.Market = Market;
window.Community = Community;
window.UI = UI;

document.addEventListener('DOMContentLoaded', () => {
    // 1. Initialize Core
    Auth.init();
    UI.init();

    // 2. Route Specific Initializers
    const path = window.location.pathname;

    if (path.includes('/hangar')) {
        console.log('Hangar Module Loaded');
        // Market logic handled by inline scripts in templates for now, or we can move it here
    }

    if (path.includes('/network')) {
        console.log('Network Module Loaded');
    }

    // 3. Home Page Loaders
    if (path === '/' || path.includes('index.html')) {
        loadHubIntel();
        loadHubSpotlight();
    }
});

async function loadHubIntel() {
    const container = document.getElementById('hub-intel-grid');
    if (!container) return;

    try {
        const res = await fetch('/assets/data/news.json');
        if (!res.ok) throw new Error(`Feed missing: ${res.status}`);

        const news = await res.json();
        const latest = news.slice(0, 3);

        if (latest.length === 0) {
            container.innerHTML = '<div class="text-muted col-span-full text-center">No signals detected.</div>';
            return;
        }

        container.innerHTML = latest.map(item => `
            <a href="${item.link}" class="glass-panel p-20 hover-cyan flex-col hover-glow" style="gap: 15px; text-decoration: none; height: 100%; transition: all 0.3s ease;">
                <div class="flex-between">
                    <span class="badge text-xs" style="background: rgba(0, 240, 255, 0.1); color: var(--accent-cyan); border: 1px solid var(--accent-cyan);">${item.source || 'INTEL'}</span>
                    <span class="text-xs text-muted font-mono">${item.date}</span>
                </div>
                <h3 style="font-size: 1.1rem; line-height: 1.4; color: #fff;">${item.title}</h3>
                <p class="text-muted text-sm" style="display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden; opacity: 0.8;">
                    ${item.description}
                </p>
                <div class="mt-auto pt-10 flex justify-end">
                     <span class="text-xs text-cyan">READ ///</span>
                </div>
            </a>
        `).join('');
    } catch (e) {
        console.warn('Intel Feed Error:', e);
        container.innerHTML = `<div class="glass-panel p-20 text-center col-span-full"><h3 class="text-amber mb-10">SIGNAL INTERRUPTED</h3><p class="text-muted text-sm">Unable to establish uplink with Intel Database.</p></div>`;
    }
}

function loadHubSpotlight() {
    const container = document.getElementById('network-spotlight');
    if (!container) return;

    // Static curated list for now
    const projects = [
        { title: "T-80U Scale Logic", author: "Mech_Engineer", img: "https://images.unsplash.com/photo-1605218457224-b333a5796a30?auto=format&fit=crop&w=400&q=80" },
        { title: "Custom loop.v2", author: "FrostByte", img: "https://images.unsplash.com/photo-1593508512255-86ab42a8e620?auto=format&fit=crop&w=400&q=80" },
        { title: "Cyber-Deck 2077", author: "NullPtr", img: "https://images.unsplash.com/photo-1614713568397-b4d242636a04?auto=format&fit=crop&w=400&q=80" },
        { title: "Drone AI Unit", author: "SkyNet_Jr", img: "https://images.unsplash.com/photo-1506459345638-7661005ca62f?auto=format&fit=crop&w=400&q=80" }
    ];

    container.innerHTML = projects.slice(0, 4).map(p => `
        <div class="glass-panel p-10 flex-col hover-scale" style="gap: 10px; cursor: pointer; transition: all 0.3s ease;" onclick="window.location.href='/network/index.html'">
            <div style="height: 100px; overflow: hidden; border-radius: 4px; border: 1px solid rgba(255,255,255,0.1); background: #000;">
                <img src="${p.img}" style="width: 100%; height: 100%; object-fit: cover; opacity: 0.8;" onerror="this.src='/assets/images/placeholder.png'; this.style.opacity='0.5';">
            </div>
            <div class="p-5">
                <div class="text-sm font-bold text-white truncate mb-5">${p.title}</div>
                <div class="text-xs text-cyan truncate font-mono">@${p.author}</div>
            </div>
        </div>
    `).join('');

    // Fallback if empty (should never happen with static list but good practice)
    if (container.innerHTML === '') {
        container.innerHTML = '<div class="text-xs text-muted">No signals.</div>';
    }
}
}
