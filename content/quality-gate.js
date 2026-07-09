/**
 * Content Quality Gate
 * Validates cluster pages before publishing
 */

class ContentQualityGate {

    static validate(page) {
        const errors = [];
        const warnings = [];

        // 1. Unique Value Check
        if (page.wordCount < 500) {
            errors.push('Content too short (min 500 words)');
        }

        if (page.duplicateRatio && page.duplicateRatio > 0.3) {
            errors.push(`Duplicate content ratio too high: ${(page.duplicateRatio * 100).toFixed(1)}%`);
        }

        // 2. Real Offer Data
        if (!page.products || page.products.length < 3) {
            errors.push('Insufficient product data (min 3 products required)');
        }

        const validProducts = page.products.filter(p =>
            p.price &&
            p.merchantScore >= 50 &&
            p.affiliateLink &&
            p.affiliateLink !== '#'
        );

        if (validProducts.length < page.products.length * 0.8) {
            warnings.push(`Only ${validProducts.length}/${page.products.length} products have valid data`);
        }

        // 3. Correct Internal Links
        if (!page.internalLinks || page.internalLinks.length < 2) {
            warnings.push('Few internal links (recommended: 3+)');
        }

        const brokenLinks = page.internalLinks.filter(link => {
            // TODO: Check if link targets exist
            return false;
        });

        if (brokenLinks.length > 0) {
            errors.push(`${brokenLinks.length} broken internal links`);
        }

        // 4. Valid Schema
        if (!page.schema || !page.schema['@type']) {
            errors.push('Missing Schema.org markup');
        }

        if (page.schema && page.schema['@type'] === 'ItemList' && (!page.schema.itemListElement || page.schema.itemListElement.length === 0)) {
            errors.push('ItemList schema has no items');
        }

        // 5. SEO Basics
        if (!page.title || page.title.length > 60) {
            warnings.push('Title length not optimal (recommended: 50-60 chars)');
        }

        if (!page.metaDescription || page.metaDescription.length > 160) {
            warnings.push('Meta description length not optimal (recommended: 150-160 chars)');
        }

        // 6. Affiliate Disclosure
        if (page.affiliateLinks && page.affiliateLinks.length > 0 && !page.affiliateDisclosure) {
            errors.push('Affiliate links present but no disclosure');
        }

        // Result
        const passed = errors.length === 0;

        return {
            passed,
            errors,
            warnings,
            score: this._calculateScore(errors, warnings),
            recommendation: this._getRecommendation(errors, warnings)
        };
    }

    static _calculateScore(errors, warnings) {
        let score = 100;
        score -= errors.length * 20;
        score -= warnings.length * 5;
        return Math.max(0, score);
    }

    static _getRecommendation(errors, warnings) {
        if (errors.length > 0) {
            return 'BLOCK: Fix all errors before publishing';
        }
        if (warnings.length > 3) {
            return 'REVIEW: Multiple warnings detected';
        }
        if (warnings.length > 0) {
            return 'PASS_WITH_WARNINGS: Can publish but improvements recommended';
        }
        return 'PASS: Ready to publish';
    }
}

module.exports = ContentQualityGate;
