.PHONY: setup dev worker build clean

setup:
	@echo "🛠️  Setting up the project..."
	yarn install
	@echo "📦 Generating Prisma client..."
	npx prisma generate
	@echo "💾 Pushing database schema..."
	npx prisma db push
	@echo "🌱 Seeding database..."
	yarn db:seed
	@echo "✅ Setup complete!"

dev:
	@echo "🚀 Starting development server..."
	yarn dev

worker:
	@echo "👷 Starting BullMQ worker..."
	yarn worker

build:
	@echo "🏭 Building for production..."
	yarn build

clean:
	@echo "🧽 Cleaning up..."
	rm -rf .next node_modules
	@echo "✅ Cleaned!"

docker-up:
	@echo "🐳 Starting Docker containers..."
	docker-compose up -d

docker-down:
	@echo "🐳 Stopping Docker containers..."
	docker-compose down

docker-logs:
	docker-compose logs -f
