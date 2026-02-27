.PHONY: up down restart app logs build typecheck lint test shell clean preview e2e e2e-headed e2e-ui e2e-install

docker-build:
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
	docker compose exec app pnpm dev

build:
	docker compose exec app pnpm build

typecheck:
	docker compose exec app pnpm typecheck

lint:
	docker compose exec app pnpm lint

test:
	docker compose exec app pnpm test

app:
	docker compose exec app bash

preview:
	docker compose exec app pnpm preview

clean:
	docker compose down -v

# E2E tests (ホスト側で実行、開発サーバーは make up で起動しておくこと)
e2e:
	docker compose exec app pnpm e2e

e2e-report:
	docker compose exec app pnpm exec playwright show-report

e2e-headed:
	docker compose exec app pnpm e2e:headed

e2e-ui:
	docker compose exec app pnpm e2e:ui

e2e-install:
	docker compose exec app pnpm exec playwright install --with-deps chromium
