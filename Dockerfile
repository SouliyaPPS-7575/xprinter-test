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

# No runtime npm deps are required for the simple HTTP server,
# so skip installing node_modules in the runner image.

# Copy server and built client
COPY --from=builder /app/server ./server
COPY --from=builder /app/dist ./dist

# Railway provides PORT env; our server respects it (defaults 4000)
EXPOSE 4000
CMD ["node", "server/index.cjs"]
