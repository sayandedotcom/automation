# Use Node with Debian (required for Playwright dependencies)
FROM node:20-slim AS base

# Install Playwright dependencies and Chromium only
RUN apt-get update && apt-get install -y \
    libnss3 \
    libnspr4 \
    libatk1.0-0 \
    libatk-bridge2.0-0 \
    libcups2 \
    libdrm2 \
    libdbus-1-3 \
    libxkbcommon0 \
    libxcomposite1 \
    libxdamage1 \
    libxfixes3 \
    libxrandr2 \
    libgbm1 \
    libasound2 \
    libpango-1.0-0 \
    libcairo2 \
    libatspi2.0-0 \
    libgtk-3-0 \
    fonts-liberation \
    wget \
    ca-certificates \
    && rm -rf /var/lib/apt/lists/*

# Enable corepack for pnpm
RUN corepack enable && corepack prepare pnpm@9.0.0 --activate

# Stage 1: Install dependencies
FROM base AS deps
WORKDIR /app
COPY package.json pnpm-lock.yaml ./
COPY sst-env.d.ts* ./
RUN pnpm install --frozen-lockfile

# Install only Chromium browser for Playwright
RUN npx playwright install chromium

# Stage 2: Build the application
FROM base AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN pnpm run build

# Stage 3: Production server
FROM base AS runner
WORKDIR /app
ENV NODE_ENV=production

# Copy the built application
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static
COPY --from=builder /app/public ./public

# Copy node_modules (includes Playwright)
COPY --from=deps /app/node_modules ./node_modules

# Copy Playwright browsers from deps stage
COPY --from=deps /root/.cache/ms-playwright /root/.cache/ms-playwright

EXPOSE 3000
CMD ["node", "server.js"]