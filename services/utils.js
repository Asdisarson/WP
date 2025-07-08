const fs = require('fs');
const path = require('path');

class Utils {
    /**
     * Ensures that a directory exists, creating it recursively if necessary
     * @param {string} filePath - The file path whose directory should exist
     * @returns {boolean} - True if directory exists or was created successfully
     */
    static ensureDirectoryExistence(filePath) {
        const dirname = path.dirname(filePath);
        if (fs.existsSync(dirname)) {
            return true;
        }
        this.ensureDirectoryExistence(dirname);
        fs.mkdirSync(dirname);
        return true;
    }

    /**
     * Creates an empty file or updates its modification time
     * @param {string} filename - The file to touch
     */
    static touch(filename) {
        try {
            if (!fs.existsSync(filename)) {
                fs.writeFileSync(filename, '');
            } else {
                const currentTime = new Date();
                fs.utimesSync(filename, currentTime, currentTime);
            }
        } catch (err) {
            console.error(`Error touching file ${filename}:`, err);
            throw err;
        }
    }

    /**
     * Formats a date to the locale string format used by the target website
     * @param {Date} date - The date to format
     * @returns {string} - Formatted date string
     */
    static formatDateForScraping(date) {
        return date.toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'long',
            day: 'numeric',
        });
    }

    /**
     * Extracts version information from product title
     * @param {string} title - Product title containing version
     * @returns {object} - Object containing version and cleaned title
     */
    static extractVersionFromTitle(title) {
        const result = {
            version: '',
            cleanTitle: title,
            hasVersion: false
        };

        if (!/\d/.test(title)) {
            return result;
        }

        try {
            const versionMatch = title.match(/v\d+(\.\d+){0,3}/);
            if (versionMatch) {
                const version = versionMatch[0];
                result.version = version.replace('v', '');
                result.cleanTitle = title.replace(/ v\d+(\.\d+){0,3}/, '');
                result.hasVersion = true;
            }
        } catch (error) {
            console.error('Error extracting version from title:', error);
        }

        return result;
    }

    /**
     * Extracts slug and product ID from URL
     * @param {string} url - The product URL
     * @returns {object} - Object containing slug and productId
     */
    static extractUrlInfo(url) {
        const result = {
            slug: '',
            productId: ''
        };

        try {
            const parsedUrl = new URL(url);
            const cleanUrl = url.replace(/^\/|\/$/g, '');
            const parts = cleanUrl.split('/');
            
            result.slug = parts[parts.length - 1];
            result.productId = parsedUrl.searchParams.get("product_id") || '';
        } catch (error) {
            console.error('Error extracting URL info:', error);
        }

        return result;
    }

    /**
     * Generates filename from slug
     * @param {string} slug - The product slug
     * @returns {string} - Generated filename
     */
    static generateFilename(slug) {
        let modifiedSlug = slug.replace(/-download$/, "");
        modifiedSlug = modifiedSlug.replace(/download-/, "");
        return `${modifiedSlug}.zip`;
    }

    /**
     * Formats cookies for HTTP headers
     * @param {Array} cookies - Array of cookie objects from Puppeteer
     * @returns {string} - Formatted cookie string
     */
    static formatCookiesForRequest(cookies) {
        return cookies.map(cookie => `${cookie.name}=${cookie.value}`).join('; ');
    }

    /**
     * Cleans up files in a directory
     * @param {string} directoryPath - Path to the directory to clean
     */
    static async cleanupFiles(directoryPath) {
        try {
            if (!fs.existsSync(directoryPath)) {
                return;
            }

            const files = await fs.promises.readdir(directoryPath);
            const deletePromises = files.map(file => 
                fs.promises.unlink(path.join(directoryPath, file))
            );
            
            await Promise.all(deletePromises);
            console.log(`Cleaned up ${files.length} files from ${directoryPath}`);
        } catch (error) {
            console.error(`Error cleaning up files in ${directoryPath}:`, error);
            throw error;
        }
    }

    /**
     * Safely creates a directory if it doesn't exist
     * @param {string} dirPath - Directory path to create
     */
    static ensureDirectoryExists(dirPath) {
        if (!fs.existsSync(dirPath)) {
            fs.mkdirSync(dirPath, { recursive: true });
        }
    }

    /**
     * Delays execution for a specified amount of time
     * @param {number} ms - Milliseconds to delay
     * @returns {Promise} - Promise that resolves after the delay
     */
    static delay(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    /**
     * Validates that required fields exist in an object
     * @param {object} obj - Object to validate
     * @param {Array<string>} requiredFields - Array of required field names
     * @throws {Error} - If any required fields are missing
     */
    static validateRequiredFields(obj, requiredFields) {
        const missing = requiredFields.filter(field => 
            obj[field] === undefined || obj[field] === null || obj[field] === ''
        );
        
        if (missing.length > 0) {
            throw new Error(`Missing required fields: ${missing.join(', ')}`);
        }
    }
}

module.exports = Utils; 