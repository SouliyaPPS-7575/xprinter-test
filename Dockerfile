# Build the client with Vite and run a small Node server that also serves the static files

FROM node:20-alpine AS builder
WORKDIR /app

# Install deps first (better layer caching)
COPY package.json package-lock.json ./
RUN npm ci

# Copy source and build
COPY . ./
RUN npm run build

FROM node:20-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production

COPY package.json package-lock.json ./
RUN npm ci --omit=dev

# Copy server and built client
COPY --from=builder /app/server ./server
COPY --from=builder /app/dist ./dist

# Railway provides PORT env; our server respects it (defaults 4000)
EXPOSE 4000
CMD ["node", "server/index.cjs"]

