require('dotenv').config();
const express = require('express');
const path = require('path');
const cookieParser = require('cookie-parser');
const logger = require('morgan');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const fs = require('fs');
const dbJson = require('simple-json-db');

// Import automation modules
const scheduledTask = require('./func/scheduledTask');
const scheduledTaskYesterday = require('./func/scheduledTaskYesterday');

// Initialize Express application
const app = express();

// Security middleware
app.use(helmet({
    contentSecurityPolicy: {
        directives: {
            defaultSrc: ["'self'"],
            styleSrc: ["'self'", "'unsafe-inline'"],
            scriptSrc: ["'self'"],
            imgSrc: ["'self'", "data:", "https:"],
        },
    },
    hsts: {
        maxAge: 31536000,
        includeSubDomains: true,
        preload: true
    }
}));

// Rate limiting
const limiter = rateLimit({
    windowMs: parseInt(process.env.RATE_LIMIT_WINDOW) || 15 * 60 * 1000, // 15 minutes
    max: parseInt(process.env.RATE_LIMIT_MAX) || 100, // limit each IP to 100 requests per windowMs
    message: {
        error: 'Too many requests from this IP, please try again later.',
        retryAfter: '15 minutes'
    },
    standardHeaders: true,
    legacyHeaders: false,
});

app.use('/refresh', limiter);

// Basic middleware
app.use(logger(process.env.NODE_ENV === 'production' ? 'combined' : 'dev'));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: false, limit: '10mb' }));
app.use(cookieParser());

// Static file serving with security headers
app.use(express.static(path.join(__dirname, 'public'), {
    setHeaders: (res, filePath) => {
        if (filePath.endsWith('.zip')) {
            res.setHeader('Content-Disposition', 'attachment');
        }
    }
}));

// Utility function for safe file cleanup
function executeAfterAnHour() {
    setTimeout(() => {
        const downloadsDir = path.join(__dirname, 'public', 'downloads');
        
        if (!fs.existsSync(downloadsDir)) {
            console.log('Downloads directory does not exist, skipping cleanup');
            return;
        }

        fs.readdir(downloadsDir, (err, files) => {
            if (err) {
                console.error('Error reading downloads directory:', err);
                return;
            }

            console.log(`Cleaning up ${files.length} files from downloads directory`);
            
            files.forEach(file => {
                const filePath = path.join(downloadsDir, file);
                fs.unlink(filePath, err => {
                    if (err && err.code !== 'ENOENT') {
                        console.error(`Error deleting file ${file}:`, err);
                    }
                });
            });
        });
    }, 3600000); // 1 hour
}

// Health check endpoint
app.get('/health', (req, res) => {
    const healthCheck = {
        status: 'OK',
        timestamp: new Date().toISOString(),
        uptime: process.uptime(),
        environment: process.env.NODE_ENV || 'development',
        memory: process.memoryUsage(),
        version: require('./package.json').version
    };

    try {
        // Check if downloads directory exists and is writable
        const downloadsDir = path.join(__dirname, 'public', 'downloads');
        if (!fs.existsSync(downloadsDir)) {
            fs.mkdirSync(downloadsDir, { recursive: true });
        }
        
        healthCheck.services = {
            filesystem: 'OK',
            downloads_dir: 'OK'
        };

        res.status(200).json(healthCheck);
    } catch (error) {
        healthCheck.status = 'ERROR';
        healthCheck.error = error.message;
        res.status(503).json(healthCheck);
    }
});

// Main refresh endpoint with enhanced error handling
app.get('/refresh', async (req, res) => {
    const startTime = Date.now();
    let date = new Date();
    
    // Validate and parse date parameter
    if (req.query.date) {
        const inputDate = new Date(req.query.date);
        if (isNaN(inputDate.getTime())) {
            return res.status(400).json({
                error: 'Invalid date format',
                message: 'Please use YYYY-MM-DD format',
                received: req.query.date
            });
        }
        date = inputDate;
    }

    console.log(`[${new Date().toISOString()}] Processing refresh request for date: ${date.toISOString()}`);

    try {
        const downloads = await scheduledTaskYesterday(date);
        const processingTime = Date.now() - startTime;

        executeAfterAnHour();

        res.status(200).json({
            success: true,
            message: 'Content processing completed successfully',
            data: {
                downloads: downloads,
                processedDate: date.toISOString(),
                processingTimeMs: processingTime,
                timestamp: new Date().toISOString()
            }
        });

    } catch (error) {
        const processingTime = Date.now() - startTime;
        
        console.error(`[${new Date().toISOString()}] Refresh operation failed:`, error);
        
        executeAfterAnHour();
        
        res.status(500).json({
            success: false,
            error: 'Processing failed',
            message: 'An error occurred while processing the request',
            data: {
                processedDate: date.toISOString(),
                processingTimeMs: processingTime,
                timestamp: new Date().toISOString()
            }
        });
    }
});

// Last update endpoint with error handling
app.get('/lastUpdate', async (req, res) => {
    try {
        const dbPath = path.join(__dirname, 'files.json');
        
        if (!fs.existsSync(dbPath)) {
            return res.status(404).json({
                error: 'No data available',
                message: 'No previous updates found'
            });
        }

        const db = new dbJson(dbPath);
        const data = db.JSON();

        res.status(200).json({
            success: true,
            data: data,
            timestamp: new Date().toISOString()
        });

    } catch (error) {
        console.error('Error retrieving last update:', error);
        res.status(500).json({
            success: false,
            error: 'Database error',
            message: 'Unable to retrieve last update'
        });
    }
});

// API documentation endpoint
app.get('/', (req, res) => {
    res.json({
        name: 'RealGPL Automation Suite',
        version: require('./package.json').version,
        description: 'Professional automation suite for GPL marketplace content management',
        endpoints: {
            'GET /': 'API documentation',
            'GET /health': 'System health check',
            'GET /refresh': 'Process content for today or specified date',
            'GET /refresh?date=YYYY-MM-DD': 'Process content for specific date',
            'GET /lastUpdate': 'Get latest processed data'
        },
        documentation: 'https://github.com/your-org/realgpl-automation-suite#readme'
    });
});

// 404 handler
app.use((req, res) => {
    res.status(404).json({
        error: 'Not Found',
        message: `The requested endpoint ${req.originalUrl} was not found`,
        availableEndpoints: ['/', '/health', '/refresh', '/lastUpdate']
    });
});

// Global error handler
app.use((err, req, res, next) => {
    console.error('Unhandled error:', err);
    
    // Don't expose error details in production
    const isDevelopment = process.env.NODE_ENV === 'development';
    
    res.status(err.status || 500).json({
        success: false,
        error: 'Internal Server Error',
        message: isDevelopment ? err.message : 'Something went wrong',
        ...(isDevelopment && { stack: err.stack })
    });
});

// Graceful shutdown handling
process.on('SIGTERM', () => {
    console.log('SIGTERM received, shutting down gracefully...');
    process.exit(0);
});

process.on('SIGINT', () => {
    console.log('SIGINT received, shutting down gracefully...');
    process.exit(0);
});

module.exports = app;
