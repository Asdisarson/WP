# Web Scraping Application

A robust Node.js web scraping application that automates the process of downloading files from a changelog website. The application features a clean architecture with proper error handling, logging, and validation.

## Features

- **Automated Web Scraping**: Uses Puppeteer to scrape changelog entries for specific dates
- **File Downloads**: Automatically downloads and organizes files based on scraped data
- **RESTful API**: Clean API endpoints for triggering tasks and monitoring status
- **Error Handling**: Comprehensive error handling and logging system
- **Input Validation**: Robust validation for all API inputs
- **Rate Limiting**: Built-in rate limiting to prevent abuse
- **Health Monitoring**: Health check and status endpoints
- **CSV Export**: Automatic conversion of data to CSV format
- **File Management**: Automatic cleanup of downloaded files
- **Docker Support**: Ready for containerized deployment

## Architecture

The application follows a service-oriented architecture with clear separation of concerns:

```
├── config/                 # Configuration management
├── services/              # Core business logic services
│   ├── browserService.js  # Puppeteer browser management
│   ├── scraperService.js  # Web scraping logic
│   ├── downloadService.js # File download management
│   ├── scheduledTaskService.js # Task orchestration
│   ├── errorHandler.js    # Error handling and logging
│   └── utils.js          # Shared utilities
├── middleware/           # Express middleware
│   └── validation.js     # Input validation middleware
├── func/                 # Legacy utility functions
├── public/              # Static files and downloads
├── logs/                # Application logs
└── app.js              # Express application setup
```

## Installation

1. Clone the repository:
```bash
git clone <repository-url>
cd <project-directory>
```

2. Install dependencies:
```bash
npm install
```

3. Set up environment variables:
```bash
cp .env.example .env
# Edit .env with your configuration
```

### Required Environment Variables

- `USERNAME`: Username for the target website
- `PASSWORD`: Password for the target website  
- `DOWNLOAD_URL`: Base URL for file downloads
- `CHROMIUM_PATH`: Path to Chromium binary (optional, defaults to `/usr/bin/chromium`)
- `PORT`: Server port (optional, defaults to 3000)
- `NODE_ENV`: Environment (development/production)

## Usage

### Starting the Application

```bash
# Development
npm run test

# Production
npm start
```

### API Endpoints

#### GET /refresh
Executes the scraping and download task for a specific date.

**Query Parameters:**
- `date` (optional): ISO 8601 date string (defaults to current date)

**Example:**
```bash
curl "http://localhost:3000/refresh?date=2024-01-15"
```

**Response:**
```json
{
  "success": true,
  "message": "Task completed successfully. 5 files downloaded.",
  "data": {
    "files": [...],
    "stats": {
      "successful": 5,
      "failed": 0,
      "total": 5
    }
  },
  "timestamp": "2024-01-15T10:30:00.000Z"
}
```

#### GET /lastUpdate
Retrieves the last saved results from the database.

**Example:**
```bash
curl "http://localhost:3000/lastUpdate"
```

#### GET /health
Health check endpoint providing system status.

**Example:**
```bash
curl "http://localhost:3000/health"
```

#### GET /status
Returns the current status of the task service.

**Example:**
```bash
curl "http://localhost:3000/status"
```

#### POST /cancel
Cancels any currently running task.

**Example:**
```bash
curl -X POST "http://localhost:3000/cancel"
```

#### GET /logs/errors
Retrieves recent error logs for debugging.

**Query Parameters:**
- `limit` (optional): Number of errors to return (max 1000, default 50)

**Example:**
```bash
curl "http://localhost:3000/logs/errors?limit=100"
```

## Configuration

The application uses a centralized configuration system located in `config/index.js`. Key configuration sections include:

- **Authentication**: Website login credentials
- **Scraping**: Target URLs and browser settings
- **Downloads**: File storage paths and cleanup settings
- **Server**: Port and application settings
- **Timeouts**: Various timeout configurations

## Error Handling

The application implements comprehensive error handling:

- **Global Error Handlers**: Catches uncaught exceptions and unhandled rejections
- **Request Logging**: Logs all HTTP requests and responses with correlation IDs
- **File Logging**: Structured logging to files with daily rotation
- **Error Responses**: Standardized error response format for APIs

## Validation

Input validation is handled by middleware that validates:

- **Date Formats**: Ensures valid ISO 8601 date strings
- **Rate Limiting**: Prevents abuse with configurable limits
- **Content Types**: Validates request content types
- **Body Size**: Limits request body size
- **Required Fields**: Ensures required parameters are present

## File Management

- Downloaded files are stored in `public/downloads/`
- Files are automatically cleaned up after 1 hour (configurable)
- CSV exports are generated in the `public/` directory
- All file operations include proper error handling

## Logging

The application maintains detailed logs:

- **Error Logs**: `logs/error-YYYY-MM-DD.log`
- **Info Logs**: `logs/info-YYYY-MM-DD.log`
- **Debug Logs**: `logs/debug-YYYY-MM-DD.log` (development only)

Log files are automatically rotated and cleaned up after 30 days.

## Docker Support

The application includes Docker configuration:

```bash
# Build the image
docker build -t web-scraper .

# Run the container
docker run -p 3000:3000 \
  -e USERNAME=your_username \
  -e PASSWORD=your_password \
  -e DOWNLOAD_URL=your_download_url \
  web-scraper
```

## Development

### Project Structure

The refactored codebase follows modern Node.js best practices:

- **Service Layer**: Business logic separated into focused services
- **Middleware**: Reusable middleware for validation and error handling
- **Configuration**: Centralized configuration management
- **Error Handling**: Comprehensive error handling strategy
- **Validation**: Input validation and sanitization
- **Logging**: Structured logging with correlation IDs

### Adding New Features

1. **New Services**: Add to `services/` directory
2. **New Middleware**: Add to `middleware/` directory
3. **New Routes**: Add to `app.js` with proper validation
4. **Configuration**: Update `config/index.js` as needed

### Testing

The application includes comprehensive error handling and validation, but additional tests can be added:

```bash
# Add test framework
npm install --save-dev jest supertest

# Run tests
npm test
```

## Troubleshooting

### Common Issues

1. **Browser Launch Fails**: 
   - Check Chromium installation
   - Verify `CHROMIUM_PATH` environment variable
   - Ensure proper permissions

2. **Login Fails**:
   - Verify `USERNAME` and `PASSWORD` environment variables
   - Check if the target website has changed its login form

3. **Downloads Fail**:
   - Check network connectivity
   - Verify `DOWNLOAD_URL` configuration
   - Check file system permissions

4. **Rate Limiting**:
   - Default rate limit is 200 requests per 15 minutes
   - Configure via `ValidationMiddleware.rateLimit()` in `app.js`

### Debug Mode

Enable debug mode by setting `NODE_ENV=development` to get detailed logging.

### Log Analysis

Check the logs directory for detailed error information:

```bash
# View recent errors
tail -f logs/error-$(date +%Y-%m-%d).log

# View application info
tail -f logs/info-$(date +%Y-%m-%d).log
```

## Security Considerations

- Input validation and sanitization prevent basic injection attacks
- Rate limiting prevents abuse
- Error responses don't expose sensitive information
- Credentials are handled securely through environment variables
- File downloads are validated and cleaned up automatically

## Performance

- Browser instances are properly managed and cleaned up
- Downloaded files are automatically cleaned up to prevent disk space issues
- Rate limiting prevents server overload
- Efficient memory usage with streaming downloads

## License

[Add your license information here]

## Contributing

[Add contributing guidelines here]

## Support

[Add support contact information here] 