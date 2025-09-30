.PHONY: build up down restart logs test clean dev

# Build the Docker images
build:
	docker-compose build

# Start the services
up:
	docker-compose up -d

# Stop the services
down:
	docker-compose down

# Restart the services
restart: down up

# View logs
logs:
	docker-compose logs -f

# Run tests (if you have test containers)
test:
	docker-compose exec app npm test

# Clean up containers and volumes
clean:
	docker-compose down -v
	docker system prune -f

# Development mode: build, start, and follow logs
dev: build up logs

# Quick restart for development
quick-restart:
	docker-compose restart app

# Health check
health:
	curl http://localhost:5000/health

# Full rebuild and restart
rebuild: down build up
