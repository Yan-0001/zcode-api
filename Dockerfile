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
COPY package.json tsconfig.json ./
COPY src/ ./src/
COPY entrypoint.sh /entrypoint.sh

RUN chmod +x /entrypoint.sh

EXPOSE 8080

ENTRYPOINT ["/entrypoint.sh"]
