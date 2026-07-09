/**
 * Affiliate Click Tracking - Beacon API
 * Client-side JavaScript for reliable affiliate conversion tracking
 */

(function () {
    'use strict';

    // Track affiliate click via Beacon API
    function trackAffiliateClick(element) {
        const trackingData = element.dataset.affiliateTrack;
        if (!trackingData) return true;

        const [merchant, productId, slotPosition] = trackingData.split('|');

        const payload = JSON.stringify({
            event: 'affiliate_click',
            page_type: window.location.pathname.includes('/produkte/') ? 'product' :
                window.location.pathname.includes('/best/') ? 'best' :
                    window.location.pathname.includes('/vergleich/') ? 'vergleich' : 'other',
            page_url: window.location.href,
            merchant: merchant || 'unknown',
            product_id: productId || 'unknown',
            slot_position: parseInt(slotPosition) || 0,
            timestamp: new Date().toISOString()
        });

        // Beacon API = reliable (sends even if page unloads)
        if (navigator.sendBeacon) {
            const sent = navigator.sendBeacon('/api/track/affiliate', payload);
            if (!sent) {
                console.warn('Beacon API failed, falling back to gtag');
                fallbackToGtag(merchant, productId, slotPosition);
            }
        } else {
            // Fallback for older browsers
            fallbackToGtag(merchant, productId, slotPosition);
        }

        return true; // Allow link to proceed
    }

    function fallbackToGtag(merchant, productId, slotPosition) {
        if (typeof gtag !== 'undefined') {
            gtag('event', 'affiliate_click', {
                merchant: merchant,
                product_id: productId,
                slot_position: slotPosition,
                page_url: window.location.href
            });
        }
    }

    // Auto-attach to all affiliate links on page load
    document.addEventListener('DOMContentLoaded', function () {
        const affiliateLinks = document.querySelectorAll('a[data-affiliate-track]');

        affiliateLinks.forEach(link => {
            link.addEventListener('click', function (e) {
                trackAffiliateClick(this);
            });
        });

        console.log(`[Tracking] Initialized ${affiliateLinks.length} affiliate links`);
    });

    // Expose globally for inline onclick handlers (backup)
    window.trackAffiliateClick = trackAffiliateClick;

})();
