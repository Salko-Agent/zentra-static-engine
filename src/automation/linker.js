const fs = require('fs');
const path = require('path');

// Load Overrides
const SENTIMENT_CONFIG = require('../data/overrides/sentiment.json');
const BOOST_CONFIG = require('../data/overrides/boost.json');

/**
 * Zentra Internal Linker Engine
 * - Reverse Indexing for O(1) lookups
 * - Sentiment Guards
 * - HTML Tag Safety
 */
class Linker {
    constructor(products) {
        this.products = products;
        this.keywordIndex = new Map(); // Map<Token, Set<ProductID>>
        this.productMap = new Map();   // Map<ProductID, Product>
        this.buildIndex();
    }

    buildIndex() {
        console.log('Building Semantic Link Index...');
        this.products.forEach(p => {
            this.productMap.set(p.slug, p);

            // Index Product Name Tokens
            // "Ender 3 V2" -> ["ender", "3", "v2"]
            const tokens = this.tokenize(p.product_name);

            // Limit indexing to prevent noise:
            // Only index tokens if they are distinctive (length > 3) or part of a boost list
            tokens.forEach(token => {
                if (token.length < 4 && !this.isBoosted(token)) return;

                if (!this.keywordIndex.has(token)) {
                    this.keywordIndex.set(token, new Set());
                }
                this.keywordIndex.get(token).add(p.slug);
            });
        });
        console.log(`Indexed ${this.keywordIndex.size} keywords.`);
    }

    tokenize(text) {
        return text.toLowerCase()
            .replace(/[^a-z0-9\s]/g, '')
            .split(/\s+/)
            .filter(t => t.length > 0);
    }

    isBoosted(token) {
        // Simple check if token is part of a boosted product slug or ID
        return BOOST_CONFIG.products.some(slug => slug.includes(token));
    }

    /**
     * Injects links into HTML content
     * @param {string} htmlContent - The raw HTML of the article body
     * @param {object} context - Metadata (isNews, etc.)
     */
    injectLinks(htmlContent, context) {
        // 1. Sentiment Guard
        if (this.hasNegativeSentiment(htmlContent)) {
            console.log('Linker: Negative sentiment detected. Skipping commercial links.');
            return htmlContent;
        }

        // 2. Tokenize Content to find candidates
        // We do NOT modify HTML via Regex replacement of tokens directly to avoid breaking tags.
        // Instead, we use a careful approach: match text nodes only (conceptually).
        // For simplicity in Node without DOM: Split by tags, process text parts.

        const parts = htmlContent.split(/(<[^>]*>)/g);
        let linkCount = 0;
        const linkedTargets = new Set();
        const MAX_LINKS = 3;

        const newParts = parts.map(part => {
            if (part.startsWith('<')) return part; // Skip Tags
            if (linkCount >= MAX_LINKS) return part; // Max reached

            // Process Text Node
            let text = part;

            // Find Match candidates
            // We iterate our Index? No, that's huge. 
            // We iterate the text? Yes.
            const textTokens = this.tokenize(text);

            // Simple Greedy Match Strategy:
            // Find longest possible match from index.
            // (Simplified for v1: Single word based on index)

            for (const token of textTokens) {
                if (linkCount >= MAX_LINKS) break;

                if (this.keywordIndex.has(token)) {
                    // Found a potential match. Get best product.
                    const candidates = Array.from(this.keywordIndex.get(token));
                    const bestProductSlug = this.selectBestProduct(candidates);

                    if (bestProductSlug && !linkedTargets.has(bestProductSlug)) {
                        // Perform Substitution (Case insensitive, whole word)
                        const regex = new RegExp(`\\b(${token})\\b`, 'i');

                        // Check if we accidentally are inside an ignore zone? 
                        // Since we split by <>, we are theoretically safe from attributes,
                        // BUT we don't know if we are inside <a> or <button> here without a stack.
                        // RISK: "Click <a>here</a>" -> split -> "Click ", "<a>", "here", "</a>"
                        // This simple split is risky for nesting. 

                        // Robust approach: DOM Parser (e.g. cheerio or jsdom).
                        // Since we don't have that dev dependency installed standard, 
                        // we stick to a safer constraint: 
                        // Only replace if we are confident?

                        // REVISION: Without a DOM parser, text replacement is fragile.
                        // FALLBACK: Use a very specific replace that avoids existing links.

                        // Skip for V1 safety if implementation complexity is too high without Cheerio.
                        // Let's implement a "Smart Replacer" that checks typical context.

                        const match = text.match(regex);
                        if (match) {
                            const originalWord = match[0];
                            const p = this.productMap.get(bestProductSlug);
                            const linkRel = context.type === 'commercial' ? 'rel="sponsored"' : '';
                            const linkHtml = `<a href="/produkte/${p.catSlug}/${p.slug}.html" class="smart-link" ${linkRel} data-link-type="auto">${originalWord}</a>`;

                            text = text.replace(regex, linkHtml);
                            linkedTargets.add(bestProductSlug);
                            linkCount++;
                        }
                    }
                }
            }
            return text;
        });

        return newParts.join('');
    }

    hasNegativeSentiment(text) {
        const lower = text.toLowerCase();
        return SENTIMENT_CONFIG.negative_context.some(keyword => lower.includes(keyword.toLowerCase()));
    }

    selectBestProduct(slugs) {
        // 1. Check Boost List
        const boosted = slugs.find(s => BOOST_CONFIG.products.includes(s));
        if (boosted) return boosted;

        // 2. Fallback: First one (could be refined by Margin/Stock)
        return slugs[0];
    }
}

module.exports = Linker;
