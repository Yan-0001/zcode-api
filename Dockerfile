# ---- Build Stage ----
FROM oven/bun:1 AS build

WORKDIR /app

# Install dependencies (frozen lockfile ensures reproducible installs)
COPY package.json bun.lock ./
RUN bun install --frozen-lockfile --production

# ---- Production Stage ----
FROM oven/bun:1 AS production

WORKDIR /app

# Copy only what's needed at runtime
COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/bun.lock ./bun.lock
COPY package.json tsconfig.json config.example.yaml config.test.yaml ./
COPY src/ ./src/
COPY entrypoint.sh /entrypoint.sh

RUN chmod +x /entrypoint.sh

# Hugging Face Spaces exposes port 7860 internally
# The entrypoint bridges PORT (7860) → ZCODE_PROXY_PORT automatically
EXPOSE 7860

ENTRYPOINT ["/entrypoint.sh"]
