/**
 * Zentra.Services - Automated Scheduler
 * Passive Revenue Machine: Daily/Weekly/Monthly Tasks
 * 
 * Usage:
 *   Daily: node scheduler.js --task=daily
 *   Weekly: node scheduler.js --task=weekly
 *   Monthly: node scheduler.js --task=monthly
 * 
 * Cron Setup (pm2 ecosystem.config.js or crontab):
 *   Daily (6:00): 0 6 * * * node /path/to/scheduler.js --task=daily
 *   Weekly (Sun 3:00): 0 3 * * 0 node /path/to/scheduler.js --task=weekly
 *   Monthly (1st, 3:00): 0 3 1 * * node /path/to/scheduler.js --task=monthly
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const CONFIG = {
    buildScript: path.join(__dirname, 'build.js'),
    distDir: path.join(__dirname, 'dist'),
    logDir: path.join(__dirname, 'logs'),
    csvFile: path.join(__dirname, 'datafeed_2630106.csv'),
    sitemapIndexPath: path.join(__dirname, 'dist', 'sitemap_index.xml')
};

// === LOGGING ===
function ensureLogDir() {
    if (!fs.existsSync(CONFIG.logDir)) {
        fs.mkdirSync(CONFIG.logDir, { recursive: true });
    }
}

function log(message, level = 'INFO') {
    const timestamp = new Date().toISOString();
    const logMessage = `[${timestamp}] [${level}] ${message}`;
    console.log(logMessage);

    ensureLogDir();
    const logFile = path.join(CONFIG.logDir, `scheduler-${new Date().toISOString().split('T')[0]}.log`);
    fs.appendFileSync(logFile, logMessage + '\n');
}

function logError(message, error) {
    log(`${message}: ${error.message}`, 'ERROR');
    if (error.stack) {
        log(error.stack, 'ERROR');
    }
}

// === TASKS ===

async function dailyTasks() {
    log('Starting DAILY tasks...');

    try {
        // 1. AWIN CSV Ingest + Price/Availability Refresh
        log('Task 1/3: AWIN CSV ingest check...');
        if (fs.existsSync(CONFIG.csvFile)) {
            const stats = fs.statSync(CONFIG.csvFile);
            const ageHours = (Date.now() - stats.mtimeMs) / (1000 * 60 * 60);

            if (ageHours < 24) {
                log(`AWIN CSV is fresh (${ageHours.toFixed(1)}h old). Proceeding with build.`);
            } else {
                log(`WARNING: AWIN CSV is ${ageHours.toFixed(1)}h old. Consider re-downloading.`, 'WARN');
            }
        } else {
            log('ERROR: AWIN CSV not found. Skipping build.', 'ERROR');
            return;
        }

        // 2. Rebuild deals pages + products (full build)
        log('Task 2/3: Running full build (deals, products, news)...');
        execSync(`node "${CONFIG.buildScript}"`, { stdio: 'inherit' });
        log('Build completed successfully.');

        // 3. Sitemap lastmod update
        log('Task 3/3: Sitemap regenerated with updated lastmod.');
        if (fs.existsSync(CONFIG.sitemapIndexPath)) {
            log(`Sitemap index available at: ${CONFIG.sitemapIndexPath}`);
        }

        log('DAILY tasks completed successfully.');

    } catch (error) {
        logError('DAILY tasks failed', error);
        throw error;
    }
}

async function weeklyTasks() {
    log('Starting WEEKLY tasks...');

    try {
        // 1. Rebuild best/vergleich pages (only if content changed)
        log('Task 1/4: Checking for content changes (best/vergleich)...');
        // TODO: Implement change detection logic
        log('Content change detection not yet implemented. Skipping rebuild.');

        // 2. Internal link refresh
        log('Task 2/4: Internal link integrity check...');
        // TODO: Scan for broken internal links
        log('Link integrity check not yet implemented.');

        // 3. Newsletter digest generation
        log('Task 3/4: Newsletter digest generation...');
        // TODO: Generate weekly digest HTML
        log('Newsletter digest generation not yet implemented.');

        // 4. Full build (fallback)
        log('Task 4/4: Running full build...');
        execSync(`node "${CONFIG.buildScript}"`, { stdio: 'inherit' });

        log('WEEKLY tasks completed successfully.');

    } catch (error) {
        logError('WEEKLY tasks failed', error);
        throw error;
    }
}

async function monthlyTasks() {
    log('Starting MONTHLY tasks...');

    try {
        // 1. Content quality audit (thin pages)
        log('Task 1/3: Content quality audit...');
        // TODO: Scan for thin pages, flag for noindex or upgrade
        log('Content quality audit not yet implemented.');

        // 2. Broken affiliate links scan
        log('Task 2/3: Checking affiliate link integrity...');
        // TODO: Scan all AWIN deeplinks, check for 404s
        log('Affiliate link scan not yet implemented.');

        // 3. Schema validation scan
        log('Task 3/3: Schema.org validation...');
        // TODO: Validate schema markup on sample pages
        log('Schema validation not yet implemented.');

        log('MONTHLY tasks completed successfully.');

    } catch (error) {
        logError('MONTHLY tasks failed', error);
        throw error;
    }
}

// === MAIN ===

async function main() {
    const args = process.argv.slice(2);
    const taskArg = args.find(arg => arg.startsWith('--task='));

    if (!taskArg) {
        console.error('Usage: node scheduler.js --task=<daily|weekly|monthly>');
        process.exit(1);
    }

    const task = taskArg.split('=')[1];

    log(`========== SCHEDULER START: ${task.toUpperCase()} ==========`);

    try {
        switch (task) {
            case 'daily':
                await dailyTasks();
                break;
            case 'weekly':
                await weeklyTasks();
                break;
            case 'monthly':
                await monthlyTasks();
                break;
            default:
                log(`Unknown task: ${task}`, 'ERROR');
                process.exit(1);
        }

        log(`========== SCHEDULER END: ${task.toUpperCase()} SUCCESS ==========`);
        process.exit(0);

    } catch (error) {
        log(`========== SCHEDULER END: ${task.toUpperCase()} FAILED ==========`);
        process.exit(1);
    }
}

if (require.main === module) {
    main();
}

module.exports = { dailyTasks, weeklyTasks, monthlyTasks };
