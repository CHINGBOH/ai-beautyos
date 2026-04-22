/**
 * 安全的 JSON 处理模块
 * 特性：1) 带默认值的安全解析 2) JSON提取（从混合文本）3) Schema验证
 */

import { logger } from "./logger";

/**
 * 安全解析 JSON，失败时返回默认值
 */
export function safeJsonParse<T>(
  jsonString: string | null | undefined,
  defaultValue: T,
  context?: string
): T {
  if (!jsonString || typeof jsonString !== "string") {
    return defaultValue;
  }
  
  try {
    // 处理可能的空白字符
    const trimmed = jsonString.trim();
    if (!trimmed) return defaultValue;
    
    return JSON.parse(trimmed) as T;
  } catch (error) {
    if (context) {
      logger.warn(`[SafeJSON] Failed to parse JSON (${context}):`, {
        input: jsonString.slice(0, 200),
        error: (error as Error).message,
      });
    }
    return defaultValue;
  }
}

/**
 * 从混合文本中提取 JSON 对象
 * 支持：1) Markdown代码块 2) 嵌套在文本中的JSON 3) 修复常见格式错误
 */
export function extractJsonFromText<T = unknown>(
  text: string | null | undefined,
  options: {
    defaultValue?: T;
    strict?: boolean;
  } = {}
): T | null {
  const { defaultValue = null, strict = false } = options;
  
  if (!text || typeof text !== "string") {
    return defaultValue as T;
  }
  
  const trimmed = text.trim();
  
  // 1. 尝试直接解析
  try {
    return JSON.parse(trimmed) as T;
  } catch {
    // 继续尝试其他方法
  }
  
  // 2. 提取 Markdown JSON 代码块
  const codeBlockMatch = trimmed.match(/```(?:json)?\s*\n?([\s\S]*?)```/);
  if (codeBlockMatch) {
    try {
      return JSON.parse(codeBlockMatch[1]!.trim()) as T;
    } catch {
      // 继续尝试
    }
  }
  
  // 3. 提取第一个 { } 或 [ ] 包裹的内容
  const objectMatch = trimmed.match(/\{[\s\S]*\}/);
  if (objectMatch) {
    try {
      return JSON.parse(objectMatch[0]!) as T;
    } catch {
      // 继续尝试修复
    }
    
    // 4. 尝试修复常见错误并重新解析
    try {
      const fixed = fixCommonJsonErrors(objectMatch[0]!);
      return JSON.parse(fixed) as T;
    } catch {
      // 继续尝试
    }
  }
  
  // 5. 提取数组
  const arrayMatch = trimmed.match(/\[[\s\S]*\]/);
  if (arrayMatch) {
    try {
      return JSON.parse(arrayMatch[0]!) as T;
    } catch {
      // 最终失败
    }
  }
  
  // 严格模式：返回null，否则尝试最后的方法
  if (strict) return defaultValue as T;
  
  // 6. 最后一招：查找任何看起来像JSON的内容
  const looseMatch = trimmed.match(/("[\w]+":\s*"[^"]*"|"[\w]+":\s*\d+|"[\w]+":\s*true|false|null)/g);
  if (looseMatch) {
    try {
      const reconstructed = `{${looseMatch.join(", ")}}`;
      return JSON.parse(reconstructed) as T;
    } catch {
      // 放弃
    }
  }
  
  return defaultValue as T;
}

/**
 * 修复常见的 JSON 格式错误
 */
function fixCommonJsonErrors(json: string): string {
  let fixed = json;
  
  // 1. 修复尾随逗号
  fixed = fixed.replace(/,\s*([}\]])/g, "$1");
  
  // 2. 修复单引号
  fixed = fixed.replace(/'/g, '"');
  
  // 3. 修复未加引号的键
  fixed = fixed.replace(/([{,]\s*)(\w+)(\s*:)/g, '$1"$2"$3');
  
  // 4. 修复未加引号的字符串值（简单情况）
  // 注意：这可能会误伤，只在必要时使用
  
  // 5. 移除注释
  fixed = fixed.replace(/\/\/.*$/gm, "");
  fixed = fixed.replace(/\/\*[\s\S]*?\*\//g, "");
  
  return fixed;
}

/**
 * 安全序列化为 JSON
 */
export function safeJsonStringify(
  value: unknown,
  options: {
    defaultValue?: string;
    pretty?: boolean;
    maxDepth?: number;
  } = {}
): string {
  const { defaultValue = "null", pretty = false, maxDepth = 10 } = options;
  
  try {
    // 检查循环引用
    const seen = new WeakSet();
    const replacer = (key: string, val: unknown) => {
      if (typeof val === "object" && val !== null) {
        if (seen.has(val)) {
          return "[Circular]";
        }
        seen.add(val);
      }
      return val;
    };
    
    return JSON.stringify(value, replacer, pretty ? 2 : undefined);
  } catch (error) {
    logger.error("[SafeJSON] Stringify failed:", error);
    return defaultValue;
  }
}

/**
 * Zod风格的简单Schema验证
 */
type SchemaType = "string" | "number" | "boolean" | "array" | "object";

interface SchemaField {
  type: SchemaType;
  required?: boolean;
  default?: unknown;
}

type Schema = Record<string, SchemaField>;

/**
 * 验证并清理对象
 */
export function validateAndSanitize<T extends Record<string, unknown>>(
  data: unknown,
  schema: Schema,
  context?: string
): T | null {
  if (!data || typeof data !== "object") {
    logger.warn(`[SafeJSON] Invalid data type (${context}):`, typeof data);
    return null;
  }
  
  const result: Record<string, unknown> = {};
  const input = data as Record<string, unknown>;
  
  for (const [key, fieldDef] of Object.entries(schema)) {
    const value = input[key];
    
    // 检查必填
    if (fieldDef.required && (value === undefined || value === null)) {
      if (fieldDef.default !== undefined) {
        result[key] = fieldDef.default;
      } else {
        logger.warn(`[SafeJSON] Missing required field (${context}): ${key}`);
        return null;
      }
      continue;
    }
    
    // 跳过未提供的非必填字段
    if (value === undefined || value === null) {
      if (fieldDef.default !== undefined) {
        result[key] = fieldDef.default;
      }
      continue;
    }
    
    // 类型检查
    const actualType = Array.isArray(value) ? "array" : typeof value;
    if (actualType !== fieldDef.type) {
      // 尝试类型转换
      const converted = tryConvertType(value, fieldDef.type);
      if (converted === null && fieldDef.required) {
        logger.warn(`[SafeJSON] Type mismatch (${context}): ${key} expected ${fieldDef.type}, got ${actualType}`);
        return null;
      }
      result[key] = converted ?? fieldDef.default;
    } else {
      result[key] = value;
    }
  }
  
  return result as T;
}

function tryConvertType(value: unknown, targetType: SchemaType): unknown {
  switch (targetType) {
    case "string":
      return String(value);
    case "number":
      const num = Number(value);
      return isNaN(num) ? null : num;
    case "boolean":
      if (typeof value === "boolean") return value;
      if (typeof value === "string") {
        return value.toLowerCase() === "true" || value === "1";
      }
      if (typeof value === "number") return value !== 0;
      return null;
    case "array":
      if (Array.isArray(value)) return value;
      return null;
    case "object":
      if (typeof value === "object" && !Array.isArray(value)) return value;
      return null;
    default:
      return null;
  }
}

/**
 * 批量安全解析
 */
export function safeJsonParseBatch<T>(
  items: Array<{ json: string | null; defaultValue: T; context?: string }>
): T[] {
  return items.map(item => safeJsonParse(item.json, item.defaultValue, item.context));
}
