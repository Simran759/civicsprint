# Stage 1: Build the React application
FROM node:20-alpine AS build

WORKDIR /app

COPY package*.json ./
RUN npm ci

COPY . .
RUN npm run build

# Stage 2: Serve the built assets with Nginx
FROM nginx:1.25-alpine

# Copy built static files from Stage 1
COPY --from=build /app/dist /usr/share/nginx/html

# Expose HTTP port
EXPOSE 80

# Configure Nginx to support Single Page Application (SPA) routing
RUN echo 'server { \
    listen 80; \
    location / { \
        root /usr/share/nginx/html; \
        index index.html index.htm; \
        try_files $uri $uri/ /index.html; \
    } \
    location /uploads/ { \
        proxy_pass http://backend:5000/uploads/; \
    } \
    location /api/ { \
        proxy_pass http://backend:5000/api/; \
    } \
}' > /etc/nginx/conf.d/default.conf

# Start Nginx
CMD ["nginx", "-g", "daemon off;"]
