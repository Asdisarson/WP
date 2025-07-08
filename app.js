const express = require('express');
const path = require('path');
const cookieParser = require('cookie-parser');
const morgan = require('morgan');

// Import services
const config = require('./config');
const errorHandler = require('./services/errorHandler');
const ScheduledTaskService = require('./services/scheduledTaskService');
const ValidationMiddleware = require('./middleware/validation');

// Initialize Express app
const app = express();

// Initialize services
const taskService = new ScheduledTaskService();

// Middleware setup
app.use(morgan('combined'));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: false, limit: '10mb' }));
app.use(cookieParser());

// Custom middleware
app.use(errorHandler.requestLogger.bind(errorHandler));

// Global validation middleware
app.use(ValidationMiddleware.validateContentType());
app.use(ValidationMiddleware.validateBodySize());
app.use(ValidationMiddleware.rateLimit(200, 15 * 60 * 1000)); // 200 requests per 15 minutes

// Static files
app.use(express.static(path.join(__dirname, 'public')));

// API Routes
app.get('/refresh', 
    ValidationMiddleware.validateDateQuery,
    errorHandler.asyncHandler(async (req, res) => {
    try {
        // Use validated date from middleware or default to current date
        const targetDate = req.validatedDate || new Date();

        errorHandler.logInfo('Refresh task started', { 
            date: targetDate.toISOString(),
            correlationId: req.correlationId 
        });

        // Execute the task
        const results = await taskService.executeTask(targetDate);

        // Schedule cleanup
        const cleanupMs = config.timeouts.fileCleanup;
        setTimeout(async () => {
            try {
                const Utils = require('./services/utils');
                await Utils.cleanupFiles(config.directories.downloads);
                errorHandler.logInfo('Scheduled file cleanup completed');
            } catch (error) {
                errorHandler.logError('CLEANUP_ERROR', error);
            }
        }, cleanupMs);

        res.status(200).json(
            errorHandler.createSuccessResponse(
                {
                    files: results.successful,
                    stats: results.stats,
                    failed: results.failed.length > 0 ? results.failed : undefined
                },
                results.message
            )
        );

    } catch (error) {
        errorHandler.logError('REFRESH_TASK_ERROR', error, {
            correlationId: req.correlationId
        });
        
        res.status(503).json(
            errorHandler.createErrorResponse(
                'Task execution failed. Please try again later.',
                503,
                { correlationId: req.correlationId }
            )
        );
    }
}));

app.get('/lastUpdate', errorHandler.asyncHandler(async (req, res) => {
    try {
        const lastResults = taskService.getLastResults();
        
        res.status(200).json(
            errorHandler.createSuccessResponse(
                lastResults,
                'Last update data retrieved successfully'
            )
        );
    } catch (error) {
        errorHandler.logError('LAST_UPDATE_ERROR', error, {
            correlationId: req.correlationId
        });
        
        res.status(500).json(
            errorHandler.createErrorResponse(
                'Failed to retrieve last update data',
                500,
                { correlationId: req.correlationId }
            )
        );
    }
}));

// Health check endpoint
app.get('/health', (req, res) => {
    const healthStatus = {
        status: 'healthy',
        timestamp: new Date().toISOString(),
        uptime: process.uptime(),
        memory: process.memoryUsage(),
        version: process.version,
        taskService: taskService.getStatus()
    };

    res.status(200).json(
        errorHandler.createSuccessResponse(healthStatus, 'Service is healthy')
    );
});

// Status endpoint for task monitoring
app.get('/status', (req, res) => {
    const status = taskService.getStatus();
    
    res.status(200).json(
        errorHandler.createSuccessResponse(status, 'Task status retrieved')
    );
});

// Cancel running task endpoint
app.post('/cancel', errorHandler.asyncHandler(async (req, res) => {
    try {
        await taskService.cancelTask();
        
        res.status(200).json(
            errorHandler.createSuccessResponse(
                null,
                'Task cancellation requested'
            )
        );
    } catch (error) {
        errorHandler.logError('CANCEL_TASK_ERROR', error, {
            correlationId: req.correlationId
        });
        
        res.status(500).json(
            errorHandler.createErrorResponse(
                'Failed to cancel task',
                500,
                { correlationId: req.correlationId }
            )
        );
    }
}));

// Error logs endpoint (for debugging)
app.get('/logs/errors', 
    ValidationMiddleware.validateLimitQuery,
    (req, res) => {
    try {
        const limit = req.validatedLimit || 50;
        const errors = errorHandler.getRecentErrors(limit);
        
        res.status(200).json(
            errorHandler.createSuccessResponse(
                errors,
                `Retrieved ${errors.length} recent errors`
            )
        );
    } catch (error) {
        errorHandler.logError('GET_LOGS_ERROR', error, {
            correlationId: req.correlationId
        });
        
        res.status(500).json(
            errorHandler.createErrorResponse(
                'Failed to retrieve error logs',
                500,
                { correlationId: req.correlationId }
            )
        );
    }
});

// 404 handler
app.use((req, res) => {
    res.status(404).json(
        errorHandler.createErrorResponse(
            `Route ${req.method} ${req.path} not found`,
            404
        )
    );
});

// Global error handler (must be last)
app.use(errorHandler.expressErrorHandler.bind(errorHandler));

// Graceful shutdown handling
process.on('SIGTERM', async () => {
    errorHandler.logInfo('SIGTERM received, starting graceful shutdown');
    
    try {
        await taskService.cancelTask();
        errorHandler.logInfo('Graceful shutdown completed');
        process.exit(0);
    } catch (error) {
        errorHandler.logError('SHUTDOWN_ERROR', error);
        process.exit(1);
    }
});

process.on('SIGINT', async () => {
    errorHandler.logInfo('SIGINT received, starting graceful shutdown');
    
    try {
        await taskService.cancelTask();
        errorHandler.logInfo('Graceful shutdown completed');
        process.exit(0);
    } catch (error) {
        errorHandler.logError('SHUTDOWN_ERROR', error);
        process.exit(1);
    }
});

// Log startup information
errorHandler.logInfo('Application starting', {
    nodeVersion: process.version,
    port: config.app.port,
    environment: process.env.NODE_ENV || 'development'
});

module.exports = app;
