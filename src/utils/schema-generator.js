/**
 * Enhanced JSON-LD Schema Generator
 * Supports Product, Article, Organization, and BreadcrumbList
 */
class SchemaGenerator {
    static getOrganization() {
        return JSON.stringify({
            "@context": "https://schema.org",
            "@type": "Organization",
            "name": "Zentra Services",
            "url": "https://zentra.services",
            "logo": "https://zentra.services/assets/images/logo.png",
            "sameAs": [
                "https://twitter.com/zentraservices",
                "https://github.com/zentraservices"
            ]
        });
    }

    static getProduct(product) {
        // Safe defaults
        const price = product.price || 0;
        const currency = product.currency || "EUR";
        const availability = (price > 0 && product.inStock !== false) ? "https://schema.org/InStock" : "https://schema.org/OutOfStock";
        
        return JSON.stringify({
            "@context": "https://schema.org/",
            "@type": "Product",
            "name": product.title,
            "image": [
                product.image
            ],
            "description": product.description || `Buy ${product.title} at the best price.`,
            "brand": {
                "@type": "Brand",
                "name": product.brand || "Generic"
            },
            "offers": {
                "@type": "Offer",
                "url": product.link, // Affiliate or internal
                "priceCurrency": currency,
                "price": price,
                "availability": availability,
                "itemCondition": "https://schema.org/NewCondition"
            }
        });
    }

    static getArticle(article) {
        return JSON.stringify({
            "@context": "https://schema.org",
            "@type": "NewsArticle",
            "headline": article.title,
            "image": [
                article.image
            ],
            "datePublished": article.pubDate,
            "dateModified": article.pubDate,
            "author": [{
                "@type": "Organization",
                "name": "Zentra News Engine",
                "url": "https://zentra.services"
            }]
        });
    }
}

module.exports = SchemaGenerator;
