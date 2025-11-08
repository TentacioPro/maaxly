# --- STAGE 1: Build the React Frontend ---
FROM node:20-alpine AS builder
WORKDIR /app

# Copy all package files
COPY package*.json ./

# Install all dependencies
RUN npm ci

# Copy the rest of the source code
COPY . .

# Build the static React app
RUN npm run build

# --- STAGE 2: Create the Production Server ---
FROM node:20-alpine AS runtime
WORKDIR /app

# Copy package files for prod install
COPY package*.json ./

# Install only prod deps (skips dev like vite, eslint)
RUN npm ci --only=production && npm cache clean --force

# (FIX) This now copies the entire server directory AND all its sub-folders
COPY server/ ./server/

# (FIX) This copies the built frontend from the builder stage
COPY --from=builder /app/dist ./server/dist

# Expose port (per your Nginx proxy)
EXPOSE 4000

# Health check (optional, for resilience)
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD node server/health.js || exit 1  # Add /health in index.js if needed

# Start backend (serves API + static /dist)
CMD ["node", "server/index.js"]