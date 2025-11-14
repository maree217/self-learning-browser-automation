# Browser MCP Server Dockerfile
# Base: Node.js 18 Alpine (lightweight ~40MB base)
FROM node:18-alpine

# Install Chromium and dependencies
# - chromium: Headless browser for Playwright
# - nss: Network Security Services for HTTPS
# - freetype, harfbuzz: Font rendering
# - ca-certificates: SSL certificate validation
# - ttf-freefont: Basic fonts
RUN apk add --no-cache \
    chromium \
    nss \
    freetype \
    harfbuzz \
    ca-certificates \
    ttf-freefont

# Configure Playwright to use system Chromium
ENV PUPPETEER_EXECUTABLE_PATH=/usr/bin/chromium-browser
ENV PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=true

# Set working directory
WORKDIR /app

# Copy package files first (Docker layer caching)
COPY package*.json ./

# Install production dependencies only
RUN npm ci --only=production

# Copy compiled application
COPY dist ./dist

# Create logs directory
RUN mkdir -p /app/logs && chown -R node:node /app/logs

# Switch to non-root user
USER node

# Expose API port
EXPOSE 8080

# Health check endpoint for container orchestration
HEALTHCHECK --interval=30s --timeout=10s --start-period=40s --retries=3 \
  CMD node -e "require('http').get('http://localhost:8080/health', (r) => { process.exit(r.statusCode === 200 ? 0 : 1); })"

# Start the MCP server
CMD ["node", "dist/index.js"]
