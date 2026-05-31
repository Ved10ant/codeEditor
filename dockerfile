# FROM node:20-alpine

# WORKDIR /app

# COPY ./Backend/package*.json ./

# RUN npm install

# COPY ./Backend .

# EXPOSE 3000

# CMD ["node", "server.js"]

FROM node:20-alpine AS frontend-builder

WORKDIR /app/frontend

COPY Frontend/package*.json ./

RUN npm install

# Copy the rest of the frontend source code
COPY Frontend/ ./

RUN npm run build 

# backend part
FROM node:20-alpine 

WORKDIR /app

# Install backend dependencies
COPY Backend/package*.json ./
RUN npm install

# Copy backend source code
COPY ./Backend ./

# Copy built frontend assets to backend's public directory
COPY --from=frontend-builder /app/frontend/dist ./public

EXPOSE 3000

CMD ["node", "server.js"]
