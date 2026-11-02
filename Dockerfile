# ---- build stage -----------------------------------------------------------
FROM node:24-alpine AS build
WORKDIR /app

# Keep the build stage patched; build tooling only, no runtime packages installed.
RUN apk upgrade --no-cache

COPY package.json package-lock.json* ./
RUN npm ci --no-audit --no-fund || npm install --no-audit --no-fund

COPY tsconfig.json vite.config.ts postcss.config.js tailwind.config.js index.html ./
COPY src ./src

RUN npm run build

# ---- runtime stage ---------------------------------------------------------
FROM node:24-alpine AS runtime
WORKDIR /app
ENV NODE_ENV=production \
    PORT=3000

RUN apk upgrade --no-cache && rm -rf /var/cache/apk/*

# Only what the static server needs: the build output and the server script.
COPY --from=build /app/dist ./dist
COPY server.mjs ./server.mjs

RUN addgroup -S app && adduser -S app -G app \
  && chown -R app:app /app
USER app

EXPOSE 3000
HEALTHCHECK --interval=30s --timeout=3s --start-period=10s --retries=3 \
  CMD node -e "fetch('http://127.0.0.1:'+(process.env.PORT||3000)+'/healthz').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"

CMD ["node", "server.mjs"]
