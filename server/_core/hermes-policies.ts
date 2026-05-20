import fs from "node:fs";
import path from "node:path";
import { parse as parseYaml } from "yaml";
import type { ToolConfig } from "./tool-configs";

type Policy = {
  schemaVersion: string;
  mode: string;
  allowedTools?: string[];
  forbiddenTools?: string[];
  confirmRequired?: string[];
};

export type PolicyDecision =
  | { decision: "allow"; policyId?: string }
  | { decision: "deny"; policyId?: string; reason: string; rulePath: string }
  | { decision: "require_confirm"; policyId: string; reason: string; rulePath: string };

const POLICY_DIR_CANDIDATES = [
  path.resolve(process.cwd(), "config/policies/hermes"),
  path.resolve(import.meta.dirname, "../../config/policies/hermes"),
  path.resolve(import.meta.dirname, "../config/policies/hermes"),
];

const AGENT_POLICY_FILES: Array<{ test: (agentId: string) => boolean; file: string }> = [
  { test: agentId => agentId === "hermes-app-business-v1" || agentId.startsWith("hermes-app-"), file: "content-operator.yaml" },
  { test: agentId => agentId === "hermes-ops-deployer-v1" || agentId.startsWith("hermes-ops-"), file: "ops-deployer.yaml" },
  { test: agentId => agentId === "hermes-sales-assistant-v1" || agentId.startsWith("hermes-sales-"), file: "sales-assistant.yaml" },
];

const policyCache = new Map<string, Policy | null>();

function findPolicyDir(): string | null {
  for (const p of POLICY_DIR_CANDIDATES) {
    if (fs.existsSync(p)) return p;
  }
  return null;
}

function loadPolicy(file: string): Policy | null {
  const cached = policyCache.get(file);
  if (cached !== undefined) return cached;

  const dir = findPolicyDir();
  if (!dir) {
    console.warn("[hermes-policies] no config/policies/hermes directory found");
    policyCache.set(file, null);
    return null;
  }

  try {
    const raw = fs.readFileSync(path.join(dir, file), "utf-8");
    const policy = parseYaml(raw) as Policy;
    policyCache.set(file, policy);
    return policy;
  } catch (e) {
    console.warn(`[hermes-policies] failed to parse ${file}:`, e);
    policyCache.set(file, null);
    return null;
  }
}

function policyForAgent(agentId: string): { policyId: string; policy: Policy } | null {
  const match = AGENT_POLICY_FILES.find(item => item.test(agentId));
  if (!match) return null;
  const policy = loadPolicy(match.file);
  if (!policy) return null;
  return { policyId: match.file.replace(/\.yaml$/, ""), policy };
}

function wildcardMatch(pattern: string, value: string): boolean {
  if (pattern === "*") return true;
  const escaped = pattern.replace(/[.+?^${}()|[\]\\]/g, "\\$&").replace(/\*/g, ".*");
  return new RegExp(`^${escaped}$`).test(value);
}

function matchesAny(patterns: string[] | undefined, values: string[]): string | null {
  for (const pattern of patterns ?? []) {
    if (values.some(value => wildcardMatch(pattern, value))) return pattern;
  }
  return null;
}

export function evaluateHermesToolPolicy(input: {
  agentId: string;
  toolName: string;
  toolConfig: ToolConfig;
  confirmed: boolean;
}): PolicyDecision {
  const { agentId, toolName, toolConfig, confirmed } = input;

  if (!agentId.startsWith("hermes-")) return { decision: "allow" };

  const resolved = policyForAgent(agentId);
  if (!resolved) {
    return {
      decision: "deny",
      reason: `No server-side Hermes policy mapped for agent '${agentId}'`,
      rulePath: "agent.policy",
    };
  }

  const { policyId, policy } = resolved;
  const values = [toolName, ...(toolConfig.tags ?? [])];
  const forbiddenPattern = matchesAny(policy.forbiddenTools, values);
  if (forbiddenPattern) {
    return {
      decision: "deny",
      policyId,
      reason: `Tool '${toolName}' is forbidden by policy '${policy.mode}' (${forbiddenPattern})`,
      rulePath: `policies.${policy.mode}.forbiddenTools`,
    };
  }

  const allowedPattern = matchesAny(policy.allowedTools, values);
  if (!allowedPattern) {
    return {
      decision: "deny",
      policyId,
      reason: `Tool '${toolName}' is not allowed by policy '${policy.mode}'`,
      rulePath: `policies.${policy.mode}.allowedTools`,
    };
  }

  const confirmPattern = matchesAny(policy.confirmRequired, values);
  if (confirmPattern && !confirmed) {
    return {
      decision: "require_confirm",
      policyId,
      reason: `Tool '${toolName}' requires confirmation by policy '${policy.mode}'`,
      rulePath: `policies.${policy.mode}.confirmRequired`,
    };
  }

  return { decision: "allow", policyId };
}
