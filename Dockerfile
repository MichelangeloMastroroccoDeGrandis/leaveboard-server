# syntax=docker/dockerfile:1

FROM node:20-alpine

WORKDIR /app

# Install dependencies based on lockfile for reproducible builds
COPY package*.json ./
RUN npm ci --omit=dev --no-audit --no-fund

# Copy application source
COPY . .

# Default environment (can be overridden at runtime)
ENV NODE_ENV=production
ENV PORT=7088

EXPOSE 7088

# Run the server
CMD ["node", "index.js"]
