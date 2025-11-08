# Multi-stage: Builder for deps + frontend build, then runtime
FROM node:20-alpine AS builder

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install all deps (prod + dev for build)
RUN npm ci

# Build React frontend (Vite outputs to /dist)
RUN npm run build

# Production stage: Smaller image, only prod deps
FROM node:20-alpine AS runtime

WORKDIR /app

# Copy package files for prod install
COPY package*.json ./

# Install only prod deps (skips dev like vite, eslint)
RUN npm ci --only=production && npm cache clean --force

# Copy server code + built frontend
COPY server ./server
COPY dist ./dist  # Vite build output; adjust if your vite.config.js uses 'build.outDir'
COPY .env* ./

# Expose port (per your Nginx proxy)
EXPOSE 4000

# Health check (optional, for resilience)
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD node server/health.js || exit 1  # Add a simple /health endpoint in server if needed

# Start backend (serves API + static /dist)
CMD ["npm", "start"]