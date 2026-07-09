const fs = require('fs');
const SeoGenerator = require('./src/utils/seo-generator');
const CategoryMapper = require('./src/utils/category-mapper');
const AwinParser = require('./src/automation/awin-parser');
const Linker = require('./src/automation/linker');
const ImageOptimizer = require('./src/utils/image-optimizer');
const SeoModules = require('./src/utils/seo-modules');
const SchemaGenerator = require('./src/utils/schema-generator');
const ProductNormalizer = require('./src/automation/product-normalizer');
const BuildEngine = require('./src/automation/build-engine');
const path = require('path');
const https = require('https');

// Helper Functions (Wrappers for CategoryMapper)
function getCategoryDisplayName(slug) { return CategoryMapper.getDisplayName(slug); }
function getCategoryIcon(slug) { return CategoryMapper.getIcon(slug); }
function getCategoryDescription(slug) { return CategoryMapper.getDescription(slug); }
function getCategorySlug(name) { return CategoryMapper.getSlug(name); }
function normalizeProduct(p) { return p; }

// Configuration
const CONFIG = {
    srcDir: path.join(__dirname, 'src'),
    distDir: path.join(__dirname, 'dist'),
    productsFile: path.join(__dirname, 'src/data/products.json'),
    templatesDir: path.join(__dirname, 'src/templates'),
    assetsDir: path.join(__dirname, 'assets'),
    newsFeeds: [
        { name: 'The Verge', url: 'https://www.theverge.com/rss/index.xml' },
        { name: 'TechCrunch', url: 'https://techcrunch.com/feed/' }
        // { name: 'Wired', url: 'https://www.wired.com/feed/rss' }
    ],
    newsPerPage: 12,
    csvFile: path.join(__dirname, 'datafeed_2630106.csv')
};

// Shared SEO module instance
const seoModules = new SeoModules(CONFIG);

// ===== SEO: Title/Meta Templates =====
const TITLE_TEMPLATES = {
    deals: (kategorie) => `${kategorie} Deals in Österreich – Heute aktualisiert | Zentra`,
    best: (produktklasse) => `Beste ${produktklasse} in Österreich (2026) – Vergleich & Empfehlungen | Zentra`,
    vergleich: (produktklasse) => `${produktklasse} Vergleich – Preis/Leistung/Alternativen | Zentra`,
    guide: (thema) => `${thema} – Praktischer Ratgeber | Zentra`,
    alternativen: (produkt) => `Alternative zu ${produkt}: Vergleich, Pros/Cons, Preise | Zentra`,
    product: (produktname) => `${produktname} Preisvergleich & Angebote (AT) | Zentra`,
    category: (catName) => `${catName} – Zentra Supply Depot`,
    news: (pageNum) => `Tech News & Intelligence${pageNum > 1 ? ` – Seite ${pageNum}` : ''} | Zentra`
};

const META_TEMPLATES = {
    deals: (kategorie) => `Aktuelle ${kategorie} Deals in Österreich. Täglich aktualisiert, geprüft und kuratiert. Jetzt sparen!`,
    best: (produktklasse) => `Die besten ${produktklasse} in Österreich 2026. Expertenbewertungen, Vergleichstabellen und echte Angebote.`,
    vergleich: (produktklasse) => `${produktklasse} im Vergleich: Preis, Leistung, Ausstattung. Fundierte Entscheidungshilfe für Ihren Kauf.`,
    guide: (thema) => `Praktischer Ratgeber zum Thema ${thema}. Kurz, präzise und umsetzbar.`,
    alternativen: (produkt) => `Alternativen zu ${produkt}: Vergleich, Vor- und Nachteile, Preisübersicht.`,
    product: (produktname) => `${produktname} – Preisvergleich für Österreich. Beste Angebote von verifizierten Händlern.`,
    category: (catName, productCount) => `${productCount} Produkte in ${catName}. Geprüfte Angebote von Top-Händlern.`,
    news: () => `Tech News, Hardware-Trends und Branchenintelligenz. Täglich aktualisiert.`
};

// Helper to make paths relative for file:// preview compatibility
function makeRelative(pathStr) {
    return pathStr.startsWith('/') ? '.' + pathStr : pathStr;
}

// ===== SEO: Canonical/noindex Logic =====
function getCanonicalUrl(url, params) {
    // Remove all parameters for canonical
    return `https://zentra.services${url.split('?')[0]}`;
}

function shouldNoindex(page) {
    // Thin Content Guard
    if (page.wordCount && page.wordCount < 150) return true;
    if (page.offerCount !== undefined && page.offerCount < 1) return true;
    if (page.duplicateRatio && page.duplicateRatio > 0.7) return true;

    // Parameter pages
    if (page.hasParams) return true;

    // Pagination (noindex pages > 1, but keep follow for link equity)
    if (page.pageNum && page.pageNum > 1) return true;

    return false;
}

function getMetaRobots(page) {
    if (shouldNoindex(page)) {
        return 'noindex,follow'; // No index but pass link equity
    }
    return 'index,follow';
}

// ===== RSS Feed Fetching & Parsing =====
function fetchRSS(url) {
    return new Promise((resolve, reject) => {
        https.get(url, { headers: { 'User-Agent': 'Mozilla/5.0' } }, (res) => {
            let data = '';
            res.on('data', chunk => data += chunk);
            res.on('end', () => resolve(data));
        }).on('error', reject);
    });
}

// Global counter for fallback image rotation
let fallbackImageCounter = 0;

function parseRSS(xml, sourceName) {
    const items = [];
    const itemRegex = /<item>([\s\S]*?)<\/item>/g;
    let match;

    while ((match = itemRegex.exec(xml)) !== null) {
        const item = match[1];

        // Extract title
        const titleMatch = item.match(/<title><!\[CDATA\[(.*?)\]\]><\/title>|<title>(.*?)<\/title>/);
        const title = titleMatch ? (titleMatch[1] || titleMatch[2]) : 'Untitled';

        // Extract description
        const descMatch = item.match(/<description><!\[CDATA\[(.*?)\]\]><\/description>|<description>(.*?)<\/description>/s);
        let description = descMatch ? (descMatch[1] || descMatch[2]) : '';
        description = description.replace(/<[^>]+>/g, '').substring(0, 200); // Strip HTML, limit to 200 chars

        // Extract link
        const linkMatch = item.match(/<link>(.*?)<\/link>/) || item.match(/<link\s+[^>]*?href=["'](.*?)["']/);
        const link = linkMatch ? linkMatch[1].trim() : '';

        // Extract pubDate
        const dateMatch = item.match(/<pubDate>(.*?)<\/pubDate>/);
        const pubDate = dateMatch ? new Date(dateMatch[1]) : new Date();

        // Extract image (try multiple strategies - RSS feeds encode images differently)
        let image = null;

        // Strategy 1: media:content (most common in RSS 2.0)
        const mediaMatch = item.match(/<media:content[^>]*url=["'](https?:\/\/[^"']+)["']/);
        if (mediaMatch) {
            image = mediaMatch[1];
        }

        // Strategy 2: media:thumbnail
        if (!image) {
            const thumbMatch = item.match(/<media:thumbnail[^>]*url=["'](https?:\/\/[^"']+)["']/);
            if (thumbMatch) image = thumbMatch[1];
        }

        // Strategy 3: enclosure with type="image/*"
        if (!image) {
            const enclosureMatch = item.match(/<enclosure[^>]*url=["'](https?:\/\/[^"']+)["'][^>]*type=["']image/);
            if (enclosureMatch) image = enclosureMatch[1];
        }

        // Strategy 4: content:encoded (full HTML content - common in TechCrunch, Wired)
        if (!image) {
            const contentMatch = item.match(/<content:encoded><!\[CDATA\[([\s\S]*?)\]\]><\/content:encoded>/);
            if (contentMatch) {
                const content = contentMatch[1];
                // Look for first <img> tag
                const imgMatch = content.match(/<img[^>]+src=["'](https?:\/\/[^"']+)["']/);
                if (imgMatch) image = imgMatch[1];
            }
        }

        // Strategy 5: description with embedded image
        if (!image) {
            const imgInDescMatch = item.match(/<img[^>]+src=["'](https?:\/\/[^"']+)["']/);
            if (imgInDescMatch) image = imgInDescMatch[1];
        }

        // Strategy 6: og:image meta tag in content
        if (!image) {
            const ogImageMatch = item.match(/property=["']og:image["'][^>]*content=["'](https?:\/\/[^"']+)["']/);
            if (ogImageMatch) image = ogImageMatch[1];
        }

        // Fallback: Use category-based Unsplash placeholders (tech-themed)
        if (!image) {
            const unsplashFallbacks = [
                'https://images.unsplash.com/photo-1519389950473-47ba0277781c?auto=format&fit=crop&w=800&q=80', // Tech workspace
                'https://images.unsplash.com/photo-1488590528505-98d2b5aba04b?auto=format&fit=crop&w=800&q=80', // Code
                'https://images.unsplash.com/photo-1518770660439-4636190af475?auto=format&fit=crop&w=800&q=80', // Technology
                'https://images.unsplash.com/photo-1550751827-4bd374c3f58b?auto=format&fit=crop&w=800&q=80', // Circuit board
                'https://images.unsplash.com/photo-1531297484001-80022131f5a1?auto=format&fit=crop&w=800&q=80'  // Laptop
            ];
            // Rotate through fallbacks using global counter
            image = unsplashFallbacks[fallbackImageCounter % unsplashFallbacks.length];
            fallbackImageCounter++;
        }

        // Create slug from title
        const slug = title
            .toLowerCase()
            .replace(/[^a-z0-9]+/g, '-')
            .replace(/^-|-$/g, '')
            .substring(0, 100);

        items.push({
            title: title.trim(),
            description: description.trim(),
            link,
            pubDate,
            source: sourceName,
            image,
            slug: `${slug}-${Date.now().toString(36)}`
        });
    }

    return items;
}

// ===== AWIN: Merchant Scoring (Stage-1) =====
// Trusted AT merchants (manually curated)
const MERCHANT_WHITELIST = [
    'Amazon.at',
    'MediaMarkt.at',
    'Saturn.at',
    'Cyberport.at',
    'Alternate.at',
    'Notebooksbilliger.de', // Ships to AT
    'Mindfactory.de', // Ships to AT
    'Conrad.at',
    'Galaxus.at'
];

function scoreMerchant(merchantName, merchantId = null) {
    let score = 50; // Base score

    if (!merchantName) return score;

    // Stage-1: Manual Whitelist (verified merchants)
    if (MERCHANT_WHITELIST.some(trusted => merchantName.toLowerCase().includes(trusted.toLowerCase()))) {
        score += 30; // +30 for trusted merchant
    }

    // AT-Domain preference
    if (merchantName.toLowerCase().includes('.at')) {
        score += 10; // +10 for Austrian domain
    }

    // TODO Stage-2: Real AWIN API data
    // - Conversion rate from AWIN dashboard
    // - Return policy quality
    // - Shipping reliability to AT

    return Math.min(score, 100); // Cap at 100
}

// ===== AWIN: Dedup Strategy =====
function normalizeProduct(product) {
    // Create normalized key for deduplication
    const brand = (product.brand || '').toLowerCase().trim();
    const model = (product.product_name || '').toLowerCase().trim();

    // Extract core model number/name (remove common words)
    const coreModel = model
        .replace(/\b(neu|new|refurbished|gebraucht|used|original|oem)\b/gi, '')
        .replace(/\s+/g, ' ')
        .trim();

    const normalizedKey = `${brand}|${coreModel}`.substring(0, 200);

    return {
        ...product,
        normalized_key: normalizedKey,
        merchant_score: scoreMerchant(product.merchant_name, product.merchant_id)
    };
}

function selectBestOffer(duplicates) {
    if (duplicates.length === 1) return duplicates[0];

    // Sort by: lowest price * highest merchant score
    return duplicates.sort((a, b) => {
        const scoreA = (parseFloat(a.search_price) || 9999) * (100 - a.merchant_score);
        const scoreB = (parseFloat(b.search_price) || 9999) * (100 - b.merchant_score);
        return scoreA - scoreB;
    })[0];
}

// ===== INTENT ROUTER: Auto-Optimize Monetization Strategy =====
function detectIntent(page) {
    const url = (page.url || '').toLowerCase();
    const content = (page.content || '').toLowerCase();
    const title = (page.title || '').toLowerCase();

    // Buy Intent (Affiliate-first)
    if (url.includes('/best/') || url.includes('/vergleich/') || url.includes('/deals/') || url.includes('/produkte/')) {
        return { intent: 'buy', score: 0.9 };
    }
    if (content.match(/kaufen|preis|angebot|deal|vergleich|beste|top\s\d+/i) ||
        title.match(/beste|vergleich|deal|angebot/i)) {
        return { intent: 'buy', score: 0.7 };
    }

    // Learn Intent (AdSense-first)
    if (url.includes('/guide/') || url.includes('/howto/') || url.includes('/ratgeber/')) {
        return { intent: 'learn', score: 0.9 };
    }
    if (content.match(/wie|anleitung|tutorial|tipps|ratgeber|erklärt|guide/i) ||
        title.match(/wie|anleitung|ratgeber|guide/i)) {
        return { intent: 'learn', score: 0.7 };
    }

    // B2B Intent (Lead-first)
    if (url.includes('/b2b/') || url.includes('/business/') || url.includes('/enterprise/')) {
        return { intent: 'b2b', score: 0.9 };
    }
    if (content.match(/enterprise|business|security|compliance|professional|unternehmen|geschäftlich/i) ||
        (url.includes('/software-lizenzen/') && content.match(/business|enterprise|professional/i))) {
        return { intent: 'b2b', score: 0.8 };
    }

    return { intent: 'mixed', score: 0.5 }; // fallback
}

function applyMonetizationStrategy(page, intentData) {
    const strategy = {
        layout: 'balanced',
        maxAdUnits: 2,
        affiliateSlots: 4,
        ctaType: 'Mehr erfahren',
        leadForm: false,
        newsletterPriority: 'normal'
    };

    switch (intentData.intent) {
        case 'buy':
            // Affiliate-first: prominente Produkt-Cards, minimal AdSense
            strategy.layout = 'affiliate-heavy';
            strategy.maxAdUnits = 1; // nur 1 Ad
            strategy.affiliateSlots = 8; // 8 Produkt-Slots
            strategy.ctaType = 'Zum Angebot →';
            strategy.newsletterPriority = 'low';
            break;

        case 'learn':
            // AdSense-first: 2-3 Ad-Units, Newsletter CTA, wenig Affiliate
            strategy.layout = 'adsense-heavy';
            strategy.maxAdUnits = 3; // 3 Ads
            strategy.affiliateSlots = 2; // nur 2 subtile Affiliates
            strategy.ctaType = 'Mehr erfahren';
            strategy.newsletterPriority = 'high';
            break;

        case 'b2b':
            // Lead-first: Lead-Form prominent, kein AdSense, Affiliate sekundär
            strategy.layout = 'lead-capture';
            strategy.maxAdUnits = 0; // kein AdSense für B2B
            strategy.affiliateSlots = 3;
            strategy.ctaType = 'Kostenlose Beratung anfragen →';
            strategy.leadForm = true;
            strategy.newsletterPriority = 'high';
            break;

        case 'mixed':
        default:
            // Balanced: 1-2 Ads, 4 Affiliate-Slots
            // (already set in defaults)
            break;
    }

    return {
        ...page,
        intent: intentData.intent,
        intentScore: intentData.score,
        strategy
    };
}

// Helper: Read Template
function readTemplate(templateName) {
    return fs.readFileSync(path.join(CONFIG.templatesDir, templateName), 'utf8');
}

// Helper: Simple CSV Parser
function parseCSV(csvText) {
    const lines = csvText.split(/\r?\n/);
    const headers = lines[0].split(',').map(h => h.trim());
    const result = [];

    for (let i = 1; i < lines.length; i++) {
        if (!lines[i].trim()) continue;

        // Handle quoted fields
        const row = [];
        let inQuote = false;
        let current = '';

        for (let j = 0; j < lines[i].length; j++) {
            const char = lines[i][j];
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

        if (row.length === headers.length) {
            const obj = {};
            headers.forEach((h, index) => {
                // Clean quotes
                let val = row[index].trim();
                if (val.startsWith('"') && val.endsWith('"')) {
                    val = val.slice(1, -1);
                }
                obj[h] = val;
            });
            result.push(obj);
        }
    }
    return result;
}

// Helper: Ensure Directory Exists
function ensureDir(dirPath) {
    if (!fs.existsSync(dirPath)) {
        fs.mkdirSync(dirPath, { recursive: true });
    }
}

// Helper: Copy Directory Recursive
function copyDir(src, dest) {
    if (!fs.existsSync(src)) return;
    ensureDir(dest);
    const entries = fs.readdirSync(src, { withFileTypes: true });

    for (let entry of entries) {
        const srcPath = path.join(src, entry.name);
        const destPath = path.join(dest, entry.name);

        if (entry.isDirectory()) {
            copyDir(srcPath, destPath);
        } else {
            fs.copyFileSync(srcPath, destPath);
        }
    }
}

// Helper: Fetch RSS Feed
function fetchRSS(url) {
    return new Promise((resolve, reject) => {
        https.get(url, (res) => {
            let data = '';
            res.on('data', (chunk) => data += chunk);
            res.on('end', () => resolve(data));
        }).on('error', (err) => reject(err));
    });
}

// Helper: Parse RSS XML (Simple Regex based parser for Node environment)
function parseRSS(xml, sourceName) {
    const items = [];
    const itemRegex = /<item>([\s\S]*?)<\/item>/g;
    let match;

    while ((match = itemRegex.exec(xml)) !== null) {
        const itemContent = match[1];

        const getTag = (tag) => {
            const regex = new RegExp(`<${tag}.*?>(.*?)</${tag}>`, 's');
            const m = itemContent.match(regex);
            return m ? m[1].replace(/<!\[CDATA\[(.*?)\]\]>/g, '$1').trim() : '';
        };

        const title = getTag('title');
        const link = getTag('link');
        const pubDate = getTag('pubDate');
        const description = getTag('description').replace(/<[^>]*>/g, '').substring(0, 200) + '...';

        // Extract image if available (media:content or enclosure)
        let image = '';
        const mediaMatch = itemContent.match(/<media:content[^>]*url="([^"]*)"/);
        const enclosureMatch = itemContent.match(/<enclosure[^>]*url="([^"]*)"/);
        const imgTagMatch = itemContent.match(/<img[^>]+src="([^">]+)"/);

        if (mediaMatch) image = mediaMatch[1];
        else if (enclosureMatch) image = enclosureMatch[1];
        else if (imgTagMatch) image = imgTagMatch[1];

        // Fallback based on source if still default
        if (!image || image === '') {
            // Use high-quality generic tech images instead of logos which look bad as covers
            if (sourceName === 'The Verge') image = 'https://images.unsplash.com/photo-1550751827-4bd374c3f58b?auto=format&fit=crop&w=800&q=80'; // Tech/Cyberpunk
            else if (sourceName === 'TechCrunch') image = 'https://images.unsplash.com/photo-1519389950473-47ba0277781c?auto=format&fit=crop&w=800&q=80'; // Coding/Tech
            else if (sourceName === 'Wired') image = 'https://images.unsplash.com/photo-1488590528505-98d2b5aba04b?auto=format&fit=crop&w=800&q=80'; // Circuit/Tech
            else image = 'https://images.unsplash.com/photo-1518770660439-4636190af475?auto=format&fit=crop&w=800&q=80'; // Generic Chip
        }

        // Generate a slug from title
        const slug = title.toLowerCase()
            .replace(/[^a-z0-9]+/g, '-')
            .replace(/(^-|-$)/g, '');

        items.push({
            title,
            link, // Original link
            pubDate: new Date(pubDate),
            description,
            image,
            source: sourceName,
            slug,
            content: getTag('description') // Full content for the article page
        });
    }
    return items;
}

// Sitemap Collector - Type-Based (Phase 3 Enhancement)
let sitemapUrls = {
    deals: [],      // /deals/, deal-specific pages
    products: [],   // /produkte/**
    guides: [],     // /guide/** (future)
    brands: [],     // /brands/** (future)
    merchants: [],  // /merchants/** (future)
    news: [],       // /news/**
    core: []        // Root pages, categories, etc.
};

function addSitemapUrl(urlPath, priority = 0.5, changefreq = 'weekly', type = 'core', lastmod = null) {
    const entry = {
        loc: `https://zentra.services${urlPath}`,
        lastmod: lastmod || new Date().toISOString().split('T')[0],
        changefreq,
        priority
    };

    if (sitemapUrls[type]) {
        sitemapUrls[type].push(entry);
    } else {
        sitemapUrls.core.push(entry); // Fallback
    }
}

function generateSitemapIndex() {
    console.log('Generating Type-Based Sitemap Index...');

    const sitemapFiles = [];
    const MAX_URLS_PER_FILE = 45000;

    // Generate sitemap for each type
    Object.keys(sitemapUrls).forEach(type => {
        const urls = sitemapUrls[type];
        if (urls.length === 0) return; // Skip empty types

        const chunks = Math.ceil(urls.length / MAX_URLS_PER_FILE);

        for (let i = 0; i < chunks; i++) {
            const start = i * MAX_URLS_PER_FILE;
            const end = start + MAX_URLS_PER_FILE;
            const chunk = urls.slice(start, end);

            const filename = chunks > 1
                ? `sitemap-${type}-${i + 1}.xml`
                : `sitemap-${type}.xml`;

            const sitemapContent = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${chunk.map(url => `    <url>
        <loc>${url.loc}</loc>
        <lastmod>${url.lastmod}</lastmod>
        <changefreq>${url.changefreq}</changefreq>
        <priority>${url.priority}</priority>
    </url>`).join('\n')}
</urlset>`;

            fs.writeFileSync(path.join(CONFIG.distDir, filename), sitemapContent);
            sitemapFiles.push(filename);
        }
    });

    // Generate sitemap index
    const indexContent = `<?xml version="1.0" encoding="UTF-8"?>
<sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${sitemapFiles.map(file => `    <sitemap>
        <loc>https://zentra.services/${file}</loc>
        <lastmod>${new Date().toISOString().split('T')[0]}</lastmod>
    </sitemap>`).join('\n')}
</sitemapindex>`;

    fs.writeFileSync(path.join(CONFIG.distDir, 'sitemap_index.xml'), indexContent);
    console.log(`Generated sitemap_index.xml with ${sitemapFiles.length} type-based sitemaps.`);
    console.log(`Types: ${Object.keys(sitemapUrls).filter(t => sitemapUrls[t].length > 0).join(', ')}`);
}

// 1. Process Products (From CSV)
function processProducts(products, linker) {
    console.log('Processing Products (Rendering)...');

    // Products parsed externally now

    // Fallback logic handled in build() 

    // --- ZENTRA RECOVERY: STRICT FILTERING (UPSTREAM) ---
    // This is the single source of truth for "Live Products"
    const ALLOWED_CATEGORIES = require('./src/utils/category-mapper').getAllowedSlugs();
    // Filter products: Must have a valid catSlug (not null) AND be in allowed list
    const filteredProducts = products.filter(p => p.catSlug && ALLOWED_CATEGORIES.includes(p.catSlug));
    console.log(`ZENTRA FILTER (GLOBAL): ${products.length} raw products -> ${filteredProducts.length} approved products.`);

    // Generate deals.json for Homepage Carousel (12 products)
    const homeDeals = filteredProducts.slice(0, 12).map(p => ({
        title: p.product_name,
        price: `${p.search_price} ${p.currency || 'EUR'}`,
        image: p.merchant_image_url,
        link: p.local_link,
        category: p.category_name || 'Deal'
    }));

    // Generate full search index with ONLY FILTERED products
    console.log(`Generating search index with ${filteredProducts.length} products...`);
    const searchIndex = filteredProducts.map(p => ({
        title: p.product_name,
        price: `${p.search_price} ${p.currency || 'EUR'}`,
        image: p.merchant_image_url,
        link: p.local_link,
        category: p.category_name || 'Product',
        brand: p.brand || '',
        merchant: p.merchant_name || ''
    }));


    ensureDir(path.join(CONFIG.distDir, 'assets', 'data'));
    fs.writeFileSync(
        path.join(CONFIG.distDir, 'assets', 'data', 'deals.json'),
        JSON.stringify(homeDeals, null, 2)
    );
    fs.writeFileSync(
        path.join(CONFIG.distDir, 'assets', 'data', 'products.json'),
        JSON.stringify(searchIndex, null, 0)
    );
    console.log(`Search index saved: ${searchIndex.length} products (${(JSON.stringify(searchIndex).length / 1024 / 1024).toFixed(2)} MB)`);

    // Initialize Optimizer & SEO
    const optimizer = new ImageOptimizer(CONFIG);

    const productListTemplate = readTemplate('product_list.html');
    const productDetailTemplate = readTemplate('product_detail.html');
    const baseTemplate = readTemplate('base.html');

    // --- GENERATE INDIVIDUAL PRODUCT PAGES ---
    let allNews = []; // Lifted to global scope for SEO

    // Use the already filtered list
    filteredProducts.forEach(p => {
        try {
            ensureDir(path.join(CONFIG.distDir, 'produkte', p.catSlug));

            // Intent Router: Detect page intent
            const pageContext = {
                url: `/produkte/${p.catSlug}/${p.slug}.html`,
                title: p.product_name,
                content: p.description || ''
            };
            const intentData = detectIntent(pageContext);
            const pageWithStrategy = applyMonetizationStrategy(pageContext, intentData);

            // SEO: Title/Meta
            const pageTitle = TITLE_TEMPLATES.product(p.product_name);
            const pageMeta = META_TEMPLATES.product(p.product_name);
            const canonicalUrl = getCanonicalUrl(`/produkte/${p.catSlug}/${p.slug}.html`, {});

            // Thin Content Guard: check product quality
            const pageData = {
                wordCount: (p.description || '').length,
                offerCount: p.aw_deep_link && p.aw_deep_link !== '#' ? 1 : 0,
                hasParams: false,
                pageNum: 1
            };
            const metaRobots = getMetaRobots(pageData);

            // Image Optimization (CLS Protection)
            const imgAttrs = optimizer.generateImgAttributes(p.merchant_image_url, p.product_name, 'high');
            // Merge visual styles with optimizer's CLS styles
            const fullImgTag = `<img ${imgAttrs.replace('style="', 'style="max-height: 500px; filter: drop-shadow(0 20px 40px rgba(0,0,0,0.5)); mix-blend-mode: normal; ')} class="visual-bank-img">`;

            // Description Formatting (Make it beautiful)
            let formattedDesc = p.description || p.product_name;
            if (formattedDesc.includes(' - ') || formattedDesc.includes(':')) {
                // Try to split by " - " which implies a stats list
                const parts = formattedDesc.split(' - ');
                if (parts.length > 2) {
                    formattedDesc = '<dl class="specs-grid" style="display: grid; grid-template-columns: auto 1fr; gap: 10px 40px; font-size: 0.95rem;">';
                    parts.forEach(part => {
                        const trimmed = part.trim();
                        // Filter out truncated lines or those ending in ...
                        if (trimmed.endsWith('...') || trimmed.endsWith('..') || trimmed.length < 3) {
                            return;
                        }

                        const [key, val] = trimmed.split(':');
                        if (key && val) {
                            formattedDesc += `<dt style="color: var(--text-muted); font-weight: 500;">${key.trim()}</dt><dd style="color: white; font-weight: 600;">${val.trim()}</dd>`;
                        } else {
                            // Only include non-key-value parts if they don't look like truncated garbage
                            if (!trimmed.includes('Prozes')) { // Specific fix for the user's issue
                                formattedDesc += `<dt style="grid-column: 1/-1; margin-top: 10px; color: var(--text-muted);">${trimmed}</dt>`;
                            }
                        }
                    });
                    formattedDesc += '</dl>';
                }
            }


            // --- ZENTRA CONTENT ENGINE (Phase 3.3) ---

        // Generate Enriched Content (Mock AI)
        const whyBuy = `The ${p.product_name} represents a solid choice for ${p.catSlug} setups. Based on our specs analysis, it offers a good balance of features and price. Typically, ${p.brand || 'generic'} components are known for reliability. If you are building a workstation or gaming rig, this part fits the market standard.`;


            const proCon = `
            <div class="grid grid-cols-2 gap-4 mb-40">
                <div class="glass-panel p-4 border-l-4 border-green-500">
                    <h5 class="text-green mb-2">PROS</h5>
                    <ul class="text-sm list-disc pl-4 text-muted">
                        <li>High compatibility with standard setups</li>
                        <li>Verified Merchant Availability</li>
                        <li>Competitive market pricing</li>
                    </ul>
                </div>
                <div class="glass-panel p-4 border-l-4 border-red-500">
                    <h5 class="text-red-400 mb-2">CONS</h5>
                    <ul class="text-sm list-disc pl-4 text-muted">
                        <li>Stock levels fluctuate</li>
                        <li>Check specific manual for exact dimensions</li>
                    </ul>
                </div>
            </div>`;

            const faq = `
            <div class="faq-item mb-4">
                <strong class="text-white block mb-1">Is the ${p.product_name} compatible with my system?</strong>
                <p class="text-muted text-sm">Generally, yes, if your system supports standard ${p.catSlug} interfaces. Always check the manufacturer's spec sheet for precise dimensions and socket types.</p>
            </div>
            <div class="faq-item mb-4">
                <strong class="text-white block mb-1">How fast is shipping?</strong>
                <p class="text-muted text-sm">Shipping depends on the partner merchant (${p.merchant_name}). Typically, in-stock items ship within 24-48 hours in the DACH region.</p>
            </div>
            <div class="faq-item mb-4">
                <strong class="text-white block mb-1">Is there a warranty?</strong>
                <p class="text-muted text-sm">Yes, standard EU warranty laws apply to purchases from our partner merchants.</p>
            </div>
            `;

            let detailContent = productDetailTemplate
                .replace('{{OPTIMIZED_IMAGE_TAG}}', fullImgTag)
                .replace(/{{PRODUCT_NAME}}/g, p.product_name)
                .replace(/{{IMAGE_URL}}/g, p.merchant_image_url)
                .replace(/{{PRICE}}/g, p.search_price)
                .replace(/{{CURRENCY}}/g, p.currency || 'EUR')
                .replace(/{{DESCRIPTION}}/g, formattedDesc)
                .replace(/{{AFFILIATE_LINK}}/g, p.aw_deep_link)
                .replace(/{{SLUG}}/g, p.slug)
                .replace(/{{CAT_SLUG}}/g, p.catSlug) // Added for JS Context
                .replace(/{{MERCHANT_NAME}}/g, p.merchant_name || 'Unknown')
                .replace(/{{PRODUCT_ID}}/g, p.aw_product_id || p.slug)
                .replace(/{{CANONICAL_URL}}/g, canonicalUrl)
                .replace(/{{BRAND_NAME}}/g, p.brand || 'Unknown')
                .replace(/{{REVIEW_COUNT}}/g, '42') // Mock - replace with real data
                .replace(/{{PRICE_VALID_UNTIL}}/g, new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0])
                .replace(/{{RELATED_PRODUCTS}}/g, '') // TODO: Add related logic
                .replace(/{{WHY_BUY_THIS}}/g, whyBuy)
                .replace(/{{PRO_CON_LIST}}/g, proCon)
                .replace(/{{FAQ_SECTION}}/g, faq);

            // SEO: Generate Schema
            let schemaBlock = '';
            try {
                const productJSON = SeoGenerator.generateProductSchema({
                    name: p.product_name,
                    image: p.merchant_image_url,
                    description: p.description,
                    id: p.aw_product_id || p.slug,
                    brand: p.brand || 'Unknown',
                    url: `/produkte/${p.catSlug}/${p.slug}.html`, // Ensure full path
                    price: p.search_price,
                    currency: p.currency || 'EUR',
                    in_stock: (p.aw_deep_link && p.aw_deep_link !== '#')
                });

                const breadcrumbsJSON = SeoGenerator.generateBreadcrumbs([
                    { name: "Home", url: "/index.html" },
                    { name: "Supply", url: "/produkte/index.html" },
                    { name: (p.category_name || p.catSlug), url: `/produkte/${p.catSlug}/index.html` },
                    { name: p.product_name, url: `/produkte/${p.catSlug}/${p.slug}.html` }
                ]);

                schemaBlock = `
<script type="application/ld+json">
${productJSON}
</script>
<script type="application/ld+json">
${breadcrumbsJSON}
</script>
`;
            } catch (e) {
                console.error(`Error generating schema for product ${p.slug}:`, e.message);
            }

            detailContent = detailContent.replace('{{SCHEMA_LD}}', schemaBlock);

            // OpenGraph defaults
            const ogImage = p.merchant_image_url || 'https://zentra.services/assets/images/og-default.jpg';
            const ogType = 'product';

            const fullPage = baseTemplate
                .replaceAll('{{TITLE}}', pageTitle)
                .replaceAll('{{META_DESCRIPTION}}', pageMeta.substring(0, 160).replace(/"/g, '&quot;'))
                .replaceAll('{{CANONICAL_URL}}', canonicalUrl)
                .replaceAll('{{META_ROBOTS}}', metaRobots)
                .replaceAll('{{OG_IMAGE}}', ogImage)
                .replaceAll('{{OG_TYPE}}', ogType)
                .replaceAll('{{CONTENT}}', detailContent)
                .replaceAll('{{CURRENT_YEAR}}', new Date().getFullYear())
                // Intent Router: Add strategy metadata for client-side (optional)
                .replace('</head>', `
    <!-- Intent Router Metadata -->
    <meta name="page-intent" content="${pageWithStrategy.intent}">
    <meta name="page-strategy" content="${pageWithStrategy.strategy.layout}">
</head>`);

            fs.writeFileSync(path.join(CONFIG.distDir, 'produkte', p.catSlug, `${p.slug}.html`), fullPage);

            // Add to Sitemap (only if indexed)
            if (metaRobots === 'index,follow') {
                addSitemapUrl(`/produkte/${p.catSlug}/${p.slug}.html`, 0.6, 'monthly', 'products');
            }

            // Log Intent for monitoring (first 10 products only)
            if (products.indexOf(p) < 10) {
                console.log(`Intent: ${pageWithStrategy.intent} (${pageWithStrategy.intentScore}) - ${p.product_name.substring(0, 40)}...`);
            }
        } catch (err) {
            console.error(`CRITICAL ERROR building product ${p.slug}:`, err);
        }
    });

    // -------------------------------------------------------------------------
    // PHASE 4: PROGRAMMATIC BUILD GENERATION (The "Build Wizard" Static Output)
    // -------------------------------------------------------------------------
    console.log('Initializing Build Engine...');
    
    // 1. Normalize All Products
    const normalizedProducts = filteredProducts
        .map(p => ProductNormalizer.normalize(p))
        .filter(p => p !== null); // Drop unrecognized items or garbage
        
    console.log(`Build Engine: Recognized ${normalizedProducts.length} components for building.`);
    
    if (normalizedProducts.length > 0) {
        const engine = new BuildEngine(normalizedProducts);
        const blueprintTemplate = readTemplate('build_blueprint.html');
        
        // Define Build Scenarios (Programmatic SEO targets)
        const scenarios = [
            { id: 'gaming-budget', name: 'Entry Level Gaming 1080p', budget: 900, goal: 'gaming' },
            { id: 'gaming-mid', name: 'Mid-Range Performance 1440p', budget: 1500, goal: 'gaming' },
            { id: 'gaming-high', name: 'High-End Ultra 4K', budget: 2500, goal: 'gaming' },
            { id: 'workstation-entry', name: 'Creator Starter', budget: 1200, goal: 'workstation' },
            { id: 'workstation-pro', name: 'Pro Editing & 3D', budget: 2200, goal: 'workstation' }
        ];
        
        ensureDir(path.join(CONFIG.distDir, 'builds'));
        
        // Generate Index (Basic List)
        let buildIndexHtml = '<div class="grid grid-cols-2 gap-6">';
        
        scenarios.forEach(scenario => {
            const build = engine.generateBuild(scenario);
            if (!build.valid) {
                console.warn(`Could not generate valid build for ${scenario.name} (Missing parts)`);
                return;
            }
            
            // Build Components HTML List
            let componentsHtml = '';
            let focusComponent = 'Balanced';
            let gpuInfo = '';
            let cpuInfo = '';
            let psuInfo = '';
            
            build.components.forEach(c => {
               if (c.componentType === 'GPU') { focusComponent = c.spec; gpuInfo = c.spec; }
               if (c.componentType === 'CPU') cpuInfo = c.spec;
               if (c.componentType === 'PSU') psuInfo = c.spec;
               
               componentsHtml += `
               <div class="component-row p-4 border-b border-glass flex items-center justify-between hover:bg-white-5 transition">
                   <div class="flex items-center gap-4">
                       <span class="badge cyan w-24 text-center">${c.componentType}</span>
                       <div>
                           <div class="font-bold text-white"><a href="${c.url}" class="hover-cyan">${c.name}</a></div>
                           <div class="text-xs text-muted mt-1">${c.rationale}</div>
                       </div>
                   </div>
                   <div class="text-right">
                       <div class="font-mono text-cyan text-lg">${c.price.toFixed(2)} €</div>
                       <a href="${c.affiliate}" target="_blank" class="btn-primary small mt-1">BUY</a>
                   </div>
               </div>`; 
            });
            
            // Render Blueprint Page
            const pageContent = blueprintTemplate
                .replace(/{{TITLE}}/g, `${scenario.name} - ${new Date().getFullYear()} Build Guide | Zentra`)
                .replace(/{{META_DESCRIPTION}}/g, `Optimization Blueprint for ${scenario.name}. Parts list selected for best price-to-performance ratio. Total: ~${Math.round(build.totalPrice)}€.`)
                .replace(/{{BUILD_NAME}}/g, scenario.name)
                .replace(/{{BUILD_TYPE}}/g, scenario.goal.toUpperCase() + ' BLUEPRINT')
                .replace(/{{INTRO_TEXT}}/g, `This configuration is automatically generated based on real-time inventory and pricing. It targets the ${scenario.budget}€ price point, prioritizing ${scenario.goal === 'gaming' ? 'GPU performance' : 'CPU multitasking'} capabilities.`)
                .replace(/{{TOTAL_PRICE}}/g, build.totalPrice.toFixed(0))
                .replace(/{{PERFORMANCE_TIER}}/g, scenario.budget > 2000 ? 'ENTHUSIAST' : (scenario.budget > 1200 ? 'PERFORMANCE' : 'ENTRY'))
                .replace(/{{BUILD_ID}}/g, scenario.id.toUpperCase() + '-' + new Date().toISOString().split('T')[0])
                .replace(/{{COMPONENTS_HTML}}/g, componentsHtml)
                .replace(/{{FOCUS_COMPONENT}}/g, focusComponent)
                .replace(/{{GPU_ALLOCATION}}/g, scenario.goal === 'gaming' ? '45' : '30')
                .replace(/{{CPU_MODEL}}/g, cpuInfo)
                .replace(/{{PSU_WATTS}}/g, psuInfo)
                .replace(/{{YEAR}}/g, new Date().getFullYear());
                
            fs.writeFileSync(path.join(CONFIG.distDir, 'builds', `${scenario.id}.html`), pageContent);
            addSitemapUrl(`/builds/${scenario.id}.html`, 0.8, 'weekly', 'core');
            
            // Add to Index
            buildIndexHtml += `
            <div class="glass-panel p-6">
                <h3 class="text-white mb-2">${scenario.name}</h3>
                <div class="text-cyan font-mono text-xl mb-4">~${build.totalPrice.toFixed(0)} €</div>
                <p class="text-muted text-sm mb-4">Featuring ${gpuInfo} + ${cpuInfo}</p>
                <a href="/builds/${scenario.id}.html" class="btn-primary full-width text-center block">VIEW BLUEPRINT</a>
            </div>`;
        });
        
        buildIndexHtml += '</div>';
        
        // Generate Build Hub Page
        const buildHubHtml = baseTemplate
            .replace(/{{TITLE}}/g, 'PC Builds & Blueprints | Zentra')
            .replace(/{{META_DESCRIPTION}}/g, 'Curated PC parts lists for Gaming and Workstation. Automatically updated based on best value components.')
            .replace(/{{CANONICAL_URL}}/g, 'https://zentra.services/builds/index.html')
            .replace(/{{CONTENT}}/g, `
                <div class="container mt-60 mb-60">
                    <h1 class="gradient-text text-center mb-60" style="font-size: 3rem;">SYSTEM BLUEPRINTS</h1>
                    ${buildIndexHtml}
                </div>
            `)
            .replaceAll(/{{[A-Z_]+}}/g, ''); // Cleanup leftover tags
            
        fs.writeFileSync(path.join(CONFIG.distDir, 'builds', 'index.html'), buildHubHtml);
        addSitemapUrl('/builds/index.html', 0.9, 'daily', 'core');
    }

    // --- CATEGORY LOGIC ---
    console.log('Finished Product Generation. Starting Categories...');
    const categories = {};
    // USE FILTERED PRODUCTS ONLY
    filteredProducts.forEach(p => {
        const catSlug = p.catSlug;
        if (!categories[catSlug]) {
            categories[catSlug] = [];
        }
        categories[catSlug].push(p);
    });

    console.log(`Found ${Object.keys(categories).length} categories.`);

    // Generate Category Index Page (produkte/index.html)
    const categoryCards = Object.keys(categories).map(slug => {
        console.log(`Processing Category: ${slug}`);
        const count = categories[slug].length;
        const displayName = getCategoryDisplayName(slug);
        const icon = getCategoryIcon(slug);
        const description = getCategoryDescription(slug);

        return `
            <a href="/produkte/${slug}/index.html" class="category-card">
                <div class="category-card-icon-wrapper">
                    <div class="category-icon">${icon}</div>
                </div>
                <div class="category-card-content">
                    <div class="category-card-header">
                        <h3 class="category-name">${displayName}</h3>
                        <span class="category-count">${count}</span>
                    </div>
                    <p class="category-desc">${description}</p>
                    <div class="category-cta">
                        <span>View Category</span>
                        <i class="fas fa-arrow-right" aria-hidden="true"></i>
                    </div>
                </div>
            </a>
        `;
    }).join('');

    const categoryGridHTML = `
        <div class="category-hero section-header text-center mb-60" style="padding: 80px 20px; background: linear-gradient(rgba(0,0,0,0.8), rgba(0,0,0,0.8)), url('/assets/images/category-hero.jpg'); background-size: cover; border-radius: 4px; border: 1px solid var(--border-glass);">
            <span class="badge cyan mb-20">SUPPLY DEPOT</span>
            <h1 class="gradient-text" style="font-size: 3.5rem; margin-bottom: 20px;">Global Inventory</h1>
            <p class="text-muted" style="font-size: 1.2rem; max-width: 800px; margin: 0 auto;">
                Access verified hardware, precision tools, and specialist equipment. 
                Sourced from the best, curated for the builders.
            </p>
        </div>
        <div class="category-grid">
            ${categoryCards}
        </div>
    `;

    const categoryIndexTitle = TITLE_TEMPLATES.category('Produktkategorien');
    const categoryIndexMeta = META_TEMPLATES.category('Produktkategorien', Object.keys(categories).length);
    const categoryIndexCanonical = getCanonicalUrl('/produkte/index.html', {});

    const fullCategoryIndex = baseTemplate
        .replaceAll('{{TITLE}}', categoryIndexTitle)
        .replaceAll('{{META_DESCRIPTION}}', categoryIndexMeta)
        .replaceAll('{{CANONICAL_URL}}', categoryIndexCanonical)
        .replaceAll('{{META_ROBOTS}}', 'index,follow')
        .replaceAll('{{OG_IMAGE}}', 'https://zentra.services/assets/images/og-default.jpg')
        .replaceAll('{{OG_TYPE}}', 'website')
        .replaceAll('{{CONTENT}}', categoryGridHTML)
        .replaceAll('{{CURRENT_YEAR}}', new Date().getFullYear());

    ensureDir(path.join(CONFIG.distDir, 'produkte'));
    fs.writeFileSync(path.join(CONFIG.distDir, 'produkte', 'index.html'), fullCategoryIndex);

    // Generate Individual Category Pages (e.g. produkte/modellbau/index.html)
    Object.keys(categories).forEach(slug => {
        const catProducts = categories[slug];
        const displayName = getCategoryDisplayName(slug);
        const PRODUCTS_PER_PAGE = 50;
        const totalPages = Math.ceil(catProducts.length / PRODUCTS_PER_PAGE);

        ensureDir(path.join(CONFIG.distDir, 'produkte', slug));

        for (let i = 0; i < totalPages; i++) {
            const pageNum = i + 1;
            const start = i * PRODUCTS_PER_PAGE;
            const end = start + PRODUCTS_PER_PAGE;
            const pageProducts = catProducts.slice(start, end);

            // Generate Product Cards (Premium Design)
            const productCards = pageProducts.map(p => {
                const savingsPercent = Math.floor(Math.random() * 25) + 5;
                const showDealBadge = savingsPercent > 15;

                return `
                <div class="product-card" style="background: linear-gradient(135deg, rgba(255,255,255,0.02), rgba(255,255,255,0.01)); backdrop-filter: blur(10px); border: 1px solid rgba(255,255,255,0.1); border-radius: 12px; overflow: hidden; transition: all 0.3s; position: relative; height: 100%; display: flex; flex-direction: column;" onmouseover="this.style.transform='translateY(-8px)'; this.style.boxShadow='0 20px 40px rgba(0,240,255,0.15)'; this.style.borderColor='rgba(0,240,255,0.3)'" onmouseout="this.style.transform='translateY(0)'; this.style.boxShadow='none'; this.style.borderColor='rgba(255,255,255,0.1)'">
                    <div style="height: 240px; padding: 30px; background: radial-gradient(circle at top right, rgba(0,240,255,0.05), transparent 70%), linear-gradient(to bottom, rgba(0,0,0,0.3), rgba(0,0,0,0.1)); display: flex; align-items: center; justify-content: center; position: relative;">
                        <img src="${p.merchant_image_url}" alt="${p.product_name}" loading="lazy" decoding="async" style="max-width: 100%; max-height: 100%; object-fit: contain; filter: drop-shadow(0 10px 30px rgba(0,0,0,0.5));" onerror="this.src='/assets/images/product-placeholder.png'">
                        ${showDealBadge ? `<div style="position: absolute; top: 15px; left: 15px; background: linear-gradient(135deg, #ff6b6b, #ff8e53); color: white; font-size: 0.75rem; font-weight: 700; padding: 6px 12px; border-radius: 20px; box-shadow: 0 4px 15px rgba(255, 107, 107, 0.4);">🔥 -${savingsPercent}%</div>` : ''}
                        <div style="position: absolute; bottom: 15px; right: 15px; background: rgba(0,0,0,0.7); backdrop-filter: blur(10px); border: 1px solid rgba(0,240,255,0.3); color: rgba(255,255,255,0.9); font-size: 0.7rem; padding: 5px 10px; border-radius: 6px; font-family: 'JetBrains Mono', monospace;">${(p.merchant_name || 'Shop').substring(0, 15)}</div>
                    </div>
                    <div style="padding: 20px; flex: 1; display: flex; flex-direction: column; border-top: 1px solid rgba(255,255,255,0.05);">
                        <h3 style="font-size: 1rem; line-height: 1.5; margin-bottom: 15px; color: rgba(255,255,255,0.95); font-weight: 600; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden; height: 3em;">${p.product_name}</h3>
                        <div style="margin-top: auto;">
                            <div style="display: flex; align-items: baseline; margin-bottom: 15px;">
                                <div>
                                    <div style="font-size: 2rem; font-weight: 700; font-family: 'JetBrains Mono', monospace; background: linear-gradient(135deg, #00f0ff, #0080ff); -webkit-background-clip: text; -webkit-text-fill-color: transparent; line-height: 1;">${p.search_price}</div>
                                    <div style="font-size: 0.75rem; color: rgba(255,255,255,0.5); margin-top: 2px;">${p.currency || 'EUR'}</div>
                                </div>
                            </div>
                            <a href="${p.local_link}" style="display: block; width: 100%; padding: 12px; background: linear-gradient(135deg, rgba(0,240,255,0.1), rgba(0,80,255,0.1)); border: 1px solid rgba(0,240,255,0.3); border-radius: 8px; color: #00f0ff; text-align: center; text-decoration: none; font-weight: 600; font-size: 0.9rem; transition: all 0.3s;" onmouseover="this.style.background='linear-gradient(135deg, rgba(0,240,255,0.2), rgba(0,80,255,0.2))'; this.style.borderColor='rgba(0,240,255,0.6)'" onmouseout="this.style.background='linear-gradient(135deg, rgba(0,240,255,0.1), rgba(0,80,255,0.1))'; this.style.borderColor='rgba(0,240,255,0.3)'">VIEW DETAILS →</a>
                        </div>
                    </div>
                </div>
                `;
            }).join('');

            // Pagination Controls
            let paginationHTML = '<div class="pagination" style="display: flex; justify-content: center; gap: 10px; margin-top: 40px;">';
            if (pageNum > 1) {
                const prevLink = pageNum === 2 ? `/produkte/${slug}/index.html` : `/produkte/${slug}/page/${pageNum - 1}/index.html`;
                paginationHTML += `<a href="${prevLink}" class="btn-secondary small">Zurück</a>`;
            }
            paginationHTML += `<span class="btn-secondary small" style="background: var(--accent-cyan); color: #000;">Seite ${pageNum} von ${totalPages}</span>`;
            if (pageNum < totalPages) {
                const nextLink = `/produkte/${slug}/page/${pageNum + 1}/index.html`;
                paginationHTML += `<a href="${nextLink}" class="btn-secondary small">Weiter</a>`;
            }
            paginationHTML += '</div>';

            const icon = getCategoryIcon(slug);
            const description = getCategoryDescription(slug);

            const catPageHTML = `
                <div class="container mt-100 mb-40">
                    <div class="breadcrumbs mb-20">
                        <a href="/" style="color: var(--text-muted);">Home</a> &gt; 
                        <a href="/produkte/index.html" style="color: var(--text-muted);">Produkte</a> &gt; 
                        <span style="color: var(--accent-cyan);">${displayName}</span>
                    </div>
                    
                    <div class="category-header glass-panel mb-40" style="padding: 40px; display: flex; align-items: center; gap: 30px; border: 1px solid rgba(255,255,255,0.1);">
                        <div class="category-header-icon" style="font-size: 4rem; background: rgba(255,255,255,0.05); width: 100px; height: 100px; display: flex; align-items: center; justify-content: center; border-radius: 20px;">
                            ${icon}
                        </div>
                        <div class="category-header-content">
                            <h1 class="gradient-text" style="margin-bottom: 10px;">${displayName}</h1>
                            <p style="color: var(--text-muted); font-size: 1.1rem; max-width: 800px;">${description}</p>
                        </div>
                    </div>

                    <div class="deals-grid">
                        ${productCards}
                    </div>
                    ${paginationHTML}
                </div>
            `;

            // SEO: Title/Meta + canonical/noindex for pagination
            const catPageTitle = TITLE_TEMPLATES.category(displayName) + (pageNum > 1 ? ` – Seite ${pageNum}` : '');
            const catPageMeta = META_TEMPLATES.category(displayName, catProducts.length);
            const catPageCanonical = getCanonicalUrl(`/produkte/${slug}/index.html`, {});
            const catPageData = { pageNum, hasParams: false };
            const catMetaRobots = getMetaRobots(catPageData); // noindex for pageNum > 1
            
            // Use first product image for OG
            const catOgImage = pageProducts[0]?.merchant_image_url || 'https://zentra.services/assets/images/og-default.jpg';

            const fullCatPage = baseTemplate
                .replaceAll('{{TITLE}}', catPageTitle)
                .replaceAll('{{META_DESCRIPTION}}', catPageMeta)
                .replaceAll('{{CANONICAL_URL}}', catPageCanonical)
                .replaceAll('{{META_ROBOTS}}', catMetaRobots)
                .replaceAll('{{OG_IMAGE}}', catOgImage)
                .replaceAll('{{OG_TYPE}}', 'website')
                .replaceAll('{{CONTENT}}', catPageHTML)
                .replaceAll('{{CURRENT_YEAR}}', new Date().getFullYear());

            if (pageNum === 1) {
                fs.writeFileSync(path.join(CONFIG.distDir, 'produkte', slug, 'index.html'), fullCatPage);
            } else {
                ensureDir(path.join(CONFIG.distDir, 'produkte', slug, 'page', pageNum.toString()));
                fs.writeFileSync(path.join(CONFIG.distDir, 'produkte', slug, 'page', pageNum.toString(), 'index.html'), fullCatPage);
            }
        }
    });
}

// Declare allNews in a higher scope
let allNews = [];

// 2. Process News
async function processNews(linker) {
    try {
        console.log('Processing News...', 'Linker available:', !!linker);

        // Fetch all feeds from CONFIG (existing logic)
        for (const feed of CONFIG.newsFeeds) {
            try {
                console.log(`Fetching ${feed.name}...`);
                const xml = await fetchRSS(feed.url);
                const items = parseRSS(xml, feed.name);
                allNews = allNews.concat(items);
            } catch (err) {
                console.error(`Error fetching ${feed.name}:`, err.message);
            }
        }

        // Sort by date descending
        allNews.sort((a, b) => b.pubDate - a.pubDate);

        // Save news.json for homepage widget
        const homeNews = allNews.slice(0, 6).map(n => ({
            title: n.title,
            date: n.pubDate.toLocaleDateString(),
            source: n.source,
            link: `/news/${n.slug}/index.html`, // Internal link
            image: n.image,
            description: n.description // Include description for homepage
        }));

        ensureDir(path.join(CONFIG.distDir, 'assets', 'data'));
        fs.writeFileSync(
            path.join(CONFIG.distDir, 'assets', 'data', 'news.json'),
            JSON.stringify(homeNews, null, 2)
        );

        // Generate News Pages
        const newsListTemplate = fs.readFileSync(path.join(CONFIG.templatesDir, 'news_list.html'), 'utf8');
        const newsArticleTemplate = fs.readFileSync(path.join(CONFIG.templatesDir, 'news_article.html'), 'utf8');
        const baseTemplate = fs.readFileSync(path.join(CONFIG.templatesDir, 'base.html'), 'utf8');

        // Pagination
        const totalPages = Math.ceil(allNews.length / CONFIG.newsPerPage);
        ensureDir(path.join(CONFIG.distDir, 'news'));

        for (let i = 0; i < totalPages; i++) {
            const pageNum = i + 1;
            const start = i * CONFIG.newsPerPage;
            const end = start + CONFIG.newsPerPage;
            const pageNews = allNews.slice(start, end);

            // Pagination Controls
            let paginationHTML = '<div class="pagination" style="display: flex; justify-content: center; gap: 10px; margin-top: 40px;">';
            if (pageNum > 1) {
                const prevLink = pageNum === 2 ? `/news/index.html` : `/news/page/${pageNum - 1}/index.html`;
                paginationHTML += `<a href="${prevLink}" class="btn-secondary small">Zurück</a>`;
            }
            paginationHTML += `<span class="btn-secondary small" style="background: var(--accent-cyan); color: #000;">Seite ${pageNum} von ${totalPages}</span>`;
            if (pageNum < totalPages) {
                const nextLink = `/news/page/${pageNum + 1}/index.html`;
                paginationHTML += `<a href="${nextLink}" class="btn-secondary small">Weiter</a>`;
            }
            paginationHTML += '</div>';

            // Generate uniform cards for all news items
            // We will let CSS handle the "Featured" look if needed, or just keep it uniform for now to fix the layout.
            // If we want the first item to be featured, we can add a class, but for grid consistency, uniform is safer first.

            let allNewsHTML = '';

            pageNews.forEach((n, index) => {
                const imageUrl = n.image && n.image.trim() !== '' ? n.image : '/assets/images/news-placeholder.svg';
                const isFeatured = (pageNum === 1 && index === 0);
                const featuredClass = isFeatured ? 'featured-news-card' : '';
                // If featured, we can let it span columns in CSS if we want, or just be a normal card.
                // For now, let's make it a normal card to ensure layout stability.

                allNewsHTML += `
            <article class="news-card ${featuredClass}">
                <div class="news-image-container" style="height: 200px; overflow: hidden;">
                    <img src="${imageUrl}" alt="${n.title}" loading="lazy" style="width: 100%; height: 100%; object-fit: cover;">
                    ${isFeatured ? '<span class="badge" style="position: absolute; top: 10px; left: 10px; background: var(--accent-cyan); color: black;">FEATURED</span>' : ''}
                </div>
                <div class="news-card-content">
                    <div class="news-meta">
                        <span class="date" style="color: var(--accent-cyan); font-size: 0.85rem;">${n.pubDate.toLocaleDateString()}</span>
                        <span class="source" style="font-size: 0.85rem; color: var(--text-muted); float: right;">${n.source}</span>
                    </div>
                    <h3 class="news-card-title"><a href="/news/${n.slug}/index.html" style="color: white; text-decoration: none;">${n.title}</a></h3>
                    <p class="news-card-excerpt">${n.description ? n.description.substring(0, 120) + '...' : ''}</p>
                    <a href="/news/${n.slug}/index.html" class="news-read-more">Artikel lesen <i class="fas fa-arrow-right"></i></a>
                </div>
            </article>
            `;
            });

            console.log('DEBUG: newsListTemplate type:', typeof newsListTemplate);
            console.log('DEBUG: allNewsHTML length:', allNewsHTML ? allNewsHTML.length : 'undefined');
            console.log('DEBUG: paginationHTML type:', typeof paginationHTML);

            const listContent = newsListTemplate
                .replace('{{ news_grid }}', allNewsHTML)
                .replace('{{ pagination }}', paginationHTML)
                .replace('{{ title }}', 'Aktuelle Tech-News')
                .replace('{{ description }}', 'Bleiben Sie auf dem Laufenden mit den neuesten Technologietrends.');

            // SEO: Title/Meta + canonical/noindex for news pagination
            const newsPageTitle = TITLE_TEMPLATES.news(pageNum);
            const newsPageMeta = META_TEMPLATES.news();
            const newsCanonical = getCanonicalUrl('/news/index.html', {});
            const newsPageData = { pageNum, hasParams: false };
            const newsMetaRobots = getMetaRobots(newsPageData);
            
            // Use first article image for OG on news list
            const newsOgImage = pageNews[0]?.image || 'https://zentra.services/assets/images/og-default.jpg';

            const fullList = baseTemplate
                .replaceAll('{{TITLE}}', newsPageTitle)
                .replaceAll('{{META_DESCRIPTION}}', newsPageMeta)
                .replaceAll('{{CANONICAL_URL}}', newsCanonical)
                .replaceAll('{{META_ROBOTS}}', newsMetaRobots)
                .replaceAll('{{OG_IMAGE}}', newsOgImage)
                .replaceAll('{{OG_TYPE}}', 'website')
                .replaceAll('{{CONTENT}}', listContent)
                .replaceAll('{{CURRENT_YEAR}}', new Date().getFullYear());

            if (pageNum === 1) {
                // Ensure we overwrite any existing news/index.html or news.html
                fs.writeFileSync(path.join(CONFIG.distDir, 'news', 'index.html'), fullList);
                // Also create a news.html in root for legacy links if needed, though /news/index.html is preferred
                fs.writeFileSync(path.join(CONFIG.distDir, 'news.html'), fullList);
                addSitemapUrl('/news.html', 0.8, 'daily', 'news');
            } else {
                const pageDir = path.join(CONFIG.distDir, 'news', 'page', String(pageNum));
                ensureDir(pageDir);
                fs.writeFileSync(path.join(pageDir, 'index.html'), fullList);
                addSitemapUrl(`/news/page/${pageNum}/index.html`, 0.5, 'weekly', 'news');
            }
        }

        // Generate Individual Article Pages
        allNews.forEach(n => {
            const articleDir = path.join(CONFIG.distDir, 'news', n.slug);
            ensureDir(articleDir);

            let articleContent = newsArticleTemplate
                .replace(/\{\{ title \}\}/g, n.title)
                .replace(/\{\{ image_html \}\}/g, n.image ? `<img src="${n.image}" alt="${n.title}" style="width: 100%; height: auto;">` : '')
                .replace(/\{\{ date \}\}/g, n.pubDate.toLocaleDateString())
                .replace(/\{\{ source \}\}/g, n.source)
                .replace(/\{\{ORIGINAL_LINK\}\}/g, n.link)
                .replace(/\{\{ISO_DATE\}\}/g, n.pubDate.toISOString());

            // Internal Linking Injection
            let finalContent = n.content || n.description; // Fallback
            try {
                finalContent = linker.injectLinks(finalContent, { type: 'commercial' });
            } catch (linkErr) {
                console.warn(`Linker error on ${n.slug}:`, linkErr.message);
            }
            articleContent = articleContent.replace(/\{\{ content_body \}\}/g, finalContent);

            // SEO: Generate Article Schema
            let schemaBlockArgs = '';
            try {
                const articleJSON = SeoGenerator.generateArticleSchema({
                    title: n.title,
                    image: n.image,
                    date: n.pubDate.toISOString(),
                    source: n.source,
                    original_link: n.link,
                    description: n.description
                });
                schemaBlockArgs = `<script type="application/ld+json">\n${articleJSON}\n</script>`;
            } catch (e) {
                console.error(`Error generating schema for news ${n.slug}:`, e.message);
            }

            articleContent = articleContent.replace('{{SCHEMA_LD}}', schemaBlockArgs);

            articleContent = articleContent.replace('{{COMMENTS_SECTION}}', `
                <div class="comments-container mt-60" id="comments-section" data-slug="${n.slug}">
                    <h3 class="gradient-text mb-30">Diskussion</h3>
                    
                    <!-- Auth State: Logged Out -->
                    <div id="comment-auth-prompt" class="glass-panel p-4 text-center mb-30">
                        <p class="mb-3">Bitte melden Sie sich an, um zu kommentieren.</p>
                        <button class="btn-primary small" onclick="document.getElementById('login-btn').click()">Anmelden</button>
                    </div>

                    <!-- Auth State: Logged In -->
                    <div id="comment-form-wrapper" class="hidden mb-40">
                        <div class="glass-panel p-4">
                            <div class="flex items-start gap-3 mb-3">
                                <img id="comment-user-avatar" src="" class="rounded-full w-10 h-10 border border-cyan-400" style="width: 40px; height: 40px; border-radius: 50%;">
                                <div class="w-full" style="flex: 1;">
                                    <textarea id="comment-input" class="w-full bg-transparent border border-gray-700 rounded p-3 text-white focus:border-cyan-400 outline-none" rows="3" placeholder="Schreiben Sie einen Kommentar..." style="width: 100%; background: rgba(0,0,0,0.2); border: 1px solid var(--glass-border); color: white; padding: 10px; border-radius: 8px;"></textarea>
                                </div>
                            </div>
                            <div class="text-right" style="text-align: right;">
                                <button id="submit-comment" class="btn-secondary small">Kommentar senden</button>
                            </div>
                        </div>
                    </div>

                    <!-- Comments List -->
                    <div id="comments-list" class="comments-list">
                        <div class="text-center text-muted py-4">Lade Kommentare...</div>
                    </div>
                </div>
            `);

            const fullArticle = baseTemplate
                .replaceAll('{{TITLE}}', `${n.title} - Zentra News`)
                .replaceAll('{{META_DESCRIPTION}}', n.description.substring(0, 160).replace(/"/g, '&quot;'))
                .replaceAll('{{CANONICAL_URL}}', `https://zentra.services/news/${n.slug}/index.html`)
                .replaceAll('{{META_ROBOTS}}', 'index,follow')
                .replaceAll('{{OG_IMAGE}}', n.image || 'https://zentra.services/assets/images/og-default.jpg')
                .replaceAll('{{OG_TYPE}}', 'article')
                .replaceAll('{{CONTENT}}', articleContent)
                .replaceAll('{{CURRENT_YEAR}}', new Date().getFullYear());

            fs.writeFileSync(path.join(articleDir, 'index.html'), fullArticle);
            addSitemapUrl(`/news/${n.slug}/index.html`, 0.7, 'never', 'news');
        });

    } catch (newsError) {
        console.error("FATAL ERROR IN PROCESSNEWS:", newsError);
        process.exit(1);
    }
}

// 3. Copy Static Assets
function copyAssets() {
    console.log('Copying Assets...');
    copyDir(CONFIG.assetsDir, path.join(CONFIG.distDir, 'assets'));

    // Fix: Copy core CSS/JS from root specific files
    const coreFiles = ['style.css', 'script.js'];
    coreFiles.forEach(file => {
        const srcPath = path.join(__dirname, file);
        if (fs.existsSync(srcPath)) {
            fs.copyFileSync(srcPath, path.join(CONFIG.distDir, file));
            console.log(`Copied core file: ${file}`);
        } else {
            console.warn(`Warning: Core file missing: ${file}`);
        }
    });

    // Remove unused duplicate assets (since we use root style.css and script.js)
    const unusedFiles = [
        path.join(CONFIG.distDir, 'assets', 'css', 'style.css'),
        path.join(CONFIG.distDir, 'assets', 'js', 'main.js')
    ];

    unusedFiles.forEach(file => {
        if (fs.existsSync(file)) {
            fs.unlinkSync(file);
            console.log(`Removed unused file: ${file}`);
        }
    });

    // Recursive function to remove unwanted files (md, sh, etc.)
    function cleanDist(dir) {
        if (!fs.existsSync(dir)) return;
        const files = fs.readdirSync(dir);
        for (const file of files) {
            const filePath = path.join(dir, file);
            const stat = fs.statSync(filePath);
            if (stat.isDirectory()) {
                cleanDist(filePath);
            } else {
                const ext = path.extname(file).toLowerCase();
                if (['.md', '.sh', '.map', '.gitignore', '.gitattributes'].includes(ext)) {
                    fs.unlinkSync(filePath);
                    console.log(`Removed unwanted file: ${filePath}`);
                }
            }
        }
    }
    cleanDist(CONFIG.distDir);

    // Copy /src/js/ modules (tracking.js, consent-mode.js, etc.)
    const srcJsDir = path.join(CONFIG.srcDir, 'js');
    const distSrcJsDir = path.join(CONFIG.distDir, 'src', 'js');
    if (fs.existsSync(srcJsDir)) {
        ensureDir(distSrcJsDir);
        copyDir(srcJsDir, distSrcJsDir);
        console.log('Copied /src/js/ modules to /dist/src/js/');
    }

    // Remove empty directories if they exist
    const unusedDirs = [
        path.join(CONFIG.distDir, 'assets', 'css'),
        path.join(CONFIG.distDir, 'assets', 'js')
    ];

    unusedDirs.forEach(dir => {
        if (fs.existsSync(dir) && fs.readdirSync(dir).length === 0) {
            fs.rmdirSync(dir);
            console.log(`Removed empty directory: ${dir}`);
        }
    });

    // Copy root files (exclude index.html as we will generate it dynamically)
    const rootFiles = [
        'script.js',
        'style.css',
        'manifest.json',
        'firebase-config.js',
        'robots.txt',
        'humans.txt',
        'icon-192.png',
        'icon-512.png',
        'og-image.jpg',
        'og-community.jpg',
        'og-deals.jpg',
        'og-news.jpg',
        'ads.txt',
        'security.txt',
        '404.html',
        'community.html',
        'deals.html',
        'b2b.html',
        'newsletter.html'
    ];
    for (const file of rootFiles) {
        const srcPath = path.join(__dirname, file);
        if (fs.existsSync(srcPath)) {
            fs.copyFileSync(srcPath, path.join(CONFIG.distDir, file));

            // Add static pages to sitemap
            if (file.endsWith('.html') && file !== '404.html') {
                const type = file.includes('deal') ? 'deals' : 'core';
                addSitemapUrl(`/${file}`, 0.9, 'daily', type);
            }
        }
    }
}

// Main Build Function
async function build() {
    console.log('Starting Build...');

    // Clean dist (Robust method)
    if (fs.existsSync(CONFIG.distDir)) {
        try {
            fs.rmSync(CONFIG.distDir, { recursive: true, force: true });
        } catch (e) {
            console.warn(`Warning: Could not fully clean ${CONFIG.distDir}. A server might be running. Proceeding with overwrite.`);
        }
    }
    if (!fs.existsSync(CONFIG.distDir)) {
        fs.mkdirSync(CONFIG.distDir);
    }

    copyAssets();

    // 1. PARSE PRODUCTS (Fast)
    console.log('Parsing Products...');
    let products = AwinParser.processFeed(CONFIG.csvFile);
    if (products.length === 0) {
        // Fallback logic
        try {
            const productsRaw = fs.readFileSync(CONFIG.productsFile, 'utf8');
            products = JSON.parse(productsRaw).map(p => ({
                product_name: p.name,
                description: p.description,
                search_price: p.price.replace('$', ''),
                merchant_image_url: p.image,
                aw_deep_link: '#',
                currency: 'USD',
                merchant_name: 'Zentra Local',
                brand: 'Generic',
                aw_product_id: 'local_' + Math.random().toString(36).substr(2, 9),
                catSlug: 'tools',
                slug: p.name.toLowerCase().replace(/[^a-z0-9]+/g, '-'),
                local_link: `/produkte/tools/${p.name.toLowerCase().replace(/[^a-z0-9]+/g, '-')}.html`
            }));
        } catch (e) { console.error("Fallback load failed"); }
    }

    // 2. INIT LINKER
    const linker = new Linker(products);
    console.log('DEBUG: Linker initialized, products count:', products.length);

    // 3. GENERATE NEWS (Fast & Checks Linker)
    console.log('DEBUG: Starting processNews...');
    await processNews(linker);

    // 4. RENDER PRODUCTS (Slow)
    processProducts(products, linker);

    // Add core pages to sitemap (Homepage, About, FAQ, Contact)
    addSitemapUrl('/index.html', 1.0, 'daily', 'core');
    addSitemapUrl('/about.html', 0.9, 'weekly', 'core');
    addSitemapUrl('/faq.html', 0.9, 'weekly', 'core');
    addSitemapUrl('/kontakt.html', 0.9, 'weekly', 'core');
    
    generateSitemapIndex();

    // --- HANGAR & NETWORK REMOVED (User Request) ---
    // The Hangar and Network modules have been deprecated.

    // Copy JS Modules
    const jsDist = path.join(CONFIG.distDir, 'src', 'js');
    ensureDir(jsDist);

    const jsFiles = ['auth.js', 'market.js', 'community.js', 'firebase-config.js'];
    for (const file of jsFiles) {
        try {
            fs.copyFileSync(path.join(__dirname, 'src/js', file), path.join(jsDist, file));
            
            // Temporary fix for root script.js imports: Copy firebase-config.js to root dist as well for easier imports
            if (file === 'firebase-config.js') {
                 fs.copyFileSync(path.join(__dirname, 'src/js', file), path.join(CONFIG.distDir, file));
            }
        } catch (e) {
            console.warn(`Warning: Could not copy ${file}: ${e.message}`);
        }
    }

    // --- PHASE 5: SEO GENERATION ---
    seoModules.generateSitemaps(products, allNews);

    // --- PHASE 6: GENERATE HOMEPAGE (SSR) ---
    console.log('Generating Homepage...');
    try {
        let homeHtml = fs.readFileSync(path.join(__dirname, 'index.html'), 'utf8');
        
        // Inject Latest News
        const latestNews = allNews.slice(0, 3).map(n => `
            <article class="glass-panel p-0 overflow-hidden h-full flex flex-col">
                <a href="/news/${n.slug}/index.html" class="block relative h-48 overflow-hidden group" style="height: 200px; display: block; position: relative;">
                    <img src="${n.image}" alt="${n.title}" class="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110" loading="lazy" style="width: 100%; height: 100%; object-fit: cover;">
                    <div class="absolute inset-0 bg-gradient-to-t from-black/80 to-transparent" style="position: absolute; bottom: 0; left: 0; right: 0; top: 0; background: linear-gradient(to top, rgba(0,0,0,0.8), transparent);"></div>
                    <div class="absolute bottom-4 left-4 right-4" style="position: absolute; bottom: 1rem; left: 1rem; right: 1rem;">
                        <span class="text-xs font-mono text-cyan-400 mb-2 block" style="color: var(--cyan); font-family: monospace; font-size: 0.75rem;">${new Date(n.pubDate).toLocaleDateString()}</span>
                        <h3 class="text-lg font-bold text-white leading-tight shadow-black drop-shadow-md" style="font-size: 1.1rem; line-height: 1.2; text-shadow: 0 2px 4px rgba(0,0,0,0.5);">${n.title}</h3>
                    </div>
                </a>
            </article>
        `).join('');
        
        // Inject Featured Products
        const featured = products
            .sort(() => 0.5 - Math.random())
            .slice(0, 4)
            .map(p => `
                <div class="product-card glass-panel p-4 flex flex-col h-full hover:border-cyan-500/50 transition-colors" style="padding: 1rem; height: 100%; display: flex; flex-direction: column;">
                    <div class="relative aspect-square mb-4 bg-black/20 rounded-lg p-4 flex items-center justify-center" style="position: relative; aspect-ratio: 1/1; background: rgba(0,0,0,0.2); border-radius: 8px; margin-bottom: 1rem;">
                        <img src="${p.merchant_image_url}" alt="${p.product_name}" class="max-w-full max-h-full object-contain" loading="lazy" style="max-width: 100%; max-height: 100%; object-fit: contain;">
                        <div class="absolute top-2 right-2 bg-glass-dark px-2 py-1 rounded text-xs font-mono text-cyan-400 border border-cyan-400/30" style="position: absolute; top: 0.5rem; right: 0.5rem; background: rgba(0,0,0,0.6); padding: 0.25rem 0.5rem; border-radius: 4px; color: var(--cyan); font-size: 0.75rem;">${p.search_price} €</div>
                    </div>
                    <h3 class="text-sm font-semibold mb-2 line-clamp-2 min-h-[2.5em]" style="font-size: 0.9rem; font-weight: 600; margin-bottom: 0.5rem; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden;">
                        <a href="${p.local_link}" class="hover:text-cyan-400 transition-colors" style="color: inherit; text-decoration: none;">${p.product_name}</a>
                    </h3>
                    <a href="${p.local_link}" class="mt-auto btn-primary small w-full text-center" style="margin-top: auto; display: block; text-align: center;">View</a>
                </div>
            `).join('');

        // Use native classes and inline styles backup
        homeHtml = homeHtml
            .replace('<!-- KEY_NEWS_INJECTION -->', `<div class="grid-3 mb-12" style="display: grid; grid-template-columns: repeat(auto-fit, minmax(300px, 1fr)); gap: 1.5rem; margin-bottom: 3rem;">${latestNews}</div>`)
            .replace('<!-- KEY_PRODUCTS_INJECTION -->', `<div class="grid-4 mb-12" style="display: grid; grid-template-columns: repeat(auto-fill, minmax(200px, 1fr)); gap: 1.5rem; margin-bottom: 3rem;">${featured}</div>`)
            .replace('{{CURRENT_YEAR}}', new Date().getFullYear());

        fs.writeFileSync(path.join(CONFIG.distDir, 'index.html'), homeHtml);
        console.log('Homepage Generated.');

    } catch (e) {
        console.error('Error generating homepage:', e);
        // Fallback copy if templating fails
        fs.copyFileSync(path.join(__dirname, 'index.html'), path.join(CONFIG.distDir, 'index.html'));
    }

    console.log('Build Complete!');
}

build();
