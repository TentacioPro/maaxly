# --- STAGE 1: Build the React Frontend ---
FROM node:20-alpine AS builder
WORKDIR /app

# Copy all package.json and package-lock.json files
COPY package.json package-lock.json* ./
COPY server/package.json server/
COPY src/package.json src/
# (Add any other package.json files if they exist)

# Install all dependencies for the entire monorepo
RUN npm install

# Copy the rest of the source code
COPY . .

# Build the frontend (Vite)
RUN npm run build

# --- STAGE 2: Build the Production Server ---
FROM node:20-alpine AS runner
WORKDIR /app

ENV NODE_ENV=production

# Copy only the production dependencies' package.json files
COPY package.json package-lock.json* ./
COPY server/package.json server/

# Install *only* the production dependencies for the server
RUN npm install --production

# Copy the server source code
COPY server/ ./server/

# Copy the built React app from the 'builder' stage
# Assumes Express serves static files from 'server/dist'
COPY --from=builder /app/dist ./server/dist

# Expose the port your server runs on (PORT 4000)
EXPOSE 4000

# The command to start your server (server/index.js)
CMD [ "node", "server/index.js" ]