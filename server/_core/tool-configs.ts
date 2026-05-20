import fs from "node:fs";
import path from "node:path";
import { parse as parseYaml } from "yaml";

export type ToolConfig = {
  schemaVersion: string;
  name: string;
  description: string;
  risk: "low" | "medium" | "high" | "very_high";
  access: "ro" | "rw";
  timeoutMs: number;
  maxRows: number;
  rateLimitPerMin: number;
  requiresConfirm: boolean;
  supportsDryRun: boolean;
  tags?: string[];
  audit?: "full" | "summary" | "none";
  input?: Record<string, unknown>;
  output?: Record<string, unknown>;
};

const TOOL_DIR_CANDIDATES = [
  path.resolve(process.cwd(), "config/tools"),
  path.resolve(import.meta.dirname, "../../config/tools"),
  path.resolve(import.meta.dirname, "../config/tools"),
];

function findToolDir(): string | null {
  for (const p of TOOL_DIR_CANDIDATES) {
    if (fs.existsSync(p)) return p;
  }
  return null;
}

export function loadToolConfigs(): Record<string, ToolConfig> {
  const dir = findToolDir();
  if (!dir) {
    console.warn("[tool-configs] no config/tools directory found; running with empty registry");
    return {};
  }

  const out: Record<string, ToolConfig> = {};
  for (const file of fs.readdirSync(dir)) {
    if (!file.endsWith(".yaml")) continue;
    const raw = fs.readFileSync(path.join(dir, file), "utf-8");
    try {
      const cfg = parseYaml(raw) as ToolConfig;
      if (!cfg?.name) continue;
      if (cfg.name !== file.replace(/\.yaml$/, "")) {
        console.warn(`[tool-configs] ${file} name mismatch, skipping`);
        continue;
      }
      out[cfg.name] = cfg;
    } catch (e) {
      console.warn(`[tool-configs] failed to parse ${file}:`, e);
    }
  }
  return out;
}

export function toPublicToolDescriptor(t: ToolConfig) {
  return {
    name: t.name,
    description: t.description,
    risk: t.risk,
    access: t.access,
    requiresConfirm: t.requiresConfirm,
    supportsDryRun: t.supportsDryRun,
    maxRows: t.maxRows,
    rateLimitPerMin: t.rateLimitPerMin,
    tags: t.tags ?? [],
    input: t.input ?? {},
    output: t.output ?? {},
  };
}
