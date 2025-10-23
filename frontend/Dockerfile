# ===========================================
# ReContent Frontend - Dockerfile Production
# ===========================================
# Multi-stage build:
# - Stage 1: Build React app with Vite
# - Stage 2: Serve static files with nginx

# Stage 1: Build
FROM node:20-alpine AS builder

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install ALL dependencies (including devDependencies for build)
RUN npm ci && \
    npm cache clean --force

# Copy source code
COPY . .

# Build the application
# Vite will use base: '/recontent/' from vite.config.js
RUN npm run build

# Stage 2: Production with Nginx
FROM nginx:alpine AS production

# Add security labels
LABEL maintainer="matthieu.alix@example.com"
LABEL description="ReContent Frontend - Static build served by nginx"
LABEL version="1.0.0"

# Remove default nginx config
RUN rm -rf /etc/nginx/conf.d/default.conf

# Copy custom nginx configuration for SPA
COPY nginx.conf /etc/nginx/conf.d/recontent.conf

# Copy built files from builder stage
COPY --from=builder /app/dist /usr/share/nginx/html/recontent

# Create nginx user if not exists and set permissions
RUN chown -R nginx:nginx /usr/share/nginx/html/recontent && \
    chmod -R 755 /usr/share/nginx/html/recontent

# Health check
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD wget --quiet --tries=1 --spider http://localhost/health || exit 1

# Expose port 80 (internal)
EXPOSE 80

# Run as nginx user (already configured in base image)
# nginx:alpine runs as nginx by default

# Start nginx
CMD ["nginx", "-g", "daemon off;"]
