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

const ENV_VAR_CONFIGS: EnvVarConfig[] = [
  {
    name: "DATABASE_URL",
    required: true,
    description: "PostgreSQL 数据库连接字符串",
    validator: (value) => value.startsWith("postgresql://") || value.startsWith("postgres://"),
    errorMessage: "DATABASE_URL must be a valid PostgreSQL connection string",
  },
  {
    name: "JWT_SECRET",
    required: true,
    description: "JWT 密钥，用于加密会话",
    validator: (value) => value.length >= 32,
    errorMessage: "JWT_SECRET must be at least 32 characters long",
  },
  {
    name: "DEEPSEEK_API_KEY",
    required: true,
    description: "DeepSeek API 密钥，用于 AI 客服",
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
