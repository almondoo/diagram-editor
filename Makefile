.PHONY: up down restart logs build typecheck test shell clean

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

build:
	docker compose exec app pnpm -r build

typecheck:
	docker compose exec app pnpm -r typecheck

test:
	docker compose exec app pnpm --filter diagram-dsl-core test

shell:
	docker compose exec app sh

clean:
	docker compose down -v
