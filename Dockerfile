# Use official Node image
FROM node:18-alpine

# Create app directory
WORKDIR /app

# Install dependencies
COPY package*.json ./
RUN npm install

# Copy source
COPY . .

# Build TypeScript
RUN npm run build

# Expose the port Fly will map
EXPOSE 8080

# Start the server
CMD ["npm", "start"]
