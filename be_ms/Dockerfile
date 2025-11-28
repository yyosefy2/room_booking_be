# Use Node.js LTS version
FROM node:18-alpine

# Set working directory
WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm install --omit=dev

# Copy application files
COPY . .

# Make entrypoint executable (script added to wait for DB and optionally seed)
RUN chmod +x ./scripts/docker-entrypoint.sh || true

# Expose the application port
EXPOSE 4000

# Use entrypoint to wait for DB and optionally run seed, then start the app
ENTRYPOINT ["sh", "./scripts/docker-entrypoint.sh"]
CMD ["npm", "start"]
