# Multi-stage build for production-ready image
FROM node:18-alpine AS builder

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm install --production

# Runtime stage
FROM node:18-alpine

WORKDIR /app

# Copy node_modules and app from builder
COPY --from=builder /app/node_modules ./node_modules

# Copy application code and assets
COPY app.js .
COPY cicd-page.html .
COPY package*.json ./

# Expose port
EXPOSE 3000

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD node -e "require('http').get('http://localhost:3000/health', (r) => {if (r.statusCode !== 200) throw new Error(r.statusCode)})"

# Non-root user for security
RUN addgroup -g 1001 -S nodejs
RUN adduser -S nodejs -u 1001
USER nodejs

# Start application
CMD ["node", "app.js"]
