# Multi-stage: Builder for deps + frontend build, then runtime
FROM node:20-alpine AS builder

WORKDIR /app

# Copy package files for deps install (cached layer)
COPY package*.json ./

# Install all deps (prod + dev for build)
RUN npm ci

# Copy source for Vite build (index.html + src/ + config; targeted to avoid full repo bloat)
COPY index.html ./
COPY src ./src
COPY vite.config.js ./
COPY tailwind.config.js ./  # If used (per blueprint theming)
COPY postcss.config.js ./   # If exists (Tailwind postcss)
COPY .eslintrc.* ./         # If ESLint runs during build

# Build React frontend (Vite outputs to /dist)
RUN npm run build

# Production stage: Smaller image, only prod deps
FROM node:20-alpine AS runtime

WORKDIR /app

# Copy package files for prod install
COPY package*.json ./

# Install only prod deps (skips dev like vite, eslint)
RUN npm ci --only=production && npm cache clean --force

# Copy server code + built frontend (from builder stage)
COPY server ./server
COPY --from=builder /app/dist ./dist

COPY .env* ./

# Expose port (per your Nginx proxy)
EXPOSE 4000

# Health check (optional, for resilience)
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD node server/health.js || exit 1  # Add /health in index.js if needed

# Start backend (serves API + static /dist)
CMD ["npm", "start"]