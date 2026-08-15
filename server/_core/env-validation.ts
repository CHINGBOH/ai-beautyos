/**
 * 环境变量验证模块
 * 在服务器启动时验证必需的环境变量
 */

interface EnvVarConfig {
  name: string;
  required: boolean;
  description: string;
  validator?: (value: string) => boolean;
  errorMessage?: string;
}

const isProduction = process.env.NODE_ENV === "production";

const ENV_VAR_CONFIGS: EnvVarConfig[] = [
  {
    name: "DATABASE_URL",
    required: isProduction,
    description: isProduction
      ? "PostgreSQL 数据库连接字符串（生产环境必须配置）"
      : "PostgreSQL 数据库连接字符串（未配置时仅前端可访问，依赖数据库的 API 会返回 503）",
    validator: (value) => !value || value.startsWith("postgresql://") || value.startsWith("postgres://"),
    errorMessage: "DATABASE_URL must be a valid PostgreSQL connection string",
  },
  {
    name: "JWT_SECRET",
    required: isProduction,
    description: isProduction
      ? "JWT 密钥（生产环境必须配置，至少 32 字符）"
      : "JWT 密钥，用于加密会话（未配置时使用开发占位，仅适合本地）",
    validator: (value) => !value || value.length >= 32,
    errorMessage: "JWT_SECRET must be at least 32 characters long when set",
  },
  {
    name: "DEEPSEEK_API_KEY",
    required: isProduction,
    description: isProduction
      ? "DeepSeek API 密锥（生产环境必须配置）"
      : "DeepSeek API 密锥，用于 AI 客服与职能助手（未配置时相关 API 会报错，但服务可启动）",
    validator: (value) => !value || value.startsWith("sk-"),
    errorMessage: "DEEPSEEK_API_KEY must start with 'sk-'",
  },
  {
    name: "OPENROUTER_API_KEY",
    required: false,
    description: "OpenRouter API 密锥（配置后启用 OpenRouter 路由，可选）",
  },
  {
    name: "OPENROUTER_API_URL",
    required: false,
    description: "OpenRouter API 地址（默认 https://openrouter.ai/api/v1）",
  },
  {
    name: "VITE_APP_ID",
    required: false,
    description: "应用 ID（可选）",
  },
  {
    name: "OAUTH_SERVER_URL",
    required: false,
    description: "OAuth 服务器 URL（可选）",
  },
  {
    name: "OWNER_OPEN_ID",
    required: false,
    description: "所有者 Open ID（可选）",
  },
];

export interface ValidationResult {
  valid: boolean;
  errors: string[];
  warnings: string[];
}

/**
 * 验证环境变量
 */
export function validateEnvVars(): ValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  for (const config of ENV_VAR_CONFIGS) {
    const value = process.env[config.name];

    if (config.required) {
      if (!value || value.trim() === "") {
        errors.push(
          `Required environment variable ${config.name} is missing. ` +
          `Description: ${config.description}`
        );
        continue;
      }

      // 运行自定义验证器
      if (config.validator && !config.validator(value)) {
        errors.push(
          `${config.name}: ${config.errorMessage || "Invalid value"}. ` +
          `Description: ${config.description}`
        );
      }
    } else {
      if (!value || value.trim() === "") {
        warnings.push(
          `Optional environment variable ${config.name} is not set. ` +
          `Description: ${config.description}`
        );
      }
    }
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings,
  };
}

/**
 * 验证并打印结果
 */
export function validateAndPrint(): void {
  // DISABLE_AUTH 生产环境守卫；演示环境可显式设置 ALLOW_DEMO_AUTH=1 放行。
  if (
    process.env.NODE_ENV === "production" &&
    process.env.DISABLE_AUTH === "1" &&
    process.env.ALLOW_DEMO_AUTH !== "1"
  ) {
    console.error("\n❌ FATAL: DISABLE_AUTH=1 is not allowed in production mode.");
    console.error("Set DISABLE_AUTH=0 or remove it from your environment, or set ALLOW_DEMO_AUTH=1 for demos.\n");
    process.exit(1);
  }

  const result = validateEnvVars();

  if (result.warnings.length > 0) {
    console.warn("\n⚠️  Environment Variable Warnings:");
    result.warnings.forEach((warning) => console.warn(`  - ${warning}`));
  }

  if (result.errors.length > 0) {
    console.error("\n❌ Environment Variable Validation Failed:");
    result.errors.forEach((error) => console.error(`  - ${error}`));
    console.error("\nPlease set the required environment variables and restart the server.");
    console.error("See .env.example for reference.\n");
    process.exit(1);
  }

  if (result.valid) {
    console.log("✅ Environment variables validated successfully");
  }
}
