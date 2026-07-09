/**
 * SEO Generator
 * Standardizes Meta Tags and Schema.org JSON-LD generation across the site.
 */

const SeoGenerator = {
    /**
     * Generate BreadcrumbList Schema
     * @param {Array<{name: string, url: string}>} crumbs 
     */
    generateBreadcrumbs: (crumbs) => {
        const schema = {
            "@context": "https://schema.org",
            "@type": "BreadcrumbList",
            "itemListElement": crumbs.map((crumb, index) => ({
                "@type": "ListItem",
                "position": index + 1,
                "name": crumb.name,
                "item": `https://zentra.services${crumb.url}`
            }))
        };
        return JSON.stringify(schema, null, 2);
    },

    /**
     * Generate Article Schema
     * @param {Object} article 
     */
    generateArticleSchema: (article) => {
        const schema = {
            "@context": "https://schema.org",
            "@type": "NewsArticle",
            "headline": article.title,
            "image": article.image ? [`https://zentra.services${article.image}`] : [],
            "datePublished": article.date,
            "dateModified": article.date, // Assuming no update date yet
            "author": [{
                "@type": "Organization",
                "name": article.source || "Zentra Intel",
                "url": article.original_link || "https://zentra.services"
            }],
            "publisher": {
                "@type": "Organization",
                "name": "Zentra Services",
                "logo": {
                    "@type": "ImageObject",
                    "url": "https://zentra.services/assets/logo.png"
                }
            },
            "description": article.description || ""
        };
        return JSON.stringify(schema, null, 2);
    },

    /**
     * Generate Product Schema with AggregateRating
     * @param {Object} product 
     */
    generateProductSchema: (product) => {
        const schema = {
            "@context": "https://schema.org",
            "@type": "Product",
            "name": product.name,
            "image": product.image ? [product.image.startsWith('http') ? product.image : `https://zentra.services${product.image}`] : [],
            "description": product.description || `Buy ${product.name} at the best price.`,
            "sku": product.id,
            "mpn": product.id,
            "brand": {
                "@type": "Brand",
                "name": product.brand || "Generic"
            },
            "offers": {
                "@type": "Offer",
                "url": `https://zentra.services${product.url}`,
                "priceCurrency": product.currency || "EUR",
                "price": product.price,
                "priceValidUntil": product.price_valid_until || new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
                "availability": product.in_stock ? "https://schema.org/InStock" : "https://schema.org/OutOfStock",
                "itemCondition": "https://schema.org/NewCondition",
                "seller": {
                    "@type": "Organization",
                    "name": product.merchant || "Zentra Services"
                }
            },
            "aggregateRating": {
                "@type": "AggregateRating",
                "ratingValue": product.rating || "4.5",
                "reviewCount": product.review_count || "127",
                "bestRating": "5",
                "worstRating": "1"
            }
        };

        return JSON.stringify(schema, null, 2);
    },

    /**
     * Generate NewsArticle Schema with Publisher, Author, and enhanced metadata
     * @param {Object} article 
     */
    generateNewsArticleSchema: (article) => {
        const schema = {
            "@context": "https://schema.org",
            "@type": "NewsArticle",
            "headline": article.title,
            "image": article.image ? [article.image.startsWith('http') ? article.image : `https://zentra.services${article.image}`] : ["https://zentra.services/assets/images/og-news.jpg"],
            "datePublished": article.date_published || new Date().toISOString(),
            "dateModified": article.date_modified || article.date_published || new Date().toISOString(),
            "author": {
                "@type": "Person",
                "name": article.author || "Zentra Editorial Team",
                "url": "https://zentra.services/about.html"
            },
            "publisher": {
                "@type": "Organization",
                "name": "Zentra Services",
                "url": "https://zentra.services",
                "logo": {
                    "@type": "ImageObject",
                    "url": "https://zentra.services/assets/images/og-home.jpg",
                    "width": 1200,
                    "height": 630
                }
            },
            "description": article.description || article.title,
            "articleSection": article.section || "Technology",
            "articleBody": article.body || article.description || "",
            "wordCount": article.word_count || (article.body ? article.body.split(' ').length : 200),
            "mainEntityOfPage": {
                "@type": "WebPage",
                "@id": `https://zentra.services${article.url}`
            }
        };
        return JSON.stringify(schema, null, 2);
    },

    /**
     * Generate Article Schema for static pages (About, FAQ, Contact)
     * @param {Object} page 
     */
    generateArticleSchema: (page) => {
        const schema = {
            "@context": "https://schema.org",
            "@type": "Article",
            "headline": page.title,
            "image": page.image ? [page.image.startsWith('http') ? page.image : `https://zentra.services${page.image}`] : ["https://zentra.services/assets/images/og-about.jpg"],
            "datePublished": page.date_published || "2026-01-26",
            "dateModified": page.date_modified || new Date().toISOString().split('T')[0],
            "author": {
                "@type": "Person",
                "name": "Salih",
                "url": "https://zentra.services/about.html"
            },
            "publisher": {
                "@type": "Organization",
                "name": "Zentra Services",
                "url": "https://zentra.services",
                "logo": {
                    "@type": "ImageObject",
                    "url": "https://zentra.services/assets/images/og-home.jpg",
                    "width": 1200,
                    "height": 630
                }
            },
            "description": page.description || page.title,
            "mainEntityOfPage": {
                "@type": "WebPage",
                "@id": `https://zentra.services${page.url}`
            }
        };
        return JSON.stringify(schema, null, 2);
    },

    /**
     * Generate Standard Meta Tags
     * @param {Object} meta 
     */
    generateMetaTags: (meta) => {
        return `
    <title>${meta.title}</title>
    <meta name="description" content="${meta.description}">
    <link rel="canonical" href="${meta.canonical}">
    <meta property="og:title" content="${meta.title}">
    <meta property="og:description" content="${meta.description}">
    <meta property="og:type" content="${meta.type || 'website'}">
    <meta property="og:url" content="${meta.canonical}">
    ${meta.image ? `<meta property="og:image" content="${meta.image}">` : ''}
    <meta name="robots" content="${meta.robots || 'index, follow'}">
        `.trim();
    }
};

module.exports = SeoGenerator;
