# This is the Dockerfile for the BACKEND API (`maaxly-app`)

FROM node:20-alpine AS runtime
WORKDIR /app

# Copy package files for prod install
COPY package*.json ./

# Install only prod deps
RUN npm ci --only=production && npm cache clean --force

# Copy the ENTIRE server directory and all its sub-folders
COPY server/ ./server/

# Copy environment files
COPY .env* ./

# Expose the internal API port
EXPOSE 4000

# Start the backend server
CMD ["node", "server/index.js"]