# Use official Node.js runtime as parent image
FROM node:20-alpine

# Set working directory in container
WORKDIR /app

# Copy package files
COPY package*.json ./

# Install production dependencies
RUN npm ci --only=production

# Copy application source code
COPY . .

# Create directory for local uploads
RUN mkdir -p uploads

# Expose port (Google Cloud Run uses PORT env var, which defaults to 5000 in our setup)
EXPOSE 5000

# Set environment variables
ENV NODE_ENV=production
ENV PORT=5000

# Start the application
CMD ["npm", "start"]
