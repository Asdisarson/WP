const BrowserService = require('./browserService');
const Utils = require('./utils');
const config = require('../config');

class ScraperService {
    constructor() {
        this.browserService = new BrowserService();
        this.isLoggedIn = false;
    }

    /**
     * Initializes the browser and sets up graceful shutdown
     * @returns {Promise<void>}
     */
    async initialize() {
        await this.browserService.launch();
        await this.browserService.createPage();
        this.browserService.setupGracefulShutdown();
    }

    /**
     * Logs into the target website
     * @returns {Promise<void>}
     */
    async login() {
        try {
            console.log('Starting login process...');
            
            // Navigate to login page
            await this.browserService.navigateTo(config.scraping.loginUrl);
            
            // Handle cookie consent if present
            await this.browserService.handleCookieConsent();
            
            // Fill in login credentials
            console.log('Typing username...');
            await this.browserService.typeText('#username', config.auth.username);
            
            console.log('Typing password...');
            await this.browserService.typeText('#password', config.auth.password);
            
            // Submit login form
            console.log('Submitting login form...');
            await this.browserService.clickElement('.button.woocommerce-button.woocommerce-form-login__submit', true);
            
            this.isLoggedIn = true;
            console.log('Login successful');
        } catch (error) {
            console.error('Login failed:', error);
            throw new Error(`Login failed: ${error.message}`);
        }
    }

    /**
     * Scrapes changelog entries for a specific date
     * @param {Date} targetDate - The date to scrape entries for
     * @returns {Promise<Array>} - Array of scraped entries
     */
    async scrapeChangelogEntries(targetDate) {
        try {
            if (!this.isLoggedIn) {
                throw new Error('Must be logged in before scraping. Call login() first.');
            }

            console.log('Navigating to changelog page...');
            await this.browserService.navigateTo(config.scraping.changelogUrl);
            
            const formattedDate = Utils.formatDateForScraping(targetDate);
            console.log(`Searching for entries from: ${formattedDate}`);

            // Extract data from the page
            const rawEntries = await this.browserService.evaluateInPage(this._extractEntriesFromPage, formattedDate);
            
            console.log(`Found ${rawEntries.length} raw entries for ${formattedDate}`);
            
            // Process the raw entries
            const processedEntries = this._processEntries(rawEntries);
            
            console.log(`Processed ${processedEntries.length} entries`);
            return processedEntries;
            
        } catch (error) {
            console.error('Failed to scrape changelog entries:', error);
            throw error;
        }
    }

    /**
     * Gets cookies for authenticated requests
     * @returns {Promise<Array>}
     */
    async getCookies() {
        try {
            if (!this.isLoggedIn) {
                throw new Error('Must be logged in to get cookies. Call login() first.');
            }
            
            return await this.browserService.getCookies();
        } catch (error) {
            console.error('Failed to get cookies:', error);
            throw error;
        }
    }

    /**
     * Takes a screenshot for debugging purposes
     * @param {string} filename - Filename for the screenshot
     * @returns {Promise<void>}
     */
    async takeDebugScreenshot(filename = 'debug-screenshot.png') {
        try {
            await this.browserService.takeScreenshot(filename);
        } catch (error) {
            console.error('Failed to take debug screenshot:', error);
        }
    }

    /**
     * Closes the browser and cleans up resources
     * @returns {Promise<void>}
     */
    async close() {
        await this.browserService.close();
        this.isLoggedIn = false;
    }

    /**
     * Function to be evaluated in the page context to extract entries
     * @param {string} targetDate - Formatted date string to match
     * @returns {Array} - Array of raw entry data
     */
    _extractEntriesFromPage(targetDate) {
        const rows = document.querySelectorAll('tr.awcpt-row');
        const entries = [];

        for (const row of rows) {
            try {
                const dateElement = row.querySelector('.awcpt-date');
                if (!dateElement) continue;
                
                const entryDate = dateElement.innerText.trim();
                
                if (entryDate === targetDate) {
                    const titleElement = row.querySelector('.awcpt-title');
                    const downloadElement = row.querySelector('.awcpt-shortcode-wrap a');
                    const productElement = row.querySelector('.awcpt-prdTitle-col a');
                    
                    if (titleElement && downloadElement && productElement) {
                        entries.push({
                            id: row.getAttribute('data-id'),
                            productName: titleElement.innerText.trim(),
                            date: entryDate,
                            downloadLink: downloadElement.getAttribute('href'),
                            productURL: productElement.getAttribute('href')
                        });
                    }
                }
            } catch (error) {
                console.error('Error processing row:', error);
                // Continue processing other rows
            }
        }

        return entries;
    }

    /**
     * Processes raw entries and extracts additional information
     * @param {Array} rawEntries - Raw entries from the page
     * @returns {Array} - Processed entries with additional fields
     */
    _processEntries(rawEntries) {
        const processedEntries = [];

        for (const entry of rawEntries) {
            try {
                const processedEntry = { ...entry };
                
                // Extract version and clean title
                const versionInfo = Utils.extractVersionFromTitle(entry.productName);
                processedEntry.version = versionInfo.version;
                processedEntry.name = versionInfo.cleanTitle;
                
                // Extract URL information
                const urlInfo = Utils.extractUrlInfo(entry.productURL);
                processedEntry.slug = urlInfo.slug;
                processedEntry.productId = urlInfo.productId;
                
                // Initialize download-related fields
                processedEntry.filename = '';
                processedEntry.filePath = '';
                processedEntry.fileUrl = '';
                
                // Only include entries that have version information
                if (versionInfo.hasVersion) {
                    processedEntries.push(processedEntry);
                }
            } catch (error) {
                console.error('Error processing entry:', entry, error);
                // Continue processing other entries
            }
        }

        return processedEntries;
    }

    /**
     * Validates that the scraper is ready for operations
     * @throws {Error} - If scraper is not properly initialized
     */
    _validateReady() {
        if (!this.browserService.isRunning()) {
            throw new Error('Browser service not running. Call initialize() first.');
        }
    }

    /**
     * Performs a complete scraping operation
     * @param {Date} targetDate - Date to scrape for
     * @returns {Promise<Array>} - Processed entries
     */
    async scrapeForDate(targetDate) {
        try {
            await this.initialize();
            await this.login();
            const entries = await this.scrapeChangelogEntries(targetDate);
            return entries;
        } catch (error) {
            console.error('Scraping operation failed:', error);
            throw error;
        } finally {
            await this.close();
        }
    }
}

module.exports = ScraperService; 