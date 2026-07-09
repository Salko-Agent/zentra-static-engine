// Quick RSS debug script to see what's in the feeds
const https = require('https');

function fetchRSS(url) {
    return new Promise((resolve, reject) => {
        https.get(url, { headers: { 'User-Agent': 'Mozilla/5.0' } }, (res) => {
            let data = '';
            res.on('data', chunk => data += chunk);
            res.on('end', () => resolve(data));
        }).on('error', reject);
    });
}

async function test() {
    console.log('Fetching Wired RSS...\n');
    const xml = await fetchRSS('https://www.wired.com/feed/rss');

    // Get first item
    const itemMatch = xml.match(/<item>([\s\S]*?)<\/item>/);
    if (itemMatch) {
        const item = itemMatch[1];
        console.log('=== FIRST RSS ITEM ===');
        console.log(item.substring(0, 2000)); // First 2000 chars
        console.log('\n=== LOOKING FOR IMAGES ===');

        // Check all image patterns
        console.log('media:content:', item.match(/<media:content[^>]*url=["'](https?:\/\/[^"']+)["']/));
        console.log('media:thumbnail:', item.match(/<media:thumbnail[^>]*url=["'](https?:\/\/[^"']+)["']/));
        console.log('enclosure:', item.match(/<enclosure[^>]*url=["'](https?:\/\/[^"']+)["'][^>]*type=["']image/));
        console.log('content:encoded img:', item.match(/<content:encoded><!\[CDATA\[([\s\S]*?)\]\]><\/content:encoded>/)?.[1]?.match(/<img[^>]+src=["'](https?:\/\/[^"']+)["']/));
        console.log('description img:', item.match(/<img[^>]+src=["'](https?:\/\/[^"']+)["']/));
    }
}

test().catch(console.error);
