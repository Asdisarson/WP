const axios = require('axios');
const fs = require('fs');
const path = require('path');
const stream = require('stream');
const { promisify } = require('util');

const Utils = require('./utils');
const config = require('../config');

const pipeline = promisify(stream.pipeline);

class DownloadService {
    constructor() {
        this.downloadStats = {
            successful: 0,
            failed: 0,
            total: 0
        };
    }

    /**
     * Downloads files for all entries
     * @param {Array} entries - Array of entries to download
     * @param {Array} cookies - Authentication cookies
     * @returns {Promise<Object>} - Download results with successful and failed downloads
     */
    async downloadFiles(entries, cookies) {
        try {
            this._resetStats();
            this.downloadStats.total = entries.length;
            
            console.log(`Starting download of ${entries.length} files...`);
            
            // Ensure download directory exists
            Utils.ensureDirectoryExists(config.directories.downloads);
            Utils.touch(path.join(config.directories.downloads, 'index.html'));
            
            const formattedCookies = Utils.formatCookiesForRequest(cookies);
            const results = {
                successful: [],
                failed: []
            };
            
            for (let i = 0; i < entries.length; i++) {
                const entry = entries[i];
                console.log(`Downloading file ${i + 1} of ${entries.length}: ${entry.productName}`);
                
                try {
                    const downloadedEntry = await this._downloadSingleFile(entry, formattedCookies);
                    results.successful.push(downloadedEntry);
                    this.downloadStats.successful++;
                } catch (error) {
                    console.error(`Failed to download ${entry.productName}:`, error.message);
                    results.failed.push({
                        ...entry,
                        error: error.message
                    });
                    this.downloadStats.failed++;
                }
            }
            
            this._logDownloadStats();
            return results;
            
        } catch (error) {
            console.error('Download operation failed:', error);
            throw error;
        }
    }

    /**
     * Downloads a single file
     * @param {Object} entry - Entry object containing download information
     * @param {string} cookies - Formatted cookie string
     * @returns {Promise<Object>} - Updated entry with file information
     */
    async _downloadSingleFile(entry, cookies) {
        try {
            // Validate entry has required fields
            Utils.validateRequiredFields(entry, ['downloadLink', 'slug']);
            
            // Generate filename and file path
            const filename = Utils.generateFilename(entry.slug);
            const filePath = path.join(config.directories.downloads, filename);
            
            // Create the file
            Utils.touch(filePath);
            
            // Download the file
            const response = await axios({
                url: entry.downloadLink,
                method: 'GET',
                responseType: 'stream',
                headers: {
                    Cookie: cookies,
                    'User-Agent': config.scraping.userAgent
                },
                timeout: 30000 // 30 second timeout
            });
            
            // Check response status
            if (response.status !== 200) {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }
            
            // Save the file
            await pipeline(response.data, fs.createWriteStream(filePath));
            
            // Verify file was created and has content
            const stats = fs.statSync(filePath);
            if (stats.size === 0) {
                throw new Error('Downloaded file is empty');
            }
            
            console.log(`Successfully downloaded: ${filename} (${this._formatFileSize(stats.size)})`);
            
            // Update entry with file information
            return {
                ...entry,
                filename,
                filePath,
                fileUrl: path.join(config.app.downloadUrl, filename),
                fileSize: stats.size,
                downloadedAt: new Date().toISOString()
            };
            
        } catch (error) {
            // Clean up partial file if it exists
            const filename = Utils.generateFilename(entry.slug);
            const filePath = path.join(config.directories.downloads, filename);
            
            try {
                if (fs.existsSync(filePath)) {
                    fs.unlinkSync(filePath);
                }
            } catch (cleanupError) {
                console.error('Failed to clean up partial file:', cleanupError);
            }
            
            throw new Error(`Download failed for ${entry.productName}: ${error.message}`);
        }
    }

    /**
     * Schedules cleanup of downloaded files after a delay
     * @param {number} delayMs - Delay in milliseconds before cleanup
     * @returns {NodeJS.Timeout} - Timeout ID for potential cancellation
     */
    scheduleCleanup(delayMs = config.timeouts.fileCleanup) {
        console.log(`Scheduling file cleanup in ${delayMs / 1000} seconds...`);
        
        return setTimeout(async () => {
            try {
                await Utils.cleanupFiles(config.directories.downloads);
                console.log('Scheduled file cleanup completed');
            } catch (error) {
                console.error('Scheduled file cleanup failed:', error);
            }
        }, delayMs);
    }

    /**
     * Gets download statistics
     * @returns {Object} - Download statistics
     */
    getStats() {
        return { ...this.downloadStats };
    }

    /**
     * Resets download statistics
     */
    _resetStats() {
        this.downloadStats = {
            successful: 0,
            failed: 0,
            total: 0
        };
    }

    /**
     * Logs download statistics
     */
    _logDownloadStats() {
        const { successful, failed, total } = this.downloadStats;
        const successRate = total > 0 ? ((successful / total) * 100).toFixed(1) : 0;
        
        console.log('=== Download Summary ===');
        console.log(`Total files: ${total}`);
        console.log(`Successful: ${successful}`);
        console.log(`Failed: ${failed}`);
        console.log(`Success rate: ${successRate}%`);
        console.log('========================');
    }

    /**
     * Formats file size in human readable format
     * @param {number} bytes - File size in bytes
     * @returns {string} - Formatted file size
     */
    _formatFileSize(bytes) {
        const sizes = ['Bytes', 'KB', 'MB', 'GB'];
        if (bytes === 0) return '0 Bytes';
        
        const i = Math.floor(Math.log(bytes) / Math.log(1024));
        return Math.round(bytes / Math.pow(1024, i) * 100) / 100 + ' ' + sizes[i];
    }

    /**
     * Validates download directory and creates it if needed
     * @returns {Promise<void>}
     */
    async validateDownloadDirectory() {
        try {
            const downloadDir = config.directories.downloads;
            
            // Ensure directory exists
            Utils.ensureDirectoryExists(downloadDir);
            
            // Test write permissions
            const testFile = path.join(downloadDir, '.write-test');
            fs.writeFileSync(testFile, 'test');
            fs.unlinkSync(testFile);
            
            console.log('Download directory validated');
        } catch (error) {
            throw new Error(`Download directory validation failed: ${error.message}`);
        }
    }

    /**
     * Estimates total download size (if supported by server)
     * @param {Array} entries - Entries to download
     * @param {string} cookies - Formatted cookie string
     * @returns {Promise<number>} - Estimated total size in bytes (or -1 if unknown)
     */
    async estimateDownloadSize(entries, cookies) {
        let totalSize = 0;
        let unknownSizes = 0;
        
        console.log('Estimating download size...');
        
        for (const entry of entries.slice(0, Math.min(entries.length, 5))) { // Limit to first 5 for speed
            try {
                const response = await axios.head(entry.downloadLink, {
                    headers: {
                        Cookie: cookies,
                        'User-Agent': config.scraping.userAgent
                    },
                    timeout: 5000
                });
                
                const contentLength = response.headers['content-length'];
                if (contentLength) {
                    totalSize += parseInt(contentLength);
                } else {
                    unknownSizes++;
                }
            } catch (error) {
                unknownSizes++;
            }
        }
        
        if (unknownSizes === 0) {
            console.log(`Estimated download size: ${this._formatFileSize(totalSize * entries.length / Math.min(entries.length, 5))}`);
            return totalSize * entries.length / Math.min(entries.length, 5);
        } else {
            console.log('Could not estimate download size - server does not provide content-length headers');
            return -1;
        }
    }
}

module.exports = DownloadService; 