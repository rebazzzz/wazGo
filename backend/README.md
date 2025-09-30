# Waz Go Backend - Docker Development Setup

This setup automates the build, run, and monitoring of the Waz Go backend application using Docker Compose.

## Environment Setup

### Secrets Management

For security, sensitive credentials are managed using Docker secrets. Before running the application:

1. Create the secrets directory:
   ```
   mkdir secrets
   ```

2. Copy example files and fill with actual values:
   ```
   cp secrets/session_secret.txt.example secrets/session_secret.txt
   cp secrets/db_pass.txt.example secrets/db_pass.txt
   cp secrets/smtp_pass.txt.example secrets/smtp_pass.txt
   ```

3. Edit the secret files with your actual credentials:
   - `secrets/session_secret.txt`: A secure random string for session encryption
   - `secrets/db_pass.txt`: Database password
   - `secrets/smtp_pass.txt`: SMTP password (e.g., Gmail app password)

**Important**: Never commit actual secret files to version control. The `secrets/` directory is ignored by git.

### Alternative: Environment Variables

For development without Docker secrets, you can set environment variables directly:

```bash
export SESSION_SECRET=your_secure_session_secret
export DB_HOST=localhost
export DB_PORT=5432
export DB_NAME=wazgo
export DB_USER=postgres
export DB_PASS=your_db_password
export SMTP_HOST=smtp.gmail.com
export SMTP_PORT=587
export SMTP_USER=your_email@gmail.com
export SMTP_PASS=your_smtp_password
export EMAIL_FROM="Waz Go <your_email@gmail.com>"
export SMTP_TO=admin@wazgo.se
```

Or create a `.env` file based on `.env.example`.

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
docker-compose down
docker system prune -f
```

**Note**: The above command preserves database data. If you want to remove all data (including database), use `docker-compose down -v`.

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
