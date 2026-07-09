/**
 * KPI Tracking System
 * Defines metrics structure for SEO, Affiliate, AdSense, B2B
 */

const KPI_DEFINITIONS = {
    seo: {
        index_coverage: {
            name: 'Index Coverage',
            source: 'Google Search Console',
            metric: 'indexed_pages / total_pages',
            target: 0.95,
            unit: '%'
        },
        crawl_errors: {
            name: 'Crawl Errors',
            source: 'Google Search Console',
            metric: 'error_count',
            target: 0,
            unit: 'count'
        },
        organic_sessions: {
            name: 'Organic Sessions',
            source: 'GA4',
            metric: 'sessions',
            filter: 'source = organic',
            target: 10000,
            unit: 'sessions/month'
        },
        avg_ctr: {
            name: 'Average CTR',
            source: 'Google Search Console',
            metric: 'clicks / impressions',
            target: 0.05,
            unit: '%'
        }
    },

    affiliate: {
        clicks: {
            name: 'Affiliate Clicks',
            source: 'Beacon API + GA4',
            metric: 'affiliate_click events',
            event: 'affiliate_click',
            target: 500,
            unit: 'clicks/day'
        },
        epc: {
            name: 'Earnings Per Click',
            source: 'AWIN Dashboard',
            metric: 'total_commission / total_clicks',
            target: 0.50,
            unit: 'EUR'
        },
        revenue: {
            name: 'Affiliate Revenue',
            source: 'AWIN Dashboard',
            metric: 'total_commission',
            target: 5000,
            unit: 'EUR/month'
        },
        conversion_rate: {
            name: 'Conversion Rate',
            source: 'AWIN Dashboard',
            metric: 'sales / clicks',
            target: 0.03,
            unit: '%'
        }
    },

    adsense: {
        rpm: {
            name: 'Revenue Per Mille',
            source: 'Google AdSense',
            metric: 'earnings / (pageviews / 1000)',
            target: 3.00,
            unit: 'EUR'
        },
        ctr: {
            name: 'Ad Click-Through Rate',
            source: 'Google AdSense',
            metric: 'ad_clicks / ad_impressions',
            target: 0.01,
            unit: '%'
        },
        consent_rate: {
            name: 'Consent Grant Rate',
            source: 'GA4 Custom Event',
            metric: 'consent_granted / total_visitors',
            event: 'consent_update',
            target: 0.70,
            unit: '%'
        },
        earnings: {
            name: 'AdSense Earnings',
            source: 'Google AdSense',
            metric: 'total_earnings',
            target: 1000,
            unit: 'EUR/month'
        }
    },

    b2b: {
        leads: {
            name: 'B2B Leads',
            source: 'GA4 + Form Submissions',
            metric: 'lead_form_submit events',
            event: 'lead_submit',
            target: 20,
            unit: 'leads/month'
        },
        lead_quality: {
            name: 'Lead Quality Score',
            source: 'Manual CRM',
            metric: 'qualified_leads / total_leads',
            target: 0.60,
            unit: '%'
        },
        b2b_revenue: {
            name: 'B2B Revenue',
            source: 'Manual Tracking',
            metric: 'closed_deals * avg_deal_value',
            target: 10000,
            unit: 'EUR/month'
        }
    }
};

// GA4 Event Specifications
const GA4_EVENTS = {
    // Affiliate tracking (already implemented in tracking.js)
    affiliate_click: {
        parameters: ['merchant', 'product_id', 'slot_position', 'page_url', 'page_type']
    },

    // Consent tracking
    consent_update: {
        parameters: ['consent_type', 'consent_granted']
    },

    // B2B lead tracking
    lead_submit: {
        parameters: ['form_type', 'company_size', 'industry', 'product_interest']
    },

    // Page engagement
    page_view_enriched: {
        parameters: ['page_intent', 'page_strategy', 'product_count']
    }
};

module.exports = { KPI_DEFINITIONS, GA4_EVENTS };
