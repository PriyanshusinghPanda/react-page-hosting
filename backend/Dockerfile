FROM node:20-slim

WORKDIR /app

# Install dependencies first for caching
COPY package*.json ./
RUN npm install --production

# Copy the rest of the backend code
COPY . .

# Expose the API port
EXPOSE 7830

CMD ["node", "server.js"]
