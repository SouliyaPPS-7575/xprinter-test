# Build the client with Vite and run a small Node server that also serves the static files

FROM oven/bun:1-alpine AS builder
WORKDIR /app

# Install deps first (better layer caching)
COPY package.json bun.lockb ./
# Install using Bun to avoid npm optional-deps bug with Rollup on musl
RUN bun install --frozen-lockfile

# Optionally pass API base for the client at build time (defaults same-origin)
ARG VITE_API_URL=""
ENV VITE_API_URL=${VITE_API_URL}

# Copy source and build
COPY . ./
RUN bun run build

FROM node:20-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production

# Install production runtime deps deterministically (server-only needs)
COPY package.json package-lock.json ./
RUN npm ci --omit=dev --no-audit --no-fund

# Copy server and built client
COPY --from=builder /app/server ./server
COPY --from=builder /app/dist ./dist

# Run as non-root for security
USER node

# Railway provides PORT env; our server respects it (defaults 4000)
EXPOSE 4000

# Simple healthcheck hits the server's /healthz endpoint without requiring curl/wget
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD node -e "const http=require('http');const p=process.env.PORT||4000;http.get('http://127.0.0.1:'+p+'/healthz',r=>process.exit(r.statusCode===200?0:1)).on('error',()=>process.exit(1))"

CMD ["node", "server/index.cjs"]
