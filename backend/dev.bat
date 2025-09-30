@echo off
echo Starting Waz Go development environment...

REM Build the images
echo Building Docker images...
docker-compose build

REM Start the services
echo Starting services...
docker-compose up -d

REM Wait for services to be healthy
echo Waiting for services to be ready...
timeout /t 10 /nobreak > nul

REM Check health
echo Checking health...
curl http://localhost:5000/health
if %errorlevel% neq 0 (
    echo Health check failed. Checking logs...
    docker-compose logs app
    goto :error
)

echo Services are running!
echo - App: http://localhost:5000
echo - API Docs: http://localhost:5000/api-docs
echo - Health: http://localhost:5000/health
echo.
echo To view logs: docker-compose logs -f
echo To stop: docker-compose down
echo To restart app: docker-compose restart app
goto :end

:error
echo An error occurred. Please check the logs above.
pause

:end
