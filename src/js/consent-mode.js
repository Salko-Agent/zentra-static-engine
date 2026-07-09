/**
 * Google Consent Mode v2 Implementation
 * GDPR-compliant AdSense integration with delayed script loading
 */

(function () {
    'use strict';

    // Default: deny all consent (GDPR requirement)
    if (typeof gtag === 'function') {
        gtag('consent', 'default', {
            'ad_storage': 'denied',
            'ad_user_data': 'denied',
            'ad_personalization': 'denied',
            'analytics_storage': 'denied'
        });
    }

    // Consent state
    let consentGranted = false;

    // Check for existing consent (from localStorage)
    function checkExistingConsent() {
        try {
            const consent = localStorage.getItem('zentra_consent');
            if (consent) {
                const consentData = JSON.parse(consent);
                const consentAge = Date.now() - consentData.timestamp;
                const MAX_AGE = 365 * 24 * 60 * 60 * 1000; // 1 year

                if (consentAge < MAX_AGE && consentData.granted) {
                    updateConsent(true);
                    return true;
                }
            }
        } catch (e) {
            console.error('Consent check error:', e);
        }
        return false;
    }

    // Update consent
    function updateConsent(granted) {
        consentGranted = granted;

        if (typeof gtag === 'function') {
            gtag('consent', 'update', {
                'ad_storage': granted ? 'granted' : 'denied',
                'ad_user_data': granted ? 'granted' : 'denied',
                'ad_personalization': granted ? 'granted' : 'denied',
                'analytics_storage': granted ? 'granted' : 'denied'
            });
        }

        // Save consent
        try {
            localStorage.setItem('zentra_consent', JSON.stringify({
                granted: granted,
                timestamp: Date.now()
            }));
        } catch (e) {
            console.error('Consent save error:', e);
        }

        // Load AdSense if granted
        if (granted) {
            loadAdSense();
        }

        // Hide banner
        hideBanner();
    }

    // Load AdSense script dynamically
    function loadAdSense() {
        if (document.querySelector('script[src*="adsbygoogle"]')) {
            console.log('[Consent] AdSense already loaded');
            return;
        }

        console.log('[Consent] Loading AdSense script...');
        const script = document.createElement('script');
        script.src = 'https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=ca-pub-9641197173417820';
        script.async = true;
        script.crossOrigin = 'anonymous';
        script.onload = () => {
            console.log('[Consent] AdSense loaded successfully');
            initializeAds();
        };
        script.onerror = () => {
            console.error('[Consent] AdSense failed to load');
        };
        document.head.appendChild(script);
    }

    // Initialize ads after consent
    function initializeAds() {
        const adSlots = document.querySelectorAll('.adsbygoogle');
        adSlots.forEach((ad, index) => {
            if (!ad.dataset.adsbygoogleStatus) {
                try {
                    (adsbygoogle = window.adsbygoogle || []).push({});
                    console.log(`[AdSense] Initialized ad slot ${index + 1}`);
                } catch (e) {
                    console.error(`[AdSense] Error initializing ad slot ${index + 1}:`, e);
                }
            }
        });
    }

    // Show consent banner
    function showBanner() {
        const bannerHTML = `
            <div id="consent-banner" style="
                position: fixed;
                bottom: 0;
                left: 0;
                right: 0;
                background: rgba(10, 10, 15, 0.98);
                border-top: 1px solid rgba(0, 240, 255, 0.3);
                padding: 20px;
                z-index: 10000;
                backdrop-filter: blur(10px);
                box-shadow: 0 -4px 20px rgba(0, 0, 0, 0.5);
            ">
                <div style="max-width: 1200px; margin: 0 auto; display: flex; align-items: center; justify-content: space-between; gap: 20px; flex-wrap: wrap;">
                    <div style="flex: 1; min-width: 300px;">
                        <p style="margin: 0; color: rgba(255,255,255,0.9); font-size: 14px; line-height: 1.6;">
                            🍪 Wir verwenden Cookies und ähnliche Technologien für Werbung und Analysen. 
                            <a href="/datenschutz" style="color: #00f0ff; text-decoration: underline;">Datenschutz</a>
                        </p>
                    </div>
                    <div style="display: flex; gap: 10px;">
                        <button id="consent-reject" style="
                            background: rgba(255,255,255,0.1);
                            border: 1px solid rgba(255,255,255,0.2);
                            color: rgba(255,255,255,0.7);
                            padding: 10px 20px;
                            border-radius: 4px;
                            cursor: pointer;
                            font-size: 14px;
                            font-weight: 500;
                        ">Ablehnen</button>
                        <button id="consent-accept" style="
                            background: linear-gradient(135deg, #00f0ff, #0080ff);
                            border: none;
                            color: #0a0a0f;
                            padding: 10px 30px;
                            border-radius: 4px;
                            cursor: pointer;
                            font-size: 14px;
                            font-weight: 600;
                        ">Akzeptieren</button>
                    </div>
                </div>
            </div>
        `;

        document.body.insertAdjacentHTML('beforeend', bannerHTML);

        // Event listeners
        document.getElementById('consent-accept').addEventListener('click', () => {
            updateConsent(true);
        });

        document.getElementById('consent-reject').addEventListener('click', () => {
            updateConsent(false);
        });
    }

    // Hide banner
    function hideBanner() {
        const banner = document.getElementById('consent-banner');
        if (banner) {
            banner.style.opacity = '0';
            setTimeout(() => banner.remove(), 300);
        }
    }

    // Initialize on DOM ready
    document.addEventListener('DOMContentLoaded', () => {
        const hasConsent = checkExistingConsent();
        if (!hasConsent) {
            showBanner();
        }
    });

    // Expose for manual override (testing)
    window.ZentraConsent = {
        grant: () => updateConsent(true),
        revoke: () => updateConsent(false),
        status: () => consentGranted
    };

})();
