/**
 * Deal Intelligence Engine
 * Tracks price history and identifies price drops for "Deal" badges
 */

const fs = require('fs');
const path = require('path');

class DealIntelligenceEngine {
    constructor(dataDir = './data') {
        this.dataDir = dataDir;
        this.priceHistoryFile = path.join(dataDir, 'price_history.json');
        this.priceHistory = this.loadPriceHistory();
    }

    loadPriceHistory() {
        try {
            if (fs.existsSync(this.priceHistoryFile)) {
                return JSON.parse(fs.readFileSync(this.priceHistoryFile, 'utf8'));
            }
        } catch (e) {
            console.error('Error loading price history:', e);
        }
        return {};
    }

    savePriceHistory() {
        try {
            if (!fs.existsSync(this.dataDir)) {
                fs.mkdirSync(this.dataDir, { recursive: true });
            }
            fs.writeFileSync(this.priceHistoryFile, JSON.stringify(this.priceHistory, null, 2));
        } catch (e) {
            console.error('Error saving price history:', e);
        }
    }

    trackPrice(productId, price, merchantName, timestamp = Date.now()) {
        if (!this.priceHistory[productId]) {
            this.priceHistory[productId] = {
                productId,
                history: []
            };
        }

        this.priceHistory[productId].history.push({
            price: parseFloat(price),
            merchant: merchantName,
            timestamp
        });

        // Keep only last 90 days
        const ninetyDaysAgo = Date.now() - (90 * 24 * 60 * 60 * 1000);
        this.priceHistory[productId].history = this.priceHistory[productId].history
            .filter(entry => entry.timestamp > ninetyDaysAgo)
            .sort((a, b) => a.timestamp - b.timestamp);
    }

    getPriceStats(productId, days = 30) {
        const product = this.priceHistory[productId];
        if (!product || product.history.length === 0) {
            return null;
        }

        const cutoff = Date.now() - (days * 24 * 60 * 60 * 1000);
        const recentPrices = product.history
            .filter(entry => entry.timestamp > cutoff)
            .map(entry => entry.price);

        if (recentPrices.length === 0) return null;

        const minPrice = Math.min(...recentPrices);
        const maxPrice = Math.max(...recentPrices);
        const avgPrice = recentPrices.reduce((a, b) => a + b, 0) / recentPrices.length;
        const currentPrice = recentPrices[recentPrices.length - 1];

        return {
            minPrice,
            maxPrice,
            avgPrice,
            currentPrice,
            priceChange: currentPrice - avgPrice,
            priceChangePercent: ((currentPrice - avgPrice) / avgPrice) * 100
        };
    }

    detectDeal(productId, currentPrice, days = 30) {
        const stats = this.getPriceStats(productId, days);
        if (!stats) {
            return { isDeal: false, badge: null, savings: 0 };
        }

        const savingsPercent = ((stats.avgPrice - currentPrice) / stats.avgPrice) * 100;
        const isAtMinPrice = Math.abs(currentPrice - stats.minPrice) < 0.01;

        // Deal criteria
        let badge = null;
        let isDeal = false;

        if (isAtMinPrice && savingsPercent > 10) {
            badge = `Best Price in ${days} Days`;
            isDeal = true;
        } else if (savingsPercent > 15) {
            badge = `Top Value (-${Math.round(savingsPercent)}%)`;
            isDeal = true;
        } else if (savingsPercent > 5) {
            badge = `Good Deal (-${Math.round(savingsPercent)}%)`;
            isDeal = true;
        }

        return {
            isDeal,
            badge,
            savings: stats.avgPrice - currentPrice,
            savingsPercent: Math.round(savingsPercent * 10) / 10
        };
    }

    getTopDeals(limit = 50) {
        const deals = [];

        for (const productId in this.priceHistory) {
            const product = this.priceHistory[productId];
            if (product.history.length === 0) continue;

            const currentPrice = product.history[product.history.length - 1].price;
            const dealInfo = this.detectDeal(productId, currentPrice);

            if (dealInfo.isDeal) {
                deals.push({
                    productId,
                    ...dealInfo,
                    currentPrice
                });
            }
        }

        // Sort by savings percent (best deals first)
        return deals
            .sort((a, b) => b.savingsPercent - a.savingsPercent)
            .slice(0, limit);
    }

    updatePrices(products) {
        products.forEach(product => {
            if (product.aw_product_id && product.search_price) {
                this.trackPrice(
                    product.aw_product_id,
                    product.search_price,
                    product.merchant_name || 'Unknown'
                );
            }
        });

        this.savePriceHistory();
    }
}

module.exports = DealIntelligenceEngine;
