FROM node:24.20.0-bookworm-slim

WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci --ignore-scripts=false && npm cache clean --force
COPY src/ ./src/
COPY scripts/native.ts scripts/reflow-cli.ts scripts/reflow-worker.ts ./scripts/

ENV NODE_ENV=production
ENTRYPOINT ["node", "--import", "tsx", "scripts/reflow-cli.ts"]
