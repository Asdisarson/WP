const errorHandler = require('../services/errorHandler');

/**
 * Validation middleware for API endpoints
 */
class ValidationMiddleware {
    /**
     * Validates date query parameter
     * @param {Object} req - Express request object
     * @param {Object} res - Express response object
     * @param {Function} next - Express next function
     */
    static validateDateQuery(req, res, next) {
        if (req.query.date) {
            const date = new Date(req.query.date);
            
            if (isNaN(date)) {
                return res.status(400).json(
                    errorHandler.createErrorResponse(
                        'Invalid date format. Please use ISO 8601 format (YYYY-MM-DD or YYYY-MM-DDTHH:mm:ss.sssZ)',
                        400,
                        { 
                            providedDate: req.query.date,
                            expectedFormat: 'ISO 8601'
                        }
                    )
                );
            }

            // Check if date is not too far in the past (1 year)
            const maxPastDate = new Date();
            maxPastDate.setFullYear(maxPastDate.getFullYear() - 1);
            
            if (date < maxPastDate) {
                return res.status(400).json(
                    errorHandler.createErrorResponse(
                        'Date cannot be more than 1 year ago',
                        400,
                        { 
                            providedDate: req.query.date,
                            maxPastDate: maxPastDate.toISOString()
                        }
                    )
                );
            }

            // Check if date is not in the future (allow today and yesterday)
            const maxFutureDate = new Date();
            maxFutureDate.setDate(maxFutureDate.getDate() + 1);
            
            if (date > maxFutureDate) {
                return res.status(400).json(
                    errorHandler.createErrorResponse(
                        'Date cannot be in the future',
                        400,
                        { 
                            providedDate: req.query.date,
                            maxFutureDate: maxFutureDate.toISOString()
                        }
                    )
                );
            }

            // Attach validated date to request
            req.validatedDate = date;
        }

        next();
    }

    /**
     * Validates limit query parameter for pagination
     * @param {Object} req - Express request object
     * @param {Object} res - Express response object
     * @param {Function} next - Express next function
     */
    static validateLimitQuery(req, res, next) {
        if (req.query.limit) {
            const limit = parseInt(req.query.limit, 10);
            
            if (isNaN(limit) || limit < 1) {
                return res.status(400).json(
                    errorHandler.createErrorResponse(
                        'Limit must be a positive integer',
                        400,
                        { 
                            providedLimit: req.query.limit,
                            expectedType: 'positive integer'
                        }
                    )
                );
            }

            if (limit > 1000) {
                return res.status(400).json(
                    errorHandler.createErrorResponse(
                        'Limit cannot exceed 1000',
                        400,
                        { 
                            providedLimit: req.query.limit,
                            maxLimit: 1000
                        }
                    )
                );
            }

            // Attach validated limit to request
            req.validatedLimit = limit;
        }

        next();
    }

    /**
     * Validates request body for specific content types
     * @param {Array<string>} allowedContentTypes - Array of allowed content types
     * @returns {Function} - Express middleware function
     */
    static validateContentType(allowedContentTypes = ['application/json']) {
        return (req, res, next) => {
            if (req.method === 'POST' || req.method === 'PUT' || req.method === 'PATCH') {
                const contentType = req.get('Content-Type');
                
                if (!contentType) {
                    return res.status(400).json(
                        errorHandler.createErrorResponse(
                            'Content-Type header is required',
                            400,
                            { 
                                allowedContentTypes,
                                receivedContentType: null
                            }
                        )
                    );
                }

                const isAllowed = allowedContentTypes.some(allowed => 
                    contentType.toLowerCase().includes(allowed.toLowerCase())
                );

                if (!isAllowed) {
                    return res.status(415).json(
                        errorHandler.createErrorResponse(
                            'Unsupported Media Type',
                            415,
                            { 
                                allowedContentTypes,
                                receivedContentType: contentType
                            }
                        )
                    );
                }
            }

            next();
        };
    }

    /**
     * Validates request body size
     * @param {number} maxSizeBytes - Maximum allowed size in bytes
     * @returns {Function} - Express middleware function
     */
    static validateBodySize(maxSizeBytes = 10 * 1024 * 1024) { // 10MB default
        return (req, res, next) => {
            const contentLength = req.get('Content-Length');
            
            if (contentLength && parseInt(contentLength) > maxSizeBytes) {
                return res.status(413).json(
                    errorHandler.createErrorResponse(
                        'Request entity too large',
                        413,
                        { 
                            maxSizeBytes,
                            receivedSizeBytes: parseInt(contentLength),
                            maxSizeMB: Math.round(maxSizeBytes / (1024 * 1024) * 100) / 100
                        }
                    )
                );
            }

            next();
        };
    }

    /**
     * Validates required query parameters
     * @param {Array<string>} requiredParams - Array of required parameter names
     * @returns {Function} - Express middleware function
     */
    static validateRequiredQuery(requiredParams) {
        return (req, res, next) => {
            const missing = requiredParams.filter(param => 
                !req.query.hasOwnProperty(param) || 
                req.query[param] === '' || 
                req.query[param] === null || 
                req.query[param] === undefined
            );

            if (missing.length > 0) {
                return res.status(400).json(
                    errorHandler.createErrorResponse(
                        'Missing required query parameters',
                        400,
                        { 
                            missingParameters: missing,
                            requiredParameters: requiredParams
                        }
                    )
                );
            }

            next();
        };
    }

    /**
     * Validates required body fields
     * @param {Array<string>} requiredFields - Array of required field names
     * @returns {Function} - Express middleware function
     */
    static validateRequiredBody(requiredFields) {
        return (req, res, next) => {
            if (!req.body || typeof req.body !== 'object') {
                return res.status(400).json(
                    errorHandler.createErrorResponse(
                        'Request body is required and must be a valid JSON object',
                        400,
                        { requiredFields }
                    )
                );
            }

            const missing = requiredFields.filter(field => 
                !req.body.hasOwnProperty(field) || 
                req.body[field] === '' || 
                req.body[field] === null || 
                req.body[field] === undefined
            );

            if (missing.length > 0) {
                return res.status(400).json(
                    errorHandler.createErrorResponse(
                        'Missing required body fields',
                        400,
                        { 
                            missingFields: missing,
                            requiredFields
                        }
                    )
                );
            }

            next();
        };
    }

    /**
     * Sanitizes string inputs to prevent basic injection attacks
     * @param {Array<string>} fieldsToSanitize - Array of field names to sanitize
     * @returns {Function} - Express middleware function
     */
    static sanitizeInputs(fieldsToSanitize = []) {
        return (req, res, next) => {
            // Sanitize query parameters
            fieldsToSanitize.forEach(field => {
                if (req.query[field]) {
                    req.query[field] = this._sanitizeString(req.query[field]);
                }
            });

            // Sanitize body fields
            if (req.body && typeof req.body === 'object') {
                fieldsToSanitize.forEach(field => {
                    if (req.body[field]) {
                        req.body[field] = this._sanitizeString(req.body[field]);
                    }
                });
            }

            next();
        };
    }

    /**
     * Rate limiting based on IP address
     * @param {number} maxRequests - Maximum requests per window
     * @param {number} windowMs - Time window in milliseconds
     * @returns {Function} - Express middleware function
     */
    static rateLimit(maxRequests = 100, windowMs = 15 * 60 * 1000) { // 100 requests per 15 minutes
        const requests = new Map();

        return (req, res, next) => {
            const ip = req.ip || req.connection.remoteAddress;
            const now = Date.now();
            
            // Clean up old entries
            for (const [key, data] of requests.entries()) {
                if (now - data.firstRequest > windowMs) {
                    requests.delete(key);
                }
            }

            // Check current IP
            const ipData = requests.get(ip) || { count: 0, firstRequest: now };
            
            if (now - ipData.firstRequest > windowMs) {
                // Reset window
                ipData.count = 1;
                ipData.firstRequest = now;
            } else {
                ipData.count++;
            }

            requests.set(ip, ipData);

            if (ipData.count > maxRequests) {
                return res.status(429).json(
                    errorHandler.createErrorResponse(
                        'Too many requests',
                        429,
                        { 
                            maxRequests,
                            windowMs,
                            retryAfter: Math.ceil((windowMs - (now - ipData.firstRequest)) / 1000)
                        }
                    )
                );
            }

            // Add rate limit headers
            res.set({
                'X-RateLimit-Limit': maxRequests,
                'X-RateLimit-Remaining': Math.max(0, maxRequests - ipData.count),
                'X-RateLimit-Reset': new Date(ipData.firstRequest + windowMs).toISOString()
            });

            next();
        };
    }

    /**
     * Basic string sanitization
     * @param {string} str - String to sanitize
     * @returns {string} - Sanitized string
     */
    static _sanitizeString(str) {
        if (typeof str !== 'string') return str;
        
        return str
            .replace(/[<>]/g, '') // Remove < and > to prevent basic XSS
            .replace(/['";]/g, '') // Remove quotes and semicolons
            .trim();
    }
}

module.exports = ValidationMiddleware; 