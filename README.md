# 🚀 RealGPL Automation Suite

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Node.js](https://img.shields.io/badge/Node.js-18+-green.svg)](https://nodejs.org/)
[![Express.js](https://img.shields.io/badge/Express.js-4.19+-blue.svg)](https://expressjs.com/)
[![Puppeteer](https://img.shields.io/badge/Puppeteer-22+-red.svg)](https://pptr.dev/)

A professional automation suite for monitoring, downloading, and managing content from GPL marketplaces. Built with Node.js, Express, and Puppeteer for reliable, scalable operations.

## ✨ Features

- 🤖 **Intelligent Login Automation** - Handles dynamic math challenges and form variations
- 📅 **Flexible Scheduling** - Daily, historical, and custom date range processing
- 🔍 **Smart Content Detection** - Automated changelog monitoring and file extraction
- ⚡ **Parallel Downloads** - Efficient file management with retry mechanisms
- 🛡️ **Security First** - Rate limiting, input validation, and secure configurations
- 📊 **Comprehensive Logging** - Detailed operation tracking and error reporting
- 🐳 **Docker Ready** - Containerized deployment with production configurations
- 🔄 **Auto-Recovery** - Robust error handling and graceful failures
- 📈 **Performance Optimized** - Memory management and resource optimization

## 🏗️ Architecture

```
├── app.js                 # Express application entry point
├── bin/www               # Server configuration and startup
├── func/                 # Core automation modules
│   ├── scheduledTask.js         # Today's content processor
│   ├── scheduledTaskYesterday.js # Historical content processor
│   └── convertJsonToCsv.js      # Data transformation utilities
├── public/               # Static assets and downloads
├── scripts/              # Operational utilities
└── tests/               # Test suites
```

## 🚦 Quick Start

### Prerequisites

- **Node.js** 18+ and npm 8+
- **Chrome/Chromium** (for Puppeteer)
- **Valid account** on target GPL marketplace

### Installation

```bash
# Clone the repository
git clone https://github.com/your-org/realgpl-automation-suite.git
cd realgpl-automation-suite

# Install dependencies
npm install

# Setup environment
cp .env.example .env
# Edit .env with your credentials and configuration
```

### Environment Configuration

Create a `.env` file with the following variables:

```env
# Application Settings
NODE_ENV=production
PORT=3000
BASE_URL=https://www.realgpl.com

# Authentication (Required)
USERNAME=your_username_here
PASSWORD=your_password_here

# Download Configuration
DOWNLOAD_URL=/downloads
DOWNLOAD_TIMEOUT=120000
MAX_DOWNLOAD_ATTEMPTS=3

# Performance Settings
TIMEOUT=120000
MAX_PAGES=10
DEV_MAX_PAGES=5

# Optional: External Services
API_BASE_URL=https://your-api-endpoint.com
ALLOWED_HOSTNAME=your-domain.com
```

### Running the Application

```bash
# Development mode with hot reload
npm run dev

# Production mode
npm start

# Run with Docker
npm run docker:build
npm run docker:run
```

## 📋 API Endpoints

### Core Operations

| Endpoint | Method | Description | Parameters |
|----------|--------|-------------|------------|
| `/refresh` | GET | Process content for specific date | `date` (YYYY-MM-DD) |
| `/lastUpdate` | GET | Get latest processed data | - |
| `/health` | GET | System health check | - |

### Usage Examples

```bash
# Process today's content
curl "http://localhost:3000/refresh"

# Process specific date
curl "http://localhost:3000/refresh?date=2025-01-08"

# Get latest results
curl "http://localhost:3000/lastUpdate"

# Health check
curl "http://localhost:3000/health"
```

## 🛠️ Development

### Available Scripts

```bash
# Development
npm run dev          # Start with hot reload
npm run test         # Run test suite
npm run test:watch   # Run tests in watch mode

# Code Quality
npm run lint         # Check code style
npm run lint:fix     # Fix code style issues
npm run format       # Format code with Prettier
npm run validate     # Run all quality checks

# Operations
npm run clean        # Clean temporary files
npm run build        # Prepare for production
npm run deps:check   # Check for updates and vulnerabilities
```

### Testing

```bash
# Run all tests
npm test

# Run with coverage
npm run test -- --coverage

# Run integration tests
npm run test:integration

# Watch mode for development
npm run test:watch
```

## 🔒 Security Features

- **Environment Variable Protection** - Sensitive data in `.env` files
- **Rate Limiting** - Protection against abuse
- **Input Validation** - Sanitized user inputs
- **Helmet.js Integration** - Security headers
- **Error Sanitization** - No sensitive data in responses
- **CORS Configuration** - Controlled access origins

## 🐳 Docker Deployment

### Build and Run

```bash
# Build the Docker image
docker build -t realgpl-automation .

# Run the container
docker run -d \
  --name realgpl-app \
  -p 3000:3000 \
  --env-file .env \
  realgpl-automation
```

### Docker Compose

```yaml
version: '3.8'
services:
  app:
    build: .
    ports:
      - "3000:3000"
    env_file:
      - .env
    volumes:
      - ./public/downloads:/app/public/downloads
    restart: unless-stopped
```

## 📊 Monitoring & Logging

### Health Monitoring

```bash
# Check application health
npm run health:check

# View logs
docker logs realgpl-app

# Monitor resource usage
docker stats realgpl-app
```

### Log Levels

- **ERROR** - System failures and critical issues
- **WARN** - Important notices and recoverable errors  
- **INFO** - General operational information
- **DEBUG** - Detailed debugging information

## 🔧 Configuration

### Performance Tuning

```env
# Memory optimization
NODE_OPTIONS="--max-old-space-size=6144"

# Puppeteer settings
PUPPETEER_HEADLESS=true
PUPPETEER_TIMEOUT=30000

# Download optimization
PARALLEL_DOWNLOADS=3
RETRY_DELAY=5000
```

### Production Settings

```env
NODE_ENV=production
LOG_LEVEL=info
ENABLE_METRICS=true
RATE_LIMIT_WINDOW=900000
RATE_LIMIT_MAX=100
```

## 🚨 Troubleshooting

### Common Issues

**Login Failures**
```bash
# Check credentials
npm run schedule:test

# Verify connectivity
curl -I https://www.realgpl.com
```

**Memory Issues**
```bash
# Increase memory allocation
export NODE_OPTIONS="--max-old-space-size=8192"
npm start
```

**Download Errors**
```bash
# Check download directory permissions
ls -la public/downloads/

# Clear cache
npm run clean
```

### Debug Mode

```bash
# Enable verbose logging
DEBUG=* npm start

# Run single operation
node -e "require('./func/scheduledTask')()"
```

## 📈 Performance Optimization

- **Memory Management** - Optimized Node.js heap settings
- **Connection Pooling** - Efficient HTTP request handling
- **Parallel Processing** - Concurrent download operations
- **Caching Strategy** - Smart data caching and invalidation
- **Resource Cleanup** - Automatic temporary file management

## 🤝 Contributing

1. **Fork** the repository
2. **Create** a feature branch (`git checkout -b feature/amazing-feature`)
3. **Commit** your changes (`git commit -m 'Add amazing feature'`)
4. **Push** to the branch (`git push origin feature/amazing-feature`)
5. **Open** a Pull Request

### Development Guidelines

- Follow ESLint and Prettier configurations
- Write tests for new features
- Update documentation as needed
- Ensure all quality checks pass

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## ⚠️ Legal Disclaimer

This software is intended for legitimate automation of content you have legal access to. Users are responsible for:

- Complying with website terms of service
- Respecting rate limits and server resources
- Ensuring proper authorization for accessed content
- Following applicable data protection regulations

## 🆘 Support

- **Documentation**: Check this README and inline code comments
- **Issues**: Report bugs via GitHub Issues
- **Discussions**: Use GitHub Discussions for questions
- **Security**: Report security issues privately to the maintainers

## 🏷️ Version History

- **v1.0.0** - Initial release with core automation features
- **v0.9.0** - Beta release with login verification
- **v0.8.0** - Alpha release with basic scraping functionality

---

**Made with ❤️ by Cyborg**

*Professional automation suite for modern content management workflows* 