/**
 * Product Normalization Layer
 * Extracts component types and specs from raw product titles using Regex.
 * Operates without deep metadata from the feed.
 */

const PATTERNS = {
    // GPU: Detects Chipset
    gpu: {
        regex: /(RTX\s?4090|RTX\s?4080|RTX\s?4070\s?Ti|RTX\s?4070|RTX\s?4060\s?Ti|RTX\s?4060|RX\s?7900\s?XTX|RX\s?7900\s?XT|RX\s?7800\s?XT|RX\s?7700\s?XT|RX\s?7600)/i,
        exclude: /Laptop|Notebook|Mobile/i,
        type: 'GPU'
    },
    // CPU: Detects Family
    cpu: {
        regex: /(Core\s?i9|Core\s?i7|Core\s?i5|Ryzen\s?9|Ryzen\s?7|Ryzen\s?5)(\sPRO)?\s?(\d{4,5}[A-Z,a-z]*)/i,
        exclude: /Laptop|Notebook/i,
        type: 'CPU'
    },
    // RAM: Capacity & Tech
    ram: {
        regex: /(\d+)GB\s?(DDR5|DDR4)/i,
        exclude: /Laptop|SODIMM/i,
        type: 'RAM'
    },
    // SSD: Capacity
    ssd: {
        regex: /(1TB|2TB|4TB|500GB|512GB).*?(SSD|NVMe|M\.2)/i,
        exclude: /External|Portable/i,
        type: 'SSD'
    },
    // Motherboard
    mobo: {
        regex: /(Z790|B760|Z690|B660|X670|B650|X570|B550|Motherboard|Mainboard|LGA1700)/i,
        exclude: /Laptop|Ryzen|Core/i, // Exclude CPUs explicitly if they fall through
        type: 'MOBO'
    },
    // PSU
    psu: {
        regex: /(\d{3,4})\s?W|Netzteil|Power Supply/i,
        exclude: /Laptop|Cable|Adapter/i,
        type: 'PSU'
    },
    // Case
    case: {
        regex: /((ATX|Micro-ATX|Mini-ITX).*?(Case|Gehäuse|Tower))|(Gehäuse|Tower)/i,
        exclude: /Fan|Carrying/i,
        type: 'CASE'
    }
};

class ProductNormalizer {
    static normalize(product) {
        const text = (product.product_name + " " + (product.description || "")).replace(/\s+/g, ' ');
        // console.log(`Normalizing: ${product.product_name}`); // Debug
        const price = parseFloat(product.search_price || 0);
        
        // Basic filtering
        if (!price || price < 10) return null; // Filter garbage

        let normalized = {
            id: product.slug,
            name: product.product_name,
            price: price,
            currency: product.currency || 'EUR',
            image: product.merchant_image_url,
            url: product.local_link, // Internal Zentra link
            affiliate: product.aw_deep_link,
            merchant: product.merchant_name || 'Unknown',
            componentType: null,
            spec: null,
            score: 0
        };

    const normalizedText = text.toLowerCase();
        
        // Loop through all patterns and check for matches
        for (const [key, rule] of Object.entries(PATTERNS)) {
            // Apply exclusion first
            if (rule.exclude && rule.exclude.test(text)) continue;
            
            // Try to match the regex
            const match = text.match(rule.regex);
            if (match) {
                // Determine normalized component type
                let type = rule.type;
                let spec = match[1] || match[0]; // Capture group or fall back to full match

                // Heuristic: If we matched "Motherboard" generic regex, but missed specific chipsets, still count it
                if (key === 'mobo' && !spec) spec = 'Standard ATX';

                normalized.componentType = type;
                normalized.spec = spec;
                normalized.tier = ProductNormalizer.calculateTier(key, match[0]);
                
                return normalized;
            }
        }
        
        return null; // Not a recognized component
    }

    static calculateTier(type, matchStr) {
        const s = matchStr.toUpperCase();
        // Simple Heuristics for Tiering (1-10)
        if (type === 'gpu') {
            if (s.includes('4090') || s.includes('7900 XTX')) return 10;
            if (s.includes('4080') || s.includes('7900 XT')) return 9;
            if (s.includes('4070 TI')) return 8;
            if (s.includes('4070') || s.includes('7800')) return 7;
            if (s.includes('4060 TI')) return 6;
            if (s.includes('4060') || s.includes('7600')) return 5;
        }
        if (type === 'cpu') {
            if (s.includes('I9') || s.includes('RYZEN 9')) return 9;
            if (s.includes('I7') || s.includes('RYZEN 7')) return 7;
            if (s.includes('I5') || s.includes('RYZEN 5')) return 5;
        }
        if (type === 'ram') {
            if (s.includes('32GB') || s.includes('64GB')) return 8;
            if (s.includes('16GB')) return 5;
        }
        return 5; // Default mid-range
    }
}

module.exports = ProductNormalizer;
