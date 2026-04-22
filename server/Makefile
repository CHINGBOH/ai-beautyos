.PHONY: install dev test lint docker-build docker-up docker-down

install:
    pip install -r requirements.txt

dev:
    uvicorn main:app --reload --host 0.0.0.0 --port 8000

test:
    pytest tests/ -v --tb=short

lint:
    ruff check .
    mypy .

docker-build:
    docker-compose build

docker-up:
    docker-compose up -d

docker-down:
    docker-compose down

docker-logs:
    docker-compose logs -f

init-db:
    python -c "from core.auth import create_access_token; print('Token utilities ready')"
