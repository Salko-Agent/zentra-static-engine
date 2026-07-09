// Zentra Services - International Translation System
// Auto-detects browser language and provides DE/EN toggle

const translations = {
    de: {
        // Navigation
        'nav.hub': 'HUB',
        'nav.supply': 'SUPPLY',
        'nav.intel': 'INTEL',
        'nav.about': 'ÜBER',
        'nav.faq': 'FAQ',
        'nav.contact': 'KONTAKT',
        'nav.search': 'SUCHE',
        
        // Hero Section
        'hero.title': 'Der Hub für präzise Tech & Makers',
        'hero.subtitle': 'Das kuratierte Ökosystem für verifizierte Hardware, Modellbau-Kits und Tech-Intelligence.',
        'hero.cta.explore': 'Entdecke Supply',
        'hero.cta.intel': 'Lies Intel',
        
        // Stats
        'stats.products': 'Produkte',
        'stats.categories': 'Kategorien',
        'stats.merchants': 'Händler',
        'stats.updated': 'Täglich aktualisiert',
        
        // Supply (Products)
        'supply.title': 'Supply Matrix',
        'supply.subtitle': 'Verifizierte Hardware von vertrauenswürdigen Händlern',
        'supply.filter.all': 'Alle Kategorien',
        'supply.button': 'Details anzeigen',
        'supply.price.from': 'ab',
        'supply.vat.included': 'Inkl. MwSt. + Versand',
        
        // Intel (News)
        'intel.title': 'Intel Feed',
        'intel.subtitle': 'Die neuesten Tech-News aus vertrauenswürdigen Quellen',
        'intel.button': 'Artikel lesen',
        'intel.source': 'Quelle',
        
        // Categories
        'cat.model-kits': 'Modellbau-Kits',
        'cat.lifestyle': 'Lifestyle',
        'cat.accessories': 'Zubehör',
        'cat.hardware': 'Hardware',
        'cat.tech': 'Tech',
        'cat.audio': 'Audio',
        'cat.software': 'Software',
        
        // Footer
        'footer.platform': 'Plattform',
        'footer.resources': 'Ressourcen',
        'footer.legal': 'Rechtliches',
        'footer.connect': 'Verbinden',
        'footer.disclosure': 'Affiliate-Offenlegung',
        'footer.privacy': 'Datenschutz',
        'footer.imprint': 'Impressum',
        'footer.b2b': 'B2B Anfragen',
        'footer.newsletter': 'Newsletter',
        'footer.copyright': 'Alle Rechte vorbehalten.',
        'footer.built': 'Gebaut mit Präzision in Österreich',
        
        // Search
        'search.placeholder': 'Suche nach Produkten, Marken, Kategorien...',
        'search.results': 'Ergebnisse gefunden',
        'search.no-results': 'Keine Ergebnisse gefunden',
        'search.try-different': 'Versuche einen anderen Suchbegriff',
        
        // Common
        'common.loading': 'Lädt...',
        'common.error': 'Fehler',
        'common.read-more': 'Mehr lesen',
        'common.view-all': 'Alle anzeigen',
        'common.close': 'Schließen',
        'common.language': 'Sprache'
    },
    en: {
        // Navigation
        'nav.hub': 'HUB',
        'nav.supply': 'SUPPLY',
        'nav.intel': 'INTEL',
        'nav.about': 'ABOUT',
        'nav.faq': 'FAQ',
        'nav.contact': 'CONTACT',
        'nav.search': 'SEARCH',
        
        // Hero Section
        'hero.title': 'The Hub for Precision Tech & Makers',
        'hero.subtitle': 'The curated ecosystem for verified hardware, model kits, and tech intelligence.',
        'hero.cta.explore': 'Explore Supply',
        'hero.cta.intel': 'Read Intel',
        
        // Stats
        'stats.products': 'Products',
        'stats.categories': 'Categories',
        'stats.merchants': 'Merchants',
        'stats.updated': 'Daily Updated',
        
        // Supply (Products)
        'supply.title': 'Supply Matrix',
        'supply.subtitle': 'Verified hardware from trusted merchants',
        'supply.filter.all': 'All Categories',
        'supply.button': 'View Details',
        'supply.price.from': 'from',
        'supply.vat.included': 'Incl. VAT + Shipping',
        
        // Intel (News)
        'intel.title': 'Intel Feed',
        'intel.subtitle': 'Latest tech news from trusted sources',
        'intel.button': 'Read Article',
        'intel.source': 'Source',
        
        // Categories
        'cat.model-kits': 'Model Kits',
        'cat.lifestyle': 'Lifestyle',
        'cat.accessories': 'Accessories',
        'cat.hardware': 'Hardware',
        'cat.tech': 'Tech',
        'cat.audio': 'Audio',
        'cat.software': 'Software',
        
        // Footer
        'footer.platform': 'Platform',
        'footer.resources': 'Resources',
        'footer.legal': 'Legal',
        'footer.connect': 'Connect',
        'footer.disclosure': 'Affiliate Disclosure',
        'footer.privacy': 'Privacy',
        'footer.imprint': 'Imprint',
        'footer.b2b': 'B2B Inquiries',
        'footer.newsletter': 'Newsletter',
        'footer.copyright': 'All rights reserved.',
        'footer.built': 'Built with precision in Austria',
        
        // Search
        'search.placeholder': 'Search for products, brands, categories...',
        'search.results': 'results found',
        'search.no-results': 'No results found',
        'search.try-different': 'Try a different search term',
        
        // Common
        'common.loading': 'Loading...',
        'common.error': 'Error',
        'common.read-more': 'Read more',
        'common.view-all': 'View all',
        'common.close': 'Close',
        'common.language': 'Language'
    }
};

class I18n {
    constructor() {
        this.currentLang = this.detectLanguage();
        this.init();
    }

    detectLanguage() {
        // 1. Check localStorage
        const saved = localStorage.getItem('zentra_lang');
        if (saved && (saved === 'de' || saved === 'en')) {
            return saved;
        }

        // 2. Check browser language
        const browserLang = navigator.language || navigator.userLanguage;
        if (browserLang.startsWith('de')) {
            return 'de';
        }

        // 3. Default to English for international visitors
        return 'en';
    }

    init() {
        // Set HTML lang attribute
        document.documentElement.lang = this.currentLang;

        // Translate all elements with data-i18n
        this.translatePage();

        // Create language toggle if not exists
        this.createLanguageToggle();

        // Track language in Analytics
        if (typeof gtag !== 'undefined') {
            gtag('event', 'language_detected', {
                'language': this.currentLang,
                'browser_lang': navigator.language
            });
        }
    }

    translatePage() {
        const elements = document.querySelectorAll('[data-i18n]');
        elements.forEach(el => {
            const key = el.getAttribute('data-i18n');
            const translation = this.t(key);
            
            if (el.hasAttribute('data-i18n-placeholder')) {
                el.placeholder = translation;
            } else {
                el.textContent = translation;
            }
        });
    }

    t(key) {
        return translations[this.currentLang][key] || key;
    }

    switchLanguage(lang) {
        if (lang !== 'de' && lang !== 'en') return;

        this.currentLang = lang;
        localStorage.setItem('zentra_lang', lang);
        document.documentElement.lang = lang;

        // Translate page
        this.translatePage();

        // Update toggle button
        const toggle = document.getElementById('lang-toggle');
        if (toggle) {
            toggle.textContent = lang.toUpperCase();
        }

        // Track switch in Analytics
        if (typeof gtag !== 'undefined') {
            gtag('event', 'language_switch', {
                'new_language': lang
            });
        }

        // Show notification
        this.showNotification(
            lang === 'de' ? 'Sprache auf Deutsch geändert' : 'Language changed to English'
        );
    }

    createLanguageToggle() {
        // Check if toggle already exists
        if (document.getElementById('lang-toggle')) return;

        // Create toggle button
        const toggle = document.createElement('button');
        toggle.id = 'lang-toggle';
        toggle.className = 'lang-toggle';
        toggle.textContent = this.currentLang.toUpperCase();
        toggle.title = this.currentLang === 'de' ? 'Switch to English' : 'Auf Deutsch wechseln';
        
        toggle.onclick = () => {
            const newLang = this.currentLang === 'de' ? 'en' : 'de';
            this.switchLanguage(newLang);
        };

        // Add to navigation actions (after search icon)
        const navActions = document.querySelector('.nav-actions.flex-center');
        if (navActions) {
            toggle.style.cssText = `
                padding: 8px 16px;
                background: rgba(0, 240, 255, 0.1);
                border: 1px solid var(--accent-cyan);
                color: var(--accent-cyan);
                font-family: var(--font-mono);
                font-size: 0.875rem;
                font-weight: 700;
                border-radius: 6px;
                cursor: pointer;
                transition: all 0.3s ease;
                margin-left: 0px;
            `;
            navActions.appendChild(toggle);
        }
    }

    showNotification(message) {
        const notification = document.createElement('div');
        notification.className = 'i18n-notification';
        notification.textContent = message;
        notification.style.cssText = `
            position: fixed;
            top: 100px;
            right: 20px;
            background: rgba(0, 240, 255, 0.9);
            color: #000;
            padding: 15px 25px;
            border-radius: 8px;
            font-family: var(--font-mono);
            font-size: 0.875rem;
            font-weight: 600;
            z-index: 10000;
            animation: slideIn 0.3s ease;
        `;

        document.body.appendChild(notification);

        setTimeout(() => {
            notification.style.animation = 'slideOut 0.3s ease';
            setTimeout(() => notification.remove(), 300);
        }, 2000);
    }

    getCurrentLanguage() {
        return this.currentLang;
    }
}

// Auto-init on page load
let i18n;
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        i18n = new I18n();
    });
} else {
    i18n = new I18n();
}

// Add animation styles
const style = document.createElement('style');
style.textContent = `
    @keyframes slideIn {
        from {
            transform: translateX(400px);
            opacity: 0;
        }
        to {
            transform: translateX(0);
            opacity: 1;
        }
    }

    @keyframes slideOut {
        from {
            transform: translateX(0);
            opacity: 1;
        }
        to {
            transform: translateX(400px);
            opacity: 0;
        }
    }

    .lang-toggle:hover {
        background: rgba(0, 240, 255, 0.2);
        transform: translateY(-2px);
        box-shadow: 0 4px 12px rgba(0, 240, 255, 0.3);
    }

    .lang-toggle:active {
        transform: translateY(0);
    }
`;
document.head.appendChild(style);
