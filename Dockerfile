# Build the client with Vite and run a small Node server that also serves the static files

FROM oven/bun:1-alpine AS builder
WORKDIR /app

# Install deps first (better layer caching)
COPY package.json bun.lockb ./
# Install using Bun to avoid npm optional-deps bug with Rollup on musl
RUN bun install --frozen-lockfile

# Copy source and build
COPY . ./
RUN bun run build

FROM node:20-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production

# Install production runtime deps needed by the server (e.g., pngjs)
COPY --from=builder /app/package.json ./
# Use npm install (not ci) to avoid lockfile sync failures in CI
RUN npm install --omit=dev --no-audit --no-fund

# Copy server and built client
COPY --from=builder /app/server ./server
COPY --from=builder /app/dist ./dist

# Railway provides PORT env; our server respects it (defaults 4000)
EXPOSE 4000
CMD ["node", "server/index.cjs"]
