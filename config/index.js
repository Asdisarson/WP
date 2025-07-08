require('dotenv').config();

class Config {
    constructor() {
        this.validateRequiredEnvVars();
        this.initializeConfig();
    }

    validateRequiredEnvVars() {
        const required = ['USERNAME', 'PASSWORD', 'DOWNLOAD_URL'];
        const missing = required.filter(key => !process.env[key]);
        
        if (missing.length > 0) {
            throw new Error(`Missing required environment variables: ${missing.join(', ')}`);
        }
    }

    initializeConfig() {
        this.auth = {
            username: process.env.USERNAME,
            password: process.env.PASSWORD
        };

        this.app = {
            port: this.normalizePort(process.env.PORT || '3000'),
            downloadUrl: process.env.DOWNLOAD_URL
        };

        this.scraping = {
            baseUrl: 'https://www.realgpl.com',
            loginUrl: 'https://www.realgpl.com/my-account/',
            changelogUrl: 'https://www.realgpl.com/changelog/?99936_results_per_page=500',
            userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_0) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/78.0.3904.97 Safari/537.36'
        };

        this.puppeteer = {
            headless: true,
            executablePath: process.env.CHROMIUM_PATH || '/usr/bin/chromium',
            args: [
                '--no-sandbox',
                '--disable-setuid-sandbox',
                '--disable-gpu',
                '--headless'
            ]
        };

        this.directories = {
            downloads: './public/downloads/',
            public: './public/',
            func: './func/'
        };

        this.files = {
            database: './files.json',
            tempDatabase: './func/files.json',
            dataCsv: './public/data.csv',
            errorCsv: './public/error.csv'
        };

        this.timeouts = {
            fileCleanup: 3600000, // 1 hour in milliseconds
            browserTimeout: 0 // No timeout
        };
    }

    normalizePort(val) {
        const port = parseInt(val, 10);
        
        if (isNaN(port)) {
            return val; // named pipe
        }
        
        if (port >= 0) {
            return port; // port number
        }
        
        return false;
    }

    get(path) {
        return path.split('.').reduce((obj, key) => obj && obj[key], this);
    }
}

module.exports = new Config(); 