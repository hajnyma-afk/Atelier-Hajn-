# Build stage
FROM node:20-slim AS builder

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm ci

# Copy source code
COPY . .

# Build frontend
RUN npm run build

# Production stage
FROM node:20-slim

WORKDIR /app

# Install production dependencies only
COPY package*.json ./
RUN npm ci --only=production && npm cache clean --force

# Copy built frontend from builder
COPY --from=builder /app/dist ./dist

# Copy server files
COPY server ./server

# Create uploads directory
RUN mkdir -p server/uploads

# Expose port (Cloud Run will set PORT env var)
EXPOSE 8080

# Set production environment
ENV NODE_ENV=production

# Start the server
CMD ["node", "server/index.js"]

