/**
 * Zentra Build Wizard
 * A Keyword-Matching Asset Locator for PC Builds.
 */

const Wizard = {
    // Configuration: Define Tiers and Keywords
    blueprints: {
        gaming: {
            entry: {
                title: "1080p Entry Fighter",
                budget: "800 - 1200€",
                specs: {
                    gpu: ["RTX 4060", "RTX 3060", "RX 7600", "RX 6600"],
                    cpu: ["i5-13400", "i5-12400", "Ryzen 5 7600", "Ryzen 5 5600"],
                    mobo: ["B760", "B660", "B550", "B650"],
                    ram: ["16GB", "32GB"]
                }
            },
            mid: {
                title: "1440p High-FPS Striker",
                budget: "1500 - 2000€",
                specs: {
                    gpu: ["RTX 4070", "RTX 4070 Super", "RX 7800 XT", "RX 7900 GRE"],
                    cpu: ["i5-13600K", "i5-14600K", "Ryzen 7 7800X3D", "Ryzen 7 7700"],
                    mobo: ["Z790", "Z690", "B650", "X670"],
                    ram: ["32GB"]
                }
            },
            high: {
                title: "4K Raytracing Behemoth",
                budget: "2500€+",
                specs: {
                    gpu: ["RTX 4080", "RTX 4090", "RX 7900 XTX"],
                    cpu: ["i7-14700K", "i9-14900K", "Ryzen 7 7800X3D", "Ryzen 9 7950X3D"],
                    mobo: ["Z790", "X670E"],
                    ram: ["32GB", "64GB"]
                }
            }
        },
        workstation: {
            creative: {
                title: "Content Creator Studio",
                budget: "1800€+",
                specs: {
                    gpu: ["RTX 4070", "RTX 4080", "RTX 4000 Ada"],
                    cpu: ["i7-13700K", "i9-13900K", "Ryzen 9 7900X"],
                    mobo: ["Z790", "X670"],
                    ram: ["64GB", "32GB"]
                }
            }
        }
    },

    inventory: [],

    init: async () => {
        // Load the full search index (small enough at 13MB to fetch once or partial? 
        // 13MB is too big for mobile. We should use a smaller specialized index or fetch searching dynamically.
        // For this demo, we assume the user has landed effectively. 
        // We will fetch `products.json` ONLY when they click "Generate".
        
        document.getElementById('wizard-form').addEventListener('submit', Wizard.generate);
    },

    fetchData: async () => {
        if (Wizard.inventory.length > 0) return;
        
        Wizard.showLoader(true);
        try {
            const response = await fetch('/assets/data/products.json');
            Wizard.inventory = await response.json();
            console.log("Wizard Inventory Loaded:", Wizard.inventory.length);
        } catch (e) {
            console.error("Wizard Inventory Error", e);
            alert("Could not load inventory database.");
        }
        Wizard.showLoader(false);
    },

    generate: async (e) => {
        e.preventDefault();
        
        // 1. Get User Input
        const usage = document.getElementById('usage-select').value; // gaming, workstation
        const tier = document.getElementById('tier-select').value;   // entry, mid, high

        if (!Wizard.blueprints[usage] || !Wizard.blueprints[usage][tier]) {
            alert("Configuration not configured yet.");
            return;
        }

        const blueprint = Wizard.blueprints[usage][tier];

        // 2. Ensure Data
        await Wizard.fetchData();

        // 3. Find Matches
        const results = {
            gpu: Wizard.findBestMatch(blueprint.specs.gpu),
            cpu: Wizard.findBestMatch(blueprint.specs.cpu),
            mobo: Wizard.findBestMatch(blueprint.specs.mobo),
            // For others, we might return generic links if we can't match specific models reliable
        };

        // 4. Render
        Wizard.renderResult(blueprint, results);
    },

    findBestMatch: (keywords) => {
        // Filter inventory for checking if ANY keyword is in title
        // Prioritize: items that match the FIRST keyword (preferred)
        
        for (let key of keywords) {
            // Strict regex for the keyword
            const regex = new RegExp(key.replace(' ', '.*'), 'i');
            const matches = Wizard.inventory.filter(p => regex.test(p.title) && p.category === 'computing-workstation');
            
            if (matches.length > 0) {
                // Return top 3 matches, ideally sort by price desc (as these are 'best match' for build?)
                // Or just random to distribute clicks? Let's take first 3.
                return {
                    keyword: key,
                    items: matches.slice(0, 3)
                };
            }
        }
        return null;
    },

    renderResult: (blueprint, matches) => {
        const container = document.getElementById('wizard-results');
        const display = document.getElementById('results-area');
        
        document.getElementById('wizard-intro').classList.add('hidden');
        display.classList.remove('hidden');

        let html = `
            <div class="glass-panel p-6 mb-8 border-cyan">
                <h2 class="gradient-text text-2xl mb-2">${blueprint.title}</h2>
                <p class="text-muted">Target Budget: ${blueprint.budget}</p>
            </div>
            
            <div class="components-grid grid gap-6">
        `;

        const labels = { gpu: 'Graphics Engine', cpu: 'Processor', mobo: 'Mainboard' };

        for (let [part, data] of Object.entries(matches)) {
            if (!data) continue;
            
            html += `
                <div class="component-group">
                    <h3 class="text-white text-lg mb-3 border-b border-gray-700 pb-2 flex-between">
                        <span>${labels[part]}</span>
                        <span class="text-xs text-cyan font-mono">${data.keyword} Class</span>
                    </h3>
                    <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            `;

            data.items.forEach(item => {
                html += `
                    <div class="product-card glass-panel p-4 relative group hover:bg-white/5 transition">
                        <div class="h-32 mb-3 flex-center">
                            <img src="${item.image}" class="max-h-full max-w-full object-contain">
                        </div>
                        <h4 class="text-sm font-bold text-gray-200 mb-2 line-clamp-2" title="${item.title}">
                            <a href="${item.link}" target="_blank">${item.title}</a>
                        </h4>
                        <div class="flex-between mt-auto">
                            <span class="text-cyan font-mono font-bold">${item.price}</span>
                            <a href="${item.link}" class="btn-primary small">View</a>
                        </div>
                    </div>
                `;
            });

            html += `</div></div>`;
        }

        html += `
            <div class="mt-8 text-center">
                <button onclick="location.reload()" class="btn-secondary">Start Over</button>
            </div>
        `;

        container.innerHTML = html;
        container.scrollIntoView({ behavior: 'smooth' });
    },

    showLoader: (show) => {
        const btn = document.getElementById('generate-btn');
        if(show) {
            btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> SCANNING SUPPLY...';
            btn.disabled = true;
        } else {
            btn.innerHTML = 'GENERATE BLUEPRINT';
            btn.disabled = false;
        }
    }
};

document.addEventListener('DOMContentLoaded', Wizard.init);
