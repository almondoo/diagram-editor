FROM node:22-slim

WORKDIR /app

RUN npm install -g pnpm@10.7.0 --silent
