const fs = require('fs');
const path = require('path');

/**
 * Technical SEO Module
 * Handles Sitemap and Robots.txt generation
 */
class SeoModules {
    constructor(config) {
        this.distDir = config.distDir;
        this.baseUrl = 'https://zentra.services';
        this.maxUrlsPerSitemap = 40000; // Safe limit under 50k
    }

    /**
     * Generates a sitemap index and sub-sitemaps
     * @param {Array} products - List of product objects
     * @param {Array} news - List of news objects
     */
    generateSitemaps(products, news) {
        console.log('Generating Sitemaps...');
        if (!Array.isArray(news)) {
            console.warn('Warning: News is not an array. Skipping news sitemap.');
            news = [];
        }
        const sitemaps = [];

        // 1. Static Pages Sitemap
        const staticUrls = [
            '/',
            '/index.html',
            '/news/index.html',
            '/produkte/index.html',
            '/b2b.html',
            '/impressum.html',
            '/datenschutz.html',
            '/agb.html'
        ];
        this.writeSitemap('sitemap-static.xml', staticUrls.map(url => ({
            loc: this.baseUrl + url,
            changefreq: 'weekly',
            priority: 1.0
        })));
        sitemaps.push('sitemap-static.xml');

        // 2. News Sitemap
        const newsUrls = news.map(n => ({
            loc: `${this.baseUrl}/news/${n.slug}/index.html`,
            lastmod: new Date(n.pubDate).toISOString().split('T')[0],
            changefreq: 'daily',
            priority: 0.8
        }));
        this.writeSitemap('sitemap-news.xml', newsUrls);
        sitemaps.push('sitemap-news.xml');

        // 3. Product Sitemaps (Split)
        let productChunkIndex = 1;
        for (let i = 0; i < products.length; i += this.maxUrlsPerSitemap) {
            const chunk = products.slice(i, i + this.maxUrlsPerSitemap);
            const filename = `sitemap-products-${productChunkIndex}.xml`;
            const urls = chunk.map(p => ({
                loc: `${this.baseUrl}/produkte/${p.catSlug}/${p.slug}.html`,
                changefreq: 'weekly',
                priority: 0.6
                // Could add image:image tags here later
            }));

            this.writeSitemap(filename, urls);
            sitemaps.push(filename);
            productChunkIndex++;
        }

        // 4. Generate Index
        this.writeSitemapIndex(sitemaps);
        console.log(`Generated ${sitemaps.length} sitemaps covering ${products.length + news.length + staticUrls.length} URLs.`);
        
        // 5. Generate Robots.txt
        this.generateRobotsTxt(sitemaps);
    }

    generateRobotsTxt(sitemaps) {
        const robotsContent = `User-agent: *
Allow: /
Disallow: /admin/
Disallow: /private/
Disallow: /tmp/

# Block AI Scrapers (Optional but recommended for content protection)
User-agent: GPTBot
Disallow: /

User-agent: CCBot
Disallow: /

Sitemap: ${this.baseUrl}/sitemap_index.xml
`;
        fs.writeFileSync(path.join(this.distDir, 'robots.txt'), robotsContent);
        console.log('Generated robots.txt');
    }

    writeSitemap(filename, urls) {
        let xml = '<?xml version="1.0" encoding="UTF-8"?>\n';
        xml += '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n';

        urls.forEach(u => {
            xml += '  <url>\n';
            xml += `    <loc>${u.loc}</loc>\n`;
            if (u.lastmod) xml += `    <lastmod>${u.lastmod}</lastmod>\n`;
            if (u.changefreq) xml += `    <changefreq>${u.changefreq}</changefreq>\n`;
            if (u.priority) xml += `    <priority>${u.priority}</priority>\n`;
            xml += '  </url>\n';
        });

        xml += '</urlset>';
        fs.writeFileSync(path.join(this.distDir, filename), xml);
    }

    writeSitemapIndex(files) {
        let xml = '<?xml version="1.0" encoding="UTF-8"?>\n';
        xml += '<sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n';

        files.forEach(f => {
            xml += '  <sitemap>\n';
            xml += `    <loc>${this.baseUrl}/${f}</loc>\n`;
            xml += `    <lastmod>${new Date().toISOString().split('T')[0]}</lastmod>\n`;
            xml += '  </sitemap>\n';
        });

        xml += '</sitemapindex>';
        fs.writeFileSync(path.join(this.distDir, 'sitemap.xml'), xml);
    }

    generateRobotsTxt(isProd = true) {
        console.log('Generating robots.txt...');
        let content = 'User-agent: *\n';

        if (isProd) {
            content += 'Allow: /\n';
            content += 'Disallow: /admin/\n';
            content += 'Disallow: /staging/\n';
            content += 'Disallow: /*?*\n'; // Block query params to prevent duplication
            content += `Sitemap: ${this.baseUrl}/sitemap.xml\n`;
        } else {
            content += 'Disallow: /\n';
        }

        fs.writeFileSync(path.join(this.distDir, 'robots.txt'), content);
    }
}

module.exports = SeoModules;
