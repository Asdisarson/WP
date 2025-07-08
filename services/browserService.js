const puppeteer = require('puppeteer');
const config = require('../config');

class BrowserService {
    constructor() {
        this.browser = null;
        this.page = null;
    }

    /**
     * Launches a new browser instance
     * @returns {Promise<void>}
     */
    async launch() {
        try {
            console.log('Launching Puppeteer browser...');
            
            const browserOptions = {
                ...config.puppeteer,
                userAgent: config.scraping.userAgent
            };

            this.browser = await puppeteer.launch(browserOptions);
            console.log('Browser launched successfully');
        } catch (error) {
            console.error('Failed to launch browser:', error);
            throw error;
        }
    }

    /**
     * Creates a new page with default settings
     * @returns {Promise<Page>}
     */
    async createPage() {
        try {
            if (!this.browser) {
                throw new Error('Browser not launched. Call launch() first.');
            }

            this.page = await this.browser.newPage();
            this.page.setDefaultTimeout(config.timeouts.browserTimeout);
            
            console.log('New page created');
            return this.page;
        } catch (error) {
            console.error('Failed to create page:', error);
            throw error;
        }
    }

    /**
     * Navigates to a URL with error handling
     * @param {string} url - URL to navigate to
     * @param {object} options - Navigation options
     * @returns {Promise<void>}
     */
    async navigateTo(url, options = {}) {
        try {
            if (!this.page) {
                throw new Error('Page not created. Call createPage() first.');
            }

            console.log(`Navigating to: ${url}`);
            await this.page.goto(url, {
                waitUntil: 'networkidle2',
                timeout: 30000,
                ...options
            });
            console.log(`Successfully navigated to: ${url}`);
        } catch (error) {
            console.error(`Failed to navigate to ${url}:`, error);
            throw error;
        }
    }

    /**
     * Types text into an element
     * @param {string} selector - CSS selector for the element
     * @param {string} text - Text to type
     * @param {object} options - Typing options
     * @returns {Promise<void>}
     */
    async typeText(selector, text, options = {}) {
        try {
            if (!this.page) {
                throw new Error('Page not created. Call createPage() first.');
            }

            await this.page.waitForSelector(selector, { timeout: 10000 });
            await this.page.type(selector, text, {
                delay: 100,
                ...options
            });
            console.log(`Text typed into ${selector}`);
        } catch (error) {
            console.error(`Failed to type text into ${selector}:`, error);
            throw error;
        }
    }

    /**
     * Clicks an element with wait for navigation
     * @param {string} selector - CSS selector for the element
     * @param {boolean} waitForNavigation - Whether to wait for navigation
     * @returns {Promise<void>}
     */
    async clickElement(selector, waitForNavigation = false) {
        try {
            if (!this.page) {
                throw new Error('Page not created. Call createPage() first.');
            }

            await this.page.waitForSelector(selector, { timeout: 10000 });
            
            if (waitForNavigation) {
                await Promise.all([
                    this.page.waitForNavigation({ waitUntil: 'networkidle2' }),
                    this.page.click(selector)
                ]);
            } else {
                await this.page.click(selector);
            }
            
            console.log(`Clicked element: ${selector}`);
        } catch (error) {
            console.error(`Failed to click element ${selector}:`, error);
            throw error;
        }
    }

    /**
     * Attempts to handle cookie consent dialog
     * @returns {Promise<void>}
     */
    async handleCookieConsent() {
        try {
            if (!this.page) {
                throw new Error('Page not created. Call createPage() first.');
            }

            // Try to find and click cookie consent button
            const consentSelector = '.fc-button-label';
            
            try {
                await this.page.waitForSelector(consentSelector, { timeout: 5000 });
                await this.page.click(consentSelector);
                console.log('Cookie consent handled');
            } catch (error) {
                console.log('No cookie consent dialog found');
            }
        } catch (error) {
            console.error('Error handling cookie consent:', error);
            // Don't throw here as this is optional
        }
    }

    /**
     * Evaluates JavaScript in the page context
     * @param {Function} pageFunction - Function to evaluate
     * @param {...any} args - Arguments to pass to the function
     * @returns {Promise<any>}
     */
    async evaluateInPage(pageFunction, ...args) {
        try {
            if (!this.page) {
                throw new Error('Page not created. Call createPage() first.');
            }

            return await this.page.evaluate(pageFunction, ...args);
        } catch (error) {
            console.error('Failed to evaluate function in page:', error);
            throw error;
        }
    }

    /**
     * Gets cookies from the current page
     * @returns {Promise<Array>}
     */
    async getCookies() {
        try {
            if (!this.page) {
                throw new Error('Page not created. Call createPage() first.');
            }

            return await this.page.cookies();
        } catch (error) {
            console.error('Failed to get cookies:', error);
            throw error;
        }
    }

    /**
     * Takes a screenshot of the current page
     * @param {string} path - Path to save the screenshot
     * @returns {Promise<void>}
     */
    async takeScreenshot(path) {
        try {
            if (!this.page) {
                throw new Error('Page not created. Call createPage() first.');
            }

            await this.page.screenshot({ path, fullPage: true });
            console.log(`Screenshot saved to: ${path}`);
        } catch (error) {
            console.error('Failed to take screenshot:', error);
            throw error;
        }
    }

    /**
     * Closes the browser and cleans up resources
     * @returns {Promise<void>}
     */
    async close() {
        try {
            if (this.page) {
                await this.page.close();
                this.page = null;
                console.log('Page closed');
            }

            if (this.browser) {
                await this.browser.close();
                this.browser = null;
                console.log('Browser closed');
            }
        } catch (error) {
            console.error('Error closing browser:', error);
            throw error;
        }
    }

    /**
     * Ensures browser is properly closed on process termination
     */
    setupGracefulShutdown() {
        const cleanup = async () => {
            await this.close();
            process.exit(0);
        };

        process.on('SIGINT', cleanup);
        process.on('SIGTERM', cleanup);
        process.on('uncaughtException', async (error) => {
            console.error('Uncaught exception:', error);
            await this.close();
            process.exit(1);
        });
    }

    /**
     * Checks if browser is currently running
     * @returns {boolean}
     */
    isRunning() {
        return this.browser !== null && this.browser.isConnected();
    }
}

module.exports = BrowserService; 