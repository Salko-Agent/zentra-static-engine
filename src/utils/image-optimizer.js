const fs = require('fs');
const path = require('path');
const https = require('https');
const crypto = require('crypto');

/**
 * Image Optimizer Module
 * Goals:
 * 1. CLS Protection: Enforce Aspect Ratios
 * 2. LCP Optimization: Optional Local Caching (Smart Proxy)
 * 3. Fallback Handling
 */
class ImageOptimizer {
    constructor(config) {
        this.cacheDir = path.join(config.distDir, 'assets', 'images', 'cache');
        this.placeholderPath = '/assets/images/product-placeholder.png';

        // Ensure cache directory
        if (!fs.existsSync(this.cacheDir)) {
            fs.mkdirSync(this.cacheDir, { recursive: true });
        }
    }

    /**
     * Generates optimized HTML attributes for an image
     * @param {string} url - The external image URL
     * @param {string} alt - Alt text
     * @param {string} priority - 'high' (LCP) or 'lazy'
     * @returns {string} HTML attributes string
     */
    generateImgAttributes(url, alt, priority = 'lazy') {
        const safeUrl = this.validateUrl(url);
        const loading = priority === 'high' ? 'eager' : 'lazy';

        // Standard Product Aspect Ratio: 1:1 (Square)
        // We strictly enforce this via HTML attributes AND CSS to prevent layout shifts.
        const width = 800;
        const height = 800;

        return `src="${safeUrl}" alt="${this.sanitizeAlt(alt)}" width="${width}" height="${height}" loading="${loading}" style="aspect-ratio: 1/1; object-fit: contain; background-color: #f0f0f0;" onerror="this.onerror=null;this.src='${this.placeholderPath}';"`;
    }

    validateUrl(url) {
        if (!url || !url.startsWith('http')) {
            return this.placeholderPath;
        }
        return url;
    }

    sanitizeAlt(text) {
        if (!text) return 'Product Image';
        return text.replace(/"/g, '&quot;');
    }

    // Future Feature: Download and cache to avoid hotlinking
    // async cacheImage(url) { ... }
}

module.exports = ImageOptimizer;
