# Multi-stage build for production
FROM node:18-alpine AS client-build

# Build client (devDependencies are required to compile the CRA bundle)
WORKDIR /app/client
COPY client/package*.json ./
COPY client/patches ./patches
RUN npm ci --no-audit --no-fund
COPY client/ ./
RUN npm run build

# Production server
FROM node:18-alpine AS production

WORKDIR /app

# Install server dependencies
COPY package*.json ./
RUN npm ci --omit=dev --no-audit --no-fund

# Copy server files
COPY . .

# Copy built client
COPY --from=client-build /app/client/build ./client/build

# Create non-root user
RUN addgroup -g 1001 -S nodejs
RUN adduser -S nodejs -u 1001

# Change ownership
RUN chown -R nodejs:nodejs /app
USER nodejs

EXPOSE 5000

CMD ["npm", "start"]