import os
from enum import StrEnum

from pydantic import BaseModel, Field, validator


class Environment(StrEnum):
    DEVELOPMENT = "development"
    STAGING = "staging"
    PRODUCTION = "production"


class DatabaseConfig(BaseModel):
    host: str = Field(default="localhost")
    port: int = Field(default=5432)
    user: str = Field(default="postgres")
    password: str = Field(default="")
    name: str = Field(default="medical_crm")
    pool_min_size: int = Field(default=5)
    pool_max_size: int = Field(default=20)
    pool_max_overflow: int = Field(default=10)
    pool_timeout: int = Field(default=30)
    pool_recycle: int = Field(default=3600)

    @validator("password")
    def validate_password(self, v):
        if not v and os.getenv("ENVIRONMENT") == Environment.PRODUCTION:
            raise ValueError("Password is required in production")
        return v


class RedisConfig(BaseModel):
    url: str = Field(default="redis://localhost:6379/0")
    max_connections: int = Field(default=50)
    socket_timeout: int = Field(default=5)
    socket_connect_timeout: int = Field(default=5)
    retry_on_timeout: bool = Field(default=True)
    health_check_interval: int = Field(default=30)


class LLMConfig(BaseModel):
    deepseek_api_key: str = Field(default="")
    kimi_api_key: str = Field(default="")
    openai_api_key: str = Field(default="")

    deepseek_model: str = Field(default="deepseek-chat")
    kimi_model: str = Field(default="moonshot-v1-8k")
    openai_model: str = Field(default="gpt-4")

    deepseek_base_url: str = Field(default="https://api.deepseek.com/v1")
    kimi_base_url: str = Field(default="https://api.moonshot.cn/v1")

    deepseek_temperature: float = Field(default=0.7, ge=0.0, le=2.0)
    kimi_temperature: float = Field(default=0.1, ge=0.0, le=2.0)

    deepseek_max_tokens: int = Field(default=200, ge=1, le=4096)
    kimi_max_tokens: int = Field(default=300, ge=1, le=4096)

    request_timeout: int = Field(default=30, ge=1)
    max_retries: int = Field(default=3, ge=0)


class SecurityConfig(BaseModel):
    jwt_secret: str = Field(default="change-me")
    jwt_algorithm: str = Field(default="HS256")
    access_token_expire_minutes: int = Field(default=15, ge=1)
    refresh_token_expire_days: int = Field(default=7, ge=1)

    password_min_length: int = Field(default=8, ge=8)
    password_require_uppercase: bool = Field(default=True)
    password_require_lowercase: bool = Field(default=True)
    password_require_digits: bool = Field(default=True)
    password_require_special: bool = Field(default=False)

    allowed_origins: list[str] = Field(default=["*"])
    allowed_methods: list[str] = Field(default=["*"])
    allowed_headers: list[str] = Field(default=["*"])

    rate_limit_per_minute: int = Field(default=60, ge=1)
    rate_limit_burst: int = Field(default=10, ge=1)


class RAGConfig(BaseModel):
    qdrant_url: str = Field(default="http://localhost:6333")
    qdrant_api_key: str | None = Field(default=None)
    qdrant_collection_prefix: str = Field(default="yanmei_")
    vector_dimension: int = Field(default=1024)
    similarity_threshold: float = Field(default=0.85, ge=0.0, le=1.0)
    max_results: int = Field(default=10, ge=1)


class MonitoringConfig(BaseModel):
    sentry_dsn: str | None = Field(default=None)
    prometheus_enabled: bool = Field(default=True)
    prometheus_port: int = Field(default=9090)

    log_level: str = Field(default="INFO")
    log_format: str = Field(default="json")

    enable_tracing: bool = Field(default=False)
    tracing_sample_rate: float = Field(default=0.1, ge=0.0, le=1.0)


class AppConfig(BaseModel):
    name: str = Field(default="医美智能营销系统")
    version: str = Field(default="1.0.0")
    environment: Environment = Field(default=Environment.DEVELOPMENT)

    debug: bool = Field(default=False)
    reload: bool = Field(default=False)

    host: str = Field(default="0.0.0.0")
    port: int = Field(default=8000)
    workers: int = Field(default=1)

    database: DatabaseConfig = Field(default_factory=DatabaseConfig)
    redis: RedisConfig = Field(default_factory=RedisConfig)
    llm: LLMConfig = Field(default_factory=LLMConfig)
    security: SecurityConfig = Field(default_factory=SecurityConfig)
    rag: RAGConfig = Field(default_factory=RAGConfig)
    monitoring: MonitoringConfig = Field(default_factory=MonitoringConfig)


def load_config() -> AppConfig:
    return AppConfig()


def validate_config(config: AppConfig) -> list[str]:
    errors = []

    if config.environment == Environment.PRODUCTION:
        if config.debug:
            errors.append("Debug mode must be disabled in production")

        if not config.database.password:
            errors.append("Database password is required in production")

        if len(config.security.jwt_secret) < 32:
            errors.append("JWT secret must be at least 32 characters in production")

        if "*" in config.security.allowed_origins:
            errors.append("Wildcard origins are not allowed in production")

    if config.workers > 1 and not config.redis.url:
        errors.append("Redis is required when running multiple workers")

    return errors
