const fs = require('fs');
const path = require('path');
const Utils = require('./utils');
const config = require('../config');

class ErrorHandler {
    constructor() {
        this.logDirectory = './logs';
        this.initializeLogging();
    }

    /**
     * Initializes logging directory and sets up process error handlers
     */
    initializeLogging() {
        // Ensure logs directory exists
        Utils.ensureDirectoryExists(this.logDirectory);

        // Set up global error handlers
        this.setupGlobalErrorHandlers();
    }

    /**
     * Sets up global error handlers for uncaught exceptions and unhandled rejections
     */
    setupGlobalErrorHandlers() {
        process.on('uncaughtException', (error) => {
            this.logError('UNCAUGHT_EXCEPTION', error, { fatal: true });
            console.error('Uncaught Exception:', error);
            process.exit(1);
        });

        process.on('unhandledRejection', (reason, promise) => {
            this.logError('UNHANDLED_REJECTION', reason, { 
                promise: promise.toString(),
                fatal: false 
            });
            console.error('Unhandled Rejection at:', promise, 'reason:', reason);
        });

        console.log('Global error handlers initialized');
    }

    /**
     * Logs an error with context information
     * @param {string} type - Error type/category
     * @param {Error|string} error - The error to log
     * @param {Object} context - Additional context information
     */
    logError(type, error, context = {}) {
        const timestamp = new Date().toISOString();
        const errorData = {
            timestamp,
            type,
            message: error.message || error,
            stack: error.stack || null,
            context
        };

        // Log to console
        console.error(`[${timestamp}] ${type}: ${errorData.message}`);
        if (error.stack) {
            console.error(error.stack);
        }

        // Log to file
        this._writeToLogFile('error', errorData);
    }

    /**
     * Logs general information
     * @param {string} message - Information message
     * @param {Object} context - Additional context
     */
    logInfo(message, context = {}) {
        const timestamp = new Date().toISOString();
        const logData = {
            timestamp,
            level: 'INFO',
            message,
            context
        };

        console.log(`[${timestamp}] INFO: ${message}`);
        this._writeToLogFile('info', logData);
    }

    /**
     * Logs debug information (only in development)
     * @param {string} message - Debug message
     * @param {Object} context - Additional context
     */
    logDebug(message, context = {}) {
        if (process.env.NODE_ENV === 'development') {
            const timestamp = new Date().toISOString();
            console.log(`[${timestamp}] DEBUG: ${message}`);
            
            this._writeToLogFile('debug', {
                timestamp,
                level: 'DEBUG',
                message,
                context
            });
        }
    }

    /**
     * Creates an error response object for API endpoints
     * @param {string} message - Error message
     * @param {number} statusCode - HTTP status code
     * @param {Object} details - Additional error details
     * @returns {Object} - Standardized error response
     */
    createErrorResponse(message, statusCode = 500, details = {}) {
        return {
            success: false,
            error: {
                message,
                statusCode,
                timestamp: new Date().toISOString(),
                ...details
            }
        };
    }

    /**
     * Creates a success response object for API endpoints
     * @param {any} data - Response data
     * @param {string} message - Success message
     * @returns {Object} - Standardized success response
     */
    createSuccessResponse(data, message = 'Operation completed successfully') {
        return {
            success: true,
            message,
            data,
            timestamp: new Date().toISOString()
        };
    }

    /**
     * Express middleware for handling errors
     * @param {Error} error - The error object
     * @param {Object} req - Express request object
     * @param {Object} res - Express response object
     * @param {Function} next - Express next function
     */
    expressErrorHandler(error, req, res, next) {
        const correlationId = req.headers['x-correlation-id'] || this._generateCorrelationId();
        
        this.logError('EXPRESS_ERROR', error, {
            correlationId,
            method: req.method,
            url: req.url,
            userAgent: req.get('User-Agent'),
            ip: req.ip
        });

        // Determine status code
        let statusCode = 500;
        if (error.statusCode) {
            statusCode = error.statusCode;
        } else if (error.name === 'ValidationError') {
            statusCode = 400;
        } else if (error.name === 'UnauthorizedError') {
            statusCode = 401;
        }

        // Send error response
        res.status(statusCode).json(this.createErrorResponse(
            error.message || 'Internal server error',
            statusCode,
            { correlationId }
        ));
    }

    /**
     * Express middleware for logging requests
     * @param {Object} req - Express request object
     * @param {Object} res - Express response object
     * @param {Function} next - Express next function
     */
    requestLogger(req, res, next) {
        const correlationId = req.headers['x-correlation-id'] || this._generateCorrelationId();
        req.correlationId = correlationId;

        const startTime = Date.now();
        
        // Log request
        this.logInfo('HTTP Request', {
            correlationId,
            method: req.method,
            url: req.url,
            userAgent: req.get('User-Agent'),
            ip: req.ip
        });

        // Override res.end to log response
        const originalEnd = res.end;
        res.end = function(...args) {
            const duration = Date.now() - startTime;
            
            // Log response
            this.logInfo('HTTP Response', {
                correlationId,
                method: req.method,
                url: req.url,
                statusCode: res.statusCode,
                duration: `${duration}ms`
            });

            originalEnd.apply(res, args);
        }.bind(this);

        next();
    }

    /**
     * Handles async route errors
     * @param {Function} fn - Async route handler function
     * @returns {Function} - Wrapped function with error handling
     */
    asyncHandler(fn) {
        return (req, res, next) => {
            Promise.resolve(fn(req, res, next)).catch(next);
        };
    }

    /**
     * Validates required environment variables
     * @param {Array<string>} requiredVars - Array of required variable names
     * @throws {Error} - If any required variables are missing
     */
    validateEnvironment(requiredVars) {
        const missing = requiredVars.filter(varName => !process.env[varName]);
        
        if (missing.length > 0) {
            const error = new Error(`Missing required environment variables: ${missing.join(', ')}`);
            this.logError('ENVIRONMENT_ERROR', error);
            throw error;
        }
    }

    /**
     * Writes log data to file
     * @param {string} level - Log level (error, info, debug)
     * @param {Object} data - Data to log
     */
    _writeToLogFile(level, data) {
        try {
            const date = new Date().toISOString().split('T')[0]; // YYYY-MM-DD
            const filename = `${level}-${date}.log`;
            const filepath = path.join(this.logDirectory, filename);
            
            const logLine = JSON.stringify(data) + '\n';
            fs.appendFileSync(filepath, logLine);
        } catch (error) {
            console.error('Failed to write to log file:', error);
        }
    }

    /**
     * Generates a unique correlation ID for request tracking
     * @returns {string} - Unique correlation ID
     */
    _generateCorrelationId() {
        return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    }

    /**
     * Gets recent error logs
     * @param {number} limit - Number of recent errors to return
     * @returns {Array} - Array of recent error logs
     */
    getRecentErrors(limit = 50) {
        try {
            const today = new Date().toISOString().split('T')[0];
            const errorLogPath = path.join(this.logDirectory, `error-${today}.log`);
            
            if (!fs.existsSync(errorLogPath)) {
                return [];
            }

            const logContent = fs.readFileSync(errorLogPath, 'utf8');
            const lines = logContent.trim().split('\n').filter(line => line);
            
            return lines.slice(-limit).map(line => {
                try {
                    return JSON.parse(line);
                } catch {
                    return { message: line, timestamp: new Date().toISOString() };
                }
            });
        } catch (error) {
            console.error('Failed to read error logs:', error);
            return [];
        }
    }

    /**
     * Cleans up old log files
     * @param {number} daysToKeep - Number of days to keep logs
     */
    cleanupOldLogs(daysToKeep = 30) {
        try {
            const cutoffDate = new Date();
            cutoffDate.setDate(cutoffDate.getDate() - daysToKeep);
            
            const files = fs.readdirSync(this.logDirectory);
            
            for (const file of files) {
                if (file.endsWith('.log')) {
                    const filePath = path.join(this.logDirectory, file);
                    const stats = fs.statSync(filePath);
                    
                    if (stats.mtime < cutoffDate) {
                        fs.unlinkSync(filePath);
                        console.log(`Deleted old log file: ${file}`);
                    }
                }
            }
        } catch (error) {
            console.error('Failed to cleanup old logs:', error);
        }
    }
}

module.exports = new ErrorHandler(); 