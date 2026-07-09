// Enhanced Analytics Tracking für Zentra Services
// Tracks: Search queries, Affiliate clicks, Category views, Product views

(function() {
    'use strict';

    // Helper: Debounce function
    function debounce(func, wait) {
        let timeout;
        return function executedFunction(...args) {
            const later = () => {
                clearTimeout(timeout);
                func(...args);
            };
            clearTimeout(timeout);
            timeout = setTimeout(later, wait);
        };
    }

    // 1. Track Search Queries
    function trackSearchQuery(query, resultsCount = 0) {
        if (!window.gtag || !query) return;
        
        gtag('event', 'search', {
            'search_term': query,
            'search_results': resultsCount,
            'event_category': 'Search',
            'event_label': query
        });

        console.log('[Analytics] Search tracked:', query, 'Results:', resultsCount);
    }

    // 2. Track Affiliate Clicks
    function trackAffiliateClick(productName, productId, merchantName, price = '') {
        if (!window.gtag) return;

        gtag('event', 'click', {
            'event_category': 'Affiliate',
            'event_label': `${merchantName} - ${productName}`,
            'value': parseFloat(price) || 0,
            'product_id': productId,
            'merchant': merchantName
        });

        // Enhanced E-commerce tracking
        gtag('event', 'select_content', {
            'content_type': 'product',
            'item_id': productId,
            'item_name': productName,
            'item_brand': merchantName,
            'price': price
        });

        console.log('[Analytics] Affiliate click tracked:', productName);
    }

    // 3. Track Category Views
    function trackCategoryView(categoryName, productCount = 0) {
        if (!window.gtag || !categoryName) return;

        gtag('event', 'view_item_list', {
            'event_category': 'Category',
            'event_label': categoryName,
            'item_list_name': categoryName,
            'items': [{
                'item_name': categoryName,
                'quantity': productCount
            }]
        });

        console.log('[Analytics] Category view tracked:', categoryName);
    }

    // 4. Track Product Views
    function trackProductView(productName, productId, category, price = '', merchant = '') {
        if (!window.gtag || !productName) return;

        gtag('event', 'view_item', {
            'event_category': 'Product',
            'event_label': productName,
            'items': [{
                'item_id': productId,
                'item_name': productName,
                'item_category': category,
                'item_brand': merchant,
                'price': parseFloat(price) || 0
            }]
        });

        console.log('[Analytics] Product view tracked:', productName);
    }

    // 5. Track Newsletter Signup
    function trackNewsletterSignup(email = '') {
        if (!window.gtag) return;

        gtag('event', 'generate_lead', {
            'event_category': 'Newsletter',
            'event_label': 'Signup'
        });

        console.log('[Analytics] Newsletter signup tracked');
    }

    // 6. Track 404 Errors
    function track404Error(url) {
        if (!window.gtag || !url) return;

        gtag('event', 'exception', {
            'description': '404 Error: ' + url,
            'fatal': false,
            'event_category': 'Error'
        });

        console.log('[Analytics] 404 tracked:', url);
    }

    // 7. Track Scroll Depth
    let scrollTracked = {25: false, 50: false, 75: false, 100: false};
    function trackScrollDepth() {
        const scrollPercent = Math.round((window.scrollY / (document.documentElement.scrollHeight - window.innerHeight)) * 100);
        
        [25, 50, 75, 100].forEach(threshold => {
            if (scrollPercent >= threshold && !scrollTracked[threshold]) {
                scrollTracked[threshold] = true;
                
                if (window.gtag) {
                    gtag('event', 'scroll', {
                        'event_category': 'Engagement',
                        'event_label': `${threshold}% scrolled`,
                        'value': threshold
                    });
                }
            }
        });
    }

    // 8. Track Time on Page
    let startTime = Date.now();
    function trackTimeOnPage() {
        const timeSpent = Math.round((Date.now() - startTime) / 1000); // seconds
        
        if (window.gtag && timeSpent > 10) { // Only track if > 10s
            gtag('event', 'timing_complete', {
                'name': 'time_on_page',
                'value': timeSpent,
                'event_category': 'Engagement',
                'event_label': document.title
            });
        }
    }

    // Initialize Event Listeners
    function init() {
        console.log('[Analytics] Enhanced tracking initialized');

        // Track affiliate clicks (data-affiliate-track attribute)
        document.addEventListener('click', function(e) {
            const affiliateLink = e.target.closest('[data-affiliate-track]');
            if (affiliateLink) {
                const trackData = affiliateLink.getAttribute('data-affiliate-track').split('|');
                trackAffiliateClick(
                    affiliateLink.textContent || 'Unknown Product',
                    trackData[1] || 'unknown-id',
                    trackData[0] || 'Unknown Merchant',
                    trackData[2] || ''
                );
            }
        });

        // Track search queries from search modal
        const searchModal = document.getElementById('search-results');
        if (searchModal) {
            const searchObserver = new MutationObserver(function(mutations) {
                const searchInput = document.getElementById('search-input');
                if (searchInput && searchInput.value) {
                    const results = document.querySelectorAll('.search-result-item');
                    trackSearchQuery(searchInput.value, results.length);
                }
            });
            searchObserver.observe(searchModal, { childList: true, subtree: true });
        }

        // Track scroll depth (debounced)
        window.addEventListener('scroll', debounce(trackScrollDepth, 500));

        // Track time on page before leaving
        window.addEventListener('beforeunload', trackTimeOnPage);

        // Auto-track category views (if category data exists)
        const categoryHeader = document.querySelector('.category-header');
        if (categoryHeader) {
            const categoryName = categoryHeader.querySelector('h1')?.textContent || 'Unknown';
            const productCards = document.querySelectorAll('.product-card');
            trackCategoryView(categoryName, productCards.length);
        }

        // Auto-track product views (if product data exists)
        const productPage = document.querySelector('.product-layout');
        if (productPage) {
            const productName = productPage.querySelector('h1')?.textContent || 'Unknown';
            const productId = productPage.querySelector('[data-product-id]')?.getAttribute('data-product-id') || 'unknown';
            trackProductView(productName, productId, 'Product', '', '');
        }
    }

    // Wait for DOM and gtag
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }

    // Expose functions globally for manual tracking
    window.zentraTracking = {
        search: trackSearchQuery,
        affiliateClick: trackAffiliateClick,
        categoryView: trackCategoryView,
        productView: trackProductView,
        newsletter: trackNewsletterSignup,
        error404: track404Error
    };

})();
