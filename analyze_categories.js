const fs = require('fs');
const readline = require('readline');

const filePath = 'datafeed_2630106.csv';

async function analyze() {
    if (!fs.existsSync(filePath)) {
        console.error(`File not found: ${filePath}`);
        return;
    }

    const fileStream = fs.createReadStream(filePath);
    const rl = readline.createInterface({
        input: fileStream,
        crlfDelay: Infinity
    });

    let headers = null;
    let categoryNameIdx = -1;
    let merchantCategoryIdx = -1;
    let productNameIdx = -1;

    const categoryCounts = new Map();
    const categorySamples = new Map();

    let lineCount = 0;

    // Parser that takes a delimiter
    function parseLine(text, delimiter) {
        const result = [];
        let cur = '';
        let inQuote = false;
        for (let i = 0; i < text.length; i++) {
            const char = text[i];
            if (inQuote) {
                if (char === '"') {
                    if (i + 1 < text.length && text[i + 1] === '"') {
                        cur += '"';
                        i++;
                    } else {
                        inQuote = false;
                    }
                } else {
                    cur += char;
                }
            } else {
                if (char === '"') {
                    inQuote = true;
                } else if (char === delimiter) {
                    result.push(cur);
                    cur = '';
                } else {
                    cur += char;
                }
            }
        }
        result.push(cur);
        return result;
    }

    let delimiter = ','; // Default to comma

    for await (const line of rl) {
        if (!headers) {
            // Detect delimiter
            // Check for semicolon vs comma frequency in the first line
            const commaCount = (line.match(/,/g) || []).length;
            const semiCount = (line.match(/;/g) || []).length;
            
            if (semiCount > commaCount) {
                delimiter = ';';
            }
            
            // Try to parse with detected delimiter
            let parts = parseLine(line, delimiter);
            
            headers = parts.map(h => h.trim());
            categoryNameIdx = headers.indexOf('category_name');
            merchantCategoryIdx = headers.indexOf('merchant_category');
            productNameIdx = headers.indexOf('product_name');
            
            if (productNameIdx === -1) productNameIdx = headers.indexOf('name');
            if (productNameIdx === -1) productNameIdx = headers.indexOf('title');

            console.log(`Detected delimiter: "${delimiter}"`);
            console.log('Headers found:', headers);
            console.log('Indices:', { categoryNameIdx, merchantCategoryIdx, productNameIdx });
            
            if (categoryNameIdx === -1 && merchantCategoryIdx === -1) {
                console.error('Could not find category columns (category_name or merchant_category).');
                // Fallback: print headers to help debug
                console.log('Available headers:', headers);
                process.exit(1);
            }
            continue;
        }

        const parts = parseLine(line, delimiter);
        
        // Get category
        let category = '';
        if (categoryNameIdx !== -1 && parts[categoryNameIdx]) category = parts[categoryNameIdx];
        if (!category && merchantCategoryIdx !== -1 && parts[merchantCategoryIdx]) category = parts[merchantCategoryIdx];
        
        category = (category || '').trim();
        
        if (category) {
            const count = categoryCounts.get(category) || 0;
            categoryCounts.set(category, count + 1);
            
            if (productNameIdx !== -1) {
                const product = parts[productNameIdx];
                if (product) {
                    if (!categorySamples.has(category)) {
                        categorySamples.set(category, []);
                    }
                    const samples = categorySamples.get(category);
                    if (samples.length < 5) {
                        samples.push(product);
                    }
                }
            }
        }
        
        lineCount++;
        if (lineCount % 10000 === 0) process.stdout.write(`\rProcessed ${lineCount} lines...`);
    }
    
    console.log(`\nFinished processing ${lineCount} lines.`);
    
    // Sort and output
    const sortedCategories = [...categoryCounts.entries()].sort((a, b) => b[1] - a[1]);
    
    console.log('\nTop 50 Categories:');
    console.log('--------------------------------------------------');
    const top50 = sortedCategories.slice(0, 50);
    
    top50.forEach(([cat, count], index) => {
        console.log(`${index + 1}. ${cat} (${count})`);
    });
    
    console.log('\nSample Products for Top 10 Categories:');
    console.log('--------------------------------------------------');
    const top10 = sortedCategories.slice(0, 10);
    
    top10.forEach(([cat, count]) => {
        console.log(`\nCategory: ${cat} (${count})`);
        const samples = categorySamples.get(cat) || [];
        samples.forEach(s => console.log(`  - ${s}`));
    });
}

analyze().catch(console.error);
