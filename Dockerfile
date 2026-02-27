FROM node:22-slim

WORKDIR /app

COPY . .

RUN npm install -g pnpm

RUN pnpm install

RUN pnpm exec playwright install --with-deps chromium