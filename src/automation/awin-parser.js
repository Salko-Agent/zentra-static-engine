const fs = require('fs');
const CategoryMapper = require('../utils/category-mapper');

/**
 * AWIN Parser Module
 * Reads CSV, parses content, sanitizes data, maps categories, and returns normalized objects.
 */

function parseCSVLine(line) {
    const row = [];
    let current = '';
    let inQuote = false;

    for (let i = 0; i < line.length; i++) {
        const char = line[i];
        if (char === '"') {
            inQuote = !inQuote;
        } else if (char === ',' && !inQuote) {
            row.push(current);
            current = '';
        } else {
            current += char;
        }
    }
    row.push(current);
    return row.map(cell => {
        let val = cell.trim();
        if (val.startsWith('"') && val.endsWith('"')) {
            val = val.slice(1, -1);
        }
        return val.replace(/""/g, '"'); // Unescape double quotes
    });
}

function processFeed(filePath) {
    if (!fs.existsSync(filePath)) {
        console.error(`Error: CSV file not found at ${filePath}`);
        return [];
    }

    try {
        const fileContent = fs.readFileSync(filePath, 'utf8');
        const lines = fileContent.split(/\r?\n/);

        if (lines.length < 2) return [];

        // Parse Headers
        const headers = parseCSVLine(lines[0]);
        // Map header names to indices for easier access
        const h = headers.reduce((acc, curr, idx) => {
            acc[curr.trim()] = idx;
            return acc;
        }, {});

        const products = [];

        for (let i = 1; i < lines.length; i++) {
            const line = lines[i];
            if (!line.trim()) continue;

            const row = parseCSVLine(line);

            // Basic Integrity Check
            if (row.length < headers.length - 2) continue; // Allow some slop but not too much

            // Extract Core Fields (AWIN Standard)
            const name = row[h['product_name']];
            const price = row[h['search_price']];
            const description = row[h['description']];
            let image = row[h['merchant_image_url']];
            const deep_link = row[h['aw_deep_link']];
            const category = row[h['category_name']];
            const merchant = row[h['merchant_name']];
            const id = row[h['aw_product_id']];
            const currency = row[h['currency']] || 'EUR';
            const brand = row[h['brand_name']] || merchant;

            // --- FILTERS ---

            // 1. Critical Data Missing
            if (!name || !price || !image) continue;

            // 2. Price Filter (Skip extremely cheap junk < 5€ unless it's a specific part)
            const numericPrice = parseFloat(price);
            if (isNaN(numericPrice) || numericPrice < 5.0) continue;

            // 3. Image Validation (Basic URL check)
            if (!image.startsWith('http')) {
                image = '/assets/images/product-placeholder.png';
            }

            // --- NORMALIZATION ---

            // Slug Generation
            const slug = name.toLowerCase()
                .replace(/[^a-z0-9]+/g, '-')
                .replace(/(^-|-$)/g, '');

            // Category Mapping
            const catSlug = CategoryMapper.getSlug(category);

            // Skip "Lifestyle" if we want to be strict (USER requested filters)
            // For now we keep them but maybe deprioritize them in the UI

            products.push({
                product_name: name,
                description: description || name,
                search_price: price,
                currency: currency,
                merchant_image_url: image,
                aw_deep_link: deep_link,
                merchant_name: merchant,
                brand: brand,
                aw_product_id: id,
                catSlug: catSlug,
                slug: slug,
                local_link: `/produkte/${catSlug}/${slug}.html`
            });
        }

        console.log(`AWIN Parser: Processed ${lines.length} lines. Valid Products: ${products.length}`);
        return products;

    } catch (e) {
        console.error("AWIN Parser Critical Error:", e);
        return [];
    }
}

module.exports = { processFeed };
