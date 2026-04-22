from pydantic_settings import BaseSettings
from pydantic import ConfigDict
from typing import Optional
from functools import lru_cache


class Settings(BaseSettings):
    model_config = ConfigDict(
        env_file=".env",
        case_sensitive=True,
        extra='ignore'  # Ignore extra environment variables
    )
    
    APP_NAME: str = "医美智能营销系统"
    APP_VERSION: str = "1.0.0"
    DEBUG: bool = False

    DEEPSEEK_API_KEY: str = ""
    KIMI_API_KEY: str = ""
    OPENAI_API_KEY: str = ""

    DEEPSEEK_MODEL: str = "deepseek-chat"
    KIMI_MODEL: str = "moonshot-v1-8k"
    DEEPSEEK_BASE_URL: str = "https://api.deepseek.com/v1"
    KIMI_BASE_URL: str = "https://api.moonshot.cn/v1"

    DEEPSEEK_TEMPERATURE: float = 0.7
    KIMI_TEMPERATURE: float = 0.1
    DEEPSEEK_MAX_TOKENS: int = 200
    KIMI_MAX_TOKENS: int = 300

    QDRANT_URL: str = "http://localhost:6333"
    QDRANT_API_KEY: Optional[str] = None
    QDRANT_COLLECTION_PREFIX: str = "yanmei_"

    REDIS_URL: str = "redis://localhost:6379/0"
    REDIS_MAX_CONNECTIONS: int = 50

    DB_HOST: str = "localhost"
    DB_PORT: int = 5432
    DB_USER: str = "postgres"
    DB_PASSWORD: str = ""
    DB_NAME: str = "medical_crm"

    JWT_SECRET: str = ""
    JWT_ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 15
    REFRESH_TOKEN_EXPIRE_DAYS: int = 7

    ENABLE_CACHE: bool = True
    CACHE_MAX_SIZE: int = 100
    CACHE_TTL: int = 300

    ALLOWED_ORIGINS: str = ""

    ENABLE_SEMANTIC_CACHE: bool = True
    SEMANTIC_CACHE_THRESHOLD: float = 0.85

    ENABLE_CIRCUIT_BREAKER: bool = True
    CIRCUIT_BREAKER_FAILURE_LIMIT: int = 5
    CIRCUIT_BREAKER_RECOVERY_TIMEOUT: int = 30

    LOG_LEVEL: str = "INFO"


@lru_cache()
def get_settings() -> Settings:
    return Settings()
