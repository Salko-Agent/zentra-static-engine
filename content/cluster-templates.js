/**
 * Content Cluster Template
 * Reusable structure for /best/, /vergleich/, /guide/ pages
 */

const CLUSTER_TEMPLATES = {
    b2c: [
        {
            slug: 'beste-gaming-laptops-oesterreich',
            title: 'Beste Gaming Laptops in Österreich (2026)',
            intent: 'buy',
            category: 'hardware',
            metaDescription: 'Die besten Gaming Laptops 2026 im Vergleich. RTX 4000-GPUs, AMD Ryzen & Intel Core. Getestet für österreichische Gamer.',
            outline: [
                'Top 5 Gaming Laptops 2026',
                'Vergleichskriterien: GPU, CPU, Display, Preis',
                'Budget vs. High-End: Was lohnt sich?',
                'Versand nach Österreich: Beste Shops'
            ],
            vergleichskriterien: ['GPU (RTX 4060+)', 'CPU (Ryzen 7/i7+)', 'RAM (16GB+)', 'Display (144Hz+)', 'Preis/Leistung'],
            internalLinks: ['/produkte/hardware/', '/vergleich/gaming-pc-vs-laptop/', '/guide/grafikkarten-kaufberatung/'],
            affiliateDisclosure: true,
            targetProducts: 8  // Anzahl Produkt-Slots
        },
        {
            slug: 'beste-noise-cancelling-kopfhoerer',
            title: 'Beste Noise Cancelling Kopfhörer (2026)',
            intent: 'buy',
            category: 'audio',
            metaDescription: 'Top Noise Cancelling Kopfhörer 2026: Sony, Bose, Apple im Vergleich. Klangqualität, ANC-Performance & Preis.',
            outline: [
                'Top 5 NC-Kopfhörer im Test',
                'ANC-Technologie erklärt',
                'Over-Ear vs. In-Ear',
                'Preis-Leistungs-Sieger'
            ],
            vergleichskriterien: ['ANC-Qualität', 'Klang', 'Akkulaufzeit', 'Tragekomfort', 'Preis'],
            internalLinks: ['/produkte/audio/', '/best/bluetooth-kopfhoerer/', '/guide/kopfhoerer-kaufberatung/'],
            affiliateDisclosure: true,
            targetProducts: 6
        },
        {
            slug: 'beste-smartphones-unter-500-euro',
            title: 'Beste Smartphones unter 500€ (2026)',
            intent: 'buy',
            category: 'tech',
            metaDescription: 'Top Mittelklasse-Smartphones 2026 unter 500€. Samsung, Xiaomi, Google Pixel im Vergleich.',
            outline: [
                'Top 5 Preis-Leistungs-Champions',
                'Kamera-Qualität im Vergleich',
                '5G & Performance',
                'Wo kaufen? Beste AT-Shops'
            ],
            vergleichskriterien: ['Kamera', 'Performance', '5G', 'Akku', 'Display', 'Preis'],
            internalLinks: ['/produkte/tech/', '/best/flagship-smartphones/', '/vergleich/android-vs-ios/'],
            affiliateDisclosure: true,
            targetProducts: 8
        }
    ],

    b2b: [
        {
            slug: 'beste-business-laptops-2026',
            title: 'Beste Business Laptops für Unternehmen (2026)',
            intent: 'b2b',
            category: 'hardware',
            metaDescription: 'Professionelle Business Laptops 2026: ThinkPad, Dell Latitude, HP Elite. Security, Langlebigkeit, Support.',
            outline: [
                'Top 5 Enterprise Laptops',
                'Security Features: TPM 2.0, Biometrie',
                'Support & Garantie-Optionen',
                'Flottenpreise & Leasing'
            ],
            vergleichskriterien: ['Security', 'Langlebigkeit', 'Support', 'Management-Tools', 'TCO'],
            internalLinks: ['/b2b/', '/produkte/hardware/', '/guide/business-it-beschaffung/'],
            affiliateDisclosure: true,
            leadForm: true,
            targetProducts: 5
        },
        {
            slug: 'beste-netzwerk-switches-unternehmen',
            title: 'Beste Netzwerk-Switches für Unternehmen',
            intent: 'b2b',
            category: 'tech',
            metaDescription: 'Managed Switches für KMU & Enterprise: Cisco, Netgear, TP-Link. PoE, VLANs, Redundanz.',
            outline: [
                'Managed vs. Unmanaged Switches',
                'PoE+ für IP-Telefonie & Access Points',
                'Redundanz & High Availability',
                'Best Practices für SMB'
            ],
            vergleichskriterien: ['Management-Features', 'PoE-Budget', 'Port-Anzahl', 'Redundanz', 'Preis'],
            internalLinks: ['/b2b/', '/produkte/tech/', '/guide/netzwerk-infrastruktur/'],
            affiliateDisclosure: true,
            leadForm: true,
            targetProducts: 6
        }
    ]
};

module.exports = CLUSTER_TEMPLATES;
