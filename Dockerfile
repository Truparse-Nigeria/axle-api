# Use the official Bun image as the base image
FROM oven/bun:latest

# Set the working directory
WORKDIR /app

# dumb-init runs as PID 1 to forward signals and reap zombie processes.
RUN apt-get update && apt-get install -y \
    dumb-init \
    && rm -rf /var/lib/apt/lists/*

# Copy package.json and package-lock.json
COPY package*.json ./

# Copy bun lock file
COPY bun.lock ./

# Install dependencies using bun
RUN bun install

# Copy the rest of the application code
COPY . .

# Build the TypeScript code with bun
RUN bun run build

# Expose the port the app runs on in the container
EXPOSE 4002    

# Run under dumb-init (PID 1) so SIGTERM reaches the app and Chromium
# child processes are reaped cleanly on shutdown.
ENTRYPOINT ["dumb-init", "--"]

# Define the command to run the app using JSON array syntax
CMD ["bun", "run", "start"]
