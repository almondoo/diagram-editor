.PHONY: up down restart logs build typecheck lint test shell clean preview

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
	docker compose exec app pnpm -r build

typecheck:
	docker compose exec app pnpm -r typecheck

lint:
	docker compose exec app pnpm -r lint

test:
	docker compose exec app pnpm --filter diagram-dsl-core test

app:
	docker compose exec app bash

preview:
	docker compose exec app sh -c "pnpm -r build && pnpm --filter diagram-editor-web preview --host"

clean:
	docker compose down -v
