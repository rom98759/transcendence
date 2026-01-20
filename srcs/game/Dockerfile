# Use official Node.js LTS
FROM node:20-alpine

# Set working directory
WORKDIR /app

# Install any required packages (sqlite removed unless needed)
# RUN apk add --no-cache sqlite sqlite-dev bash su-exec

# Copy package.json files first to benefit from Docker cache
COPY package*.json ./

# Install production dependencies
RUN npm install

# Copy app source code
COPY src ./src
COPY tsconfig.json .

RUN npm run build

# Remove dev dependencies after build to reduce image size
RUN npm prune --production

# Expose WebSocket/HTTP port
EXPOSE 3003

# Default command (your file is game.js, not index.js)
CMD ["node", "dist/server.js"]
