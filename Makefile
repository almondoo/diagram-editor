.PHONY: up down restart app logs build typecheck lint test shell clean preview e2e e2e-headed e2e-ui e2e-install

build:
	docker compose build

up:
	docker compose up -d

down:
	docker compose down

restart:
	docker compose restart app

logs:
	docker compose logs -f app

ps:
	docker compose ps

dev:
	docker compose exec app pnpm run dev

start:
	docker compose exec app pnpm run build
	docker compose exec app pnpm run start

typecheck:
	docker compose exec app pnpm run typecheck

lint:
	docker compose exec app pnpm run lint

test:
	docker compose exec app pnpm run test

app:
	docker compose exec app bash

preview:
	docker compose exec app pnpm run preview

clean:
	docker compose down -v

# E2E tests (ホスト側で実行、開発サーバーは make up で起動しておくこと)
e2e:
	docker compose exec app pnpm run e2e

e2e-report:
	docker compose exec app pnpm run exec playwright show-report

e2e-headed:
	docker compose exec app pnpm run e2e:headed

e2e-ui:
	docker compose exec app pnpm run e2e:ui

e2e-install:
	docker compose exec app pnpm run exec playwright install --with-deps chromium
