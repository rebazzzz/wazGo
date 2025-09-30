# Waz Go Backend - Docker Development Setup

This setup automates the build, run, and monitoring of the Waz Go backend application using Docker Compose.

## Quick Start

### Windows
Double-click `dev.bat` or run it from command prompt:
```
dev.bat
```

### Linux/Mac (with make installed)
```
make dev
```

This will:
- Build the Docker images
- Start the app and database containers
- Wait for services to be healthy
- Display access URLs

## Manual Commands

### Build and Start
```
docker-compose build
docker-compose up -d
```

### View Logs
```
docker-compose logs -f
```

### Stop Services
```
docker-compose down
```

### Restart App (after code changes)
```
docker-compose restart app
```

### Full Rebuild
```
docker-compose down
docker-compose build
docker-compose up -d
```

### Run Tests
```
docker-compose exec app npm test
```

### Clean Up
```
docker-compose down -v
docker system prune -f
```

## Development Features

- **Hot Reload**: Code changes are automatically reflected due to volume mounts
- **Auto Restart**: Services restart automatically on failure
- **Health Checks**: Automatic health monitoring for app and database
- **Persistent Data**: Database data persists between restarts

## Access Points

- **App**: http://localhost:5000
- **API Docs**: http://localhost:5000/api-docs
- **Health Check**: http://localhost:5000/health
- **Database**: localhost:5432 (from host)

## Troubleshooting

If services fail to start:
1. Check logs: `docker-compose logs`
2. Ensure ports 5000 and 5432 are free
3. Verify `.env.docker` file exists with correct variables

For code changes, simply edit files - the container will hot-reload automatically.
