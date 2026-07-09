/**
 * Build Engine & Scorer
 * Assembles PC Builds based on Definitions (Goal + Budget).
 */

class BuildEngine {
    constructor(products) {
        this.products = products; // Expects Normalized Products
        this.inventory = this._indexInventory(products);
    }

    _indexInventory(products) {
        const idx = {
            GPU: [], CPU: [], RAM: [], SSD: [], MOBO: [], PSU: [], CASE: []
        };
        products.forEach(p => {
            if (idx[p.componentType]) {
                idx[p.componentType].push(p);
            }
        });
        
        console.log('--- Inventory Breakdown ---');
        Object.keys(idx).forEach(k => {
            console.log(`${k}: ${idx[k].length} Items`);
        });
        return idx;
    }

    /**
     * Generate a complete build
     * @param {Object} config { name: "Gaming Ultra", budget: 2500, goal: "gaming" }
     */
    generateBuild(config) {
        const build = {
            name: config.name,
            totalPrice: 0,
            components: [],
            valid: true
        };

        // Budget Allocation Strategy (Gaming Focused)
        const allocation = config.goal === 'workstation' 
            ? { gpu: 0.30, cpu: 0.30, ram: 0.10, mobo: 0.10, ssd: 0.10, psu: 0.05, case: 0.05 } // Balanced
            : { gpu: 0.45, cpu: 0.20, ram: 0.08, mobo: 0.10, ssd: 0.07, psu: 0.05, case: 0.05 }; // Gaming

        // Select Components
        build.components.push(this._pickBest(this.inventory.GPU, config.budget * allocation.gpu, 'GPU'));
        build.components.push(this._pickBest(this.inventory.CPU, config.budget * allocation.cpu, 'CPU'));
        build.components.push(this._pickBest(this.inventory.RAM, config.budget * allocation.ram, 'RAM'));
        build.components.push(this._pickBest(this.inventory.MOBO, config.budget * allocation.mobo, 'MOBO'));
        build.components.push(this._pickBest(this.inventory.SSD, config.budget * allocation.ssd, 'SSD'));
        build.components.push(this._pickBest(this.inventory.PSU, config.budget * allocation.psu, 'PSU'));
        build.components.push(this._pickBest(this.inventory.CASE, config.budget * allocation.case, 'CASE'));

        // Validation
        if (build.components.some(c => c === null)) {
            build.valid = false;
        } else {
            build.totalPrice = build.components.reduce((sum, c) => sum + c.price, 0);
        }

        return build;
    }

    /**
     * Pick the best component for a target price (+/- wide margin)
     */
    _pickBest(candidates, targetPrice, type) {
        // Fallback for missing inventory: Create a placeholder if absolutely no candidates exist
        if (!candidates || candidates.length === 0) {
            console.warn(`Warning: No inventory found for ${type}. Using placeholder.`);
            return {
                name: `Generic ${type} (Placeholder)`,
                price: targetPrice,
                url: '#',
                affiliate: '#',
                merchant_image_url: '/assets/images/product-placeholder.png',
                componentType: type,
                spec: 'Standard ' + type,
                tier: 5,
                rationale: 'Placeholder component (Inventory Empty)'
            };
        }

        const min = targetPrice * 0.3; // Very relaxed
        const max = targetPrice * 3.0; // Very wide range

        // Filter by budget
        let pool = candidates.filter(p => p.price >= min && p.price <= max);

        // Fallback 1: Any price if range failed
        if (pool.length === 0) {
            pool = candidates; 
        }

        // Scoring: Maximize Tier, Minimize Price Deviation
        pool.sort((a, b) => {
            const diffA = Math.abs(targetPrice - a.price);
            const diffB = Math.abs(targetPrice - b.price);
            
            // If tiers are close, pick simpler price match
            if (Math.abs((a.tier || 5) - (b.tier || 5)) <= 1) {
                return diffA - diffB;
            }
            // Otherwise prefer higher tier
            return (b.tier || 5) - (a.tier || 5);
        });

        // Clone to avoid mutation of shared objects if needed, though simpler is fine
        const selected = { ...pool[0] }; 
        selected.rationale = this._generateRationale(selected, type, targetPrice);
        
        return selected;
    }

    _generateRationale(part, type, target) {
        const diff = part.price - target;
        const savings = diff < 0 ? `saves ${Math.abs(diff).toFixed(0)}€` : `invests ${diff.toFixed(0)}€ more`;
        
        if (type === 'GPU') return `Selected as the graphics engine. This ${part.spec || 'GPU'} matches the performance target and ${savings} vs budget.`;
        if (type === 'CPU') return `Optimal processor choice. The ${part.spec} provides balanced multitasking.`;
        return `Best value option in class. Tier ${part.tier} component that ${savings}.`;
    }
}

module.exports = BuildEngine;
