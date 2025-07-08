const JSONdb = require('simple-json-db');
const path = require('path');

const ScraperService = require('./scraperService');
const DownloadService = require('./downloadService');
const convertJsonToCsv = require('../func/convertJsonToCsv');
const Utils = require('./utils');
const config = require('../config');

class ScheduledTaskService {
    constructor() {
        this.scraperService = new ScraperService();
        this.downloadService = new DownloadService();
        this.isRunning = false;
        this.cleanupTimeout = null;
    }

    /**
     * Executes the complete scheduled task for a given date
     * @param {Date} targetDate - Date to process (defaults to current date)
     * @param {Object} options - Additional options for the task
     * @returns {Promise<Object>} - Task results including successful and failed downloads
     */
    async executeTask(targetDate = new Date(), options = {}) {
        if (this.isRunning) {
            throw new Error('Task is already running. Please wait for it to complete.');
        }

        this.isRunning = true;
        console.log(`Starting scheduled task for date: ${Utils.formatDateForScraping(targetDate)}`);
        
        try {
            // Initialize services
            await this._initializeServices();
            
            // Scrape entries for the target date
            const entries = await this.scraperService.scrapeForDate(targetDate);
            
            if (entries.length === 0) {
                console.log('No entries found for the specified date');
                return {
                    date: targetDate,
                    totalEntries: 0,
                    successful: [],
                    failed: [],
                    message: 'No entries found for the specified date'
                };
            }

            // Get cookies for authenticated downloads
            const cookies = await this.scraperService.getCookies();
            
            // Download files
            const downloadResults = await this.downloadService.downloadFiles(entries, cookies);
            
            // Save results to database and CSV
            await this._saveResults(downloadResults.successful, downloadResults.failed);
            
            // Schedule cleanup
            this._scheduleCleanup();
            
            const result = {
                date: targetDate,
                totalEntries: entries.length,
                successful: downloadResults.successful,
                failed: downloadResults.failed,
                stats: this.downloadService.getStats(),
                message: `Task completed successfully. ${downloadResults.successful.length} files downloaded.`
            };
            
            console.log('Scheduled task completed successfully');
            return result;
            
        } catch (error) {
            console.error('Scheduled task failed:', error);
            throw error;
        } finally {
            await this._cleanup();
            this.isRunning = false;
        }
    }

    /**
     * Executes task for today's date
     * @param {Object} options - Additional options for the task
     * @returns {Promise<Object>} - Task results
     */
    async executeForToday(options = {}) {
        return this.executeTask(new Date(), options);
    }

    /**
     * Executes task for yesterday's date
     * @param {Object} options - Additional options for the task
     * @returns {Promise<Object>} - Task results
     */
    async executeForYesterday(options = {}) {
        const yesterday = new Date();
        yesterday.setDate(yesterday.getDate() - 1);
        return this.executeTask(yesterday, options);
    }

    /**
     * Cancels the currently running task
     * @returns {Promise<void>}
     */
    async cancelTask() {
        if (!this.isRunning) {
            console.log('No task is currently running');
            return;
        }

        console.log('Cancelling running task...');
        await this._cleanup();
        this.isRunning = false;
        console.log('Task cancelled');
    }

    /**
     * Gets the current status of the task service
     * @returns {Object} - Status information
     */
    getStatus() {
        return {
            isRunning: this.isRunning,
            downloadStats: this.downloadService.getStats(),
            hasScheduledCleanup: this.cleanupTimeout !== null
        };
    }

    /**
     * Initializes all required services
     * @returns {Promise<void>}
     */
    async _initializeServices() {
        try {
            // Validate download directory
            await this.downloadService.validateDownloadDirectory();
            
            // Initialize scraper
            await this.scraperService.initialize();
            await this.scraperService.login();
            
            console.log('All services initialized successfully');
        } catch (error) {
            console.error('Failed to initialize services:', error);
            throw error;
        }
    }

    /**
     * Saves successful and failed results to database and CSV files
     * @param {Array} successful - Array of successful downloads
     * @param {Array} failed - Array of failed downloads
     * @returns {Promise<void>}
     */
    async _saveResults(successful, failed) {
        try {
            // Save successful downloads to main database and CSV
            if (successful.length > 0) {
                await this._saveToDatabase(successful, config.files.database);
                await this._saveToCSV(successful, config.files.dataCsv);
                console.log(`Saved ${successful.length} successful downloads to database and CSV`);
            }

            // Save failed downloads to error CSV
            if (failed.length > 0) {
                await this._saveToCSV(failed, config.files.errorCsv);
                console.log(`Saved ${failed.length} failed downloads to error CSV`);
            }

        } catch (error) {
            console.error('Failed to save results:', error);
            throw error;
        }
    }

    /**
     * Saves data to JSON database
     * @param {Array} data - Data to save
     * @param {string} dbPath - Database file path
     * @returns {Promise<void>}
     */
    async _saveToDatabase(data, dbPath) {
        try {
            Utils.ensureDirectoryExistence(dbPath);
            const db = new JSONdb(dbPath);
            db.JSON(data);
            db.sync();
            console.log(`Data saved to database: ${dbPath}`);
        } catch (error) {
            console.error(`Failed to save to database ${dbPath}:`, error);
            throw error;
        }
    }

    /**
     * Saves data to CSV file
     * @param {Array} data - Data to save
     * @param {string} csvPath - CSV file path
     * @returns {Promise<void>}
     */
    async _saveToCSV(data, csvPath) {
        return new Promise((resolve, reject) => {
            try {
                Utils.touch(csvPath);
                convertJsonToCsv(data, csvPath, (err) => {
                    if (err) {
                        reject(err);
                    } else {
                        console.log(`Data saved to CSV: ${csvPath}`);
                        resolve();
                    }
                });
            } catch (error) {
                reject(error);
            }
        });
    }

    /**
     * Schedules file cleanup
     */
    _scheduleCleanup() {
        if (this.cleanupTimeout) {
            clearTimeout(this.cleanupTimeout);
        }
        
        this.cleanupTimeout = this.downloadService.scheduleCleanup();
    }

    /**
     * Cleans up resources and closes connections
     * @returns {Promise<void>}
     */
    async _cleanup() {
        try {
            if (this.cleanupTimeout) {
                clearTimeout(this.cleanupTimeout);
                this.cleanupTimeout = null;
            }
            
            await this.scraperService.close();
            console.log('Cleanup completed');
        } catch (error) {
            console.error('Error during cleanup:', error);
        }
    }

    /**
     * Gets the last saved results from the database
     * @returns {Object} - Last saved results
     */
    getLastResults() {
        try {
            const db = new JSONdb(config.files.database);
            return db.JSON();
        } catch (error) {
            console.error('Failed to get last results:', error);
            return {};
        }
    }

    /**
     * Validates task parameters
     * @param {Date} targetDate - Target date to validate
     * @throws {Error} - If parameters are invalid
     */
    _validateTaskParameters(targetDate) {
        if (!(targetDate instanceof Date) || isNaN(targetDate)) {
            throw new Error('Invalid target date provided');
        }

        const maxAge = 365; // Maximum 1 year ago
        const minDate = new Date();
        minDate.setDate(minDate.getDate() - maxAge);
        
        if (targetDate < minDate) {
            throw new Error(`Target date cannot be more than ${maxAge} days ago`);
        }

        const maxDate = new Date();
        maxDate.setDate(maxDate.getDate() + 1); // Allow tomorrow
        
        if (targetDate > maxDate) {
            throw new Error('Target date cannot be in the future');
        }
    }

    /**
     * Estimates task duration and resource requirements
     * @param {Array} entries - Entries to process
     * @returns {Object} - Estimation information
     */
    async _estimateTask(entries) {
        const estimation = {
            entryCount: entries.length,
            estimatedDuration: entries.length * 30, // 30 seconds per file estimate
            estimatedSize: -1
        };

        try {
            // Try to estimate download size
            const cookies = await this.scraperService.getCookies();
            const formattedCookies = Utils.formatCookiesForRequest(cookies);
            estimation.estimatedSize = await this.downloadService.estimateDownloadSize(entries, formattedCookies);
        } catch (error) {
            console.log('Could not estimate download size');
        }

        return estimation;
    }
}

module.exports = ScheduledTaskService; 