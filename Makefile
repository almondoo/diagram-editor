.PHONY: up down restart logs build typecheck install shell clean

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
	docker compose exec app pnpm build

typecheck:
	docker compose exec app pnpm typecheck

install:
	docker compose exec app pnpm install

dev:
	docker compose exec app pnpm dev

shell:
	docker compose exec app sh

clean:
	docker compose down -v
