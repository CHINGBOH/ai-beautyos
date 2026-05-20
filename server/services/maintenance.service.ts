/**
 * Maintenance Service — Phase 4: Hermes 受控服务器操作（只读部分）
 *
 * 提供日志查看、服务状态、仓库文件读取三类只读运维工具。
 * 所有路径均有白名单限制，不暴露任意文件系统访问。
 */

import fs from "node:fs";
import path from "node:path";
import { execSync } from "node:child_process";

// ── 路径白名单 ──────────────────────────────────────────────────────────

const REPO_ROOT = path.resolve(import.meta.dirname, "../..");
const ALLOWED_READ_DIRS = [
  path.join(REPO_ROOT, "server"),
  path.join(REPO_ROOT, "config"),
  path.join(REPO_ROOT, "docs"),
  path.join(REPO_ROOT, "scripts"),
];
const ALLOWED_READ_EXTENSIONS = [
  ".ts", ".js", ".json", ".yaml", ".yml", ".md", ".txt", ".sh", ".sql",
  ".env.example", ".css", ".html",
];

function isAllowedPath(target: string): string | null {
  const resolved = path.resolve(REPO_ROOT, target);
  // No traversal outside repo
  if (!resolved.startsWith(REPO_ROOT)) return null;
  // Check allowed directories
  if (!ALLOWED_READ_DIRS.some(dir => resolved.startsWith(dir))) return null;
  // Check allowed extensions
  if (!ALLOWED_READ_EXTENSIONS.some(ext => resolved.endsWith(ext))) return null;
  return resolved;
}

// ── 日志查看 ────────────────────────────────────────────────────────────

const LOG_CANDIDATES = [
  "/tmp/beautyos-server.log",
  path.join(REPO_ROOT, "beautyos-server.log"),
];

function findLogFile(): string | null {
  for (const p of LOG_CANDIDATES) {
    if (fs.existsSync(p)) return p;
  }
  return null;
}

export async function readLog(lines = 50, filter?: string) {
  const logFile = findLogFile();
  if (!logFile) {
    return { available: false, path: LOG_CANDIDATES.join(" or "), lines: [], message: "日志文件不存在" };
  }

  try {
    const content = fs.readFileSync(logFile, "utf-8");
    let allLines = content.split("\n").filter(Boolean);
    if (filter) {
      const lower = filter.toLowerCase();
      allLines = allLines.filter(l => l.toLowerCase().includes(lower));
    }
    const recent = allLines.slice(-Math.min(lines, 200));

    return {
      available: true,
      path: logFile,
      totalLines: content.split("\n").length,
      matchedLines: allLines.length,
      lines: recent,
      truncated: allLines.length > lines,
    };
  } catch (e) {
    return { available: false, path: logFile, error: (e as Error).message };
  }
}

// ── 服务状态 ────────────────────────────────────────────────────────────

export async function checkStatus() {
  const checks: Array<{ name: string; ok: boolean; detail: string }> = [];

  // 1. Node process
  try {
    const pid = process.pid;
    checks.push({ name: "server_process", ok: true, detail: `PID ${pid}, uptime ${Math.floor(process.uptime())}s` });
  } catch {
    checks.push({ name: "server_process", ok: false, detail: "unknown" });
  }

  // 2. Memory usage
  const mem = process.memoryUsage();
  checks.push({
    name: "memory",
    ok: mem.heapUsed < 512 * 1024 * 1024,
    detail: `heap ${Math.round(mem.heapUsed / 1024 / 1024)}MB / rss ${Math.round(mem.rss / 1024 / 1024)}MB`,
  });

  // 3. Git commit
  try {
    const sha = execSync("git rev-parse --short HEAD", { cwd: REPO_ROOT, timeout: 5000 }).toString().trim();
    checks.push({ name: "git_commit", ok: true, detail: sha });
  } catch {
    checks.push({ name: "git_commit", ok: false, detail: "unavailable" });
  }

  // 4. Docker status (if applicable)
  try {
    const containers = execSync("docker ps --format '{{.Names}}' 2>/dev/null", { timeout: 5000 }).toString().trim();
    const beautyContainers = containers.split("\n").filter(c => c.includes("beauty"));
    checks.push({
      name: "docker_containers",
      ok: beautyContainers.length > 0,
      detail: beautyContainers.length > 0 ? `running: ${beautyContainers.join(", ")}` : "no beauty containers running",
    });
  } catch {
    checks.push({ name: "docker_containers", ok: false, detail: "docker unavailable" });
  }

  const allOk = checks.every(c => c.ok);

  return {
    timestamp: new Date().toISOString(),
    healthy: allOk,
    checks,
  };
}

// ── 仓库文件读取 ────────────────────────────────────────────────────────

export async function readRepoFile(target: string) {
  const resolved = isAllowedPath(target);
  if (!resolved) {
    return {
      ok: false,
      error: `路径不在白名单中：${target}`,
      allowedPaths: ALLOWED_READ_DIRS.map(d => path.relative(REPO_ROOT, d)),
    };
  }

  try {
    const stat = fs.statSync(resolved);
    if (stat.size > 100 * 1024) {
      return { ok: false, error: `文件过大 (${Math.round(stat.size / 1024)}KB)，上限 100KB` };
    }

    const content = fs.readFileSync(resolved, "utf-8");
    return {
      ok: true,
      path: path.relative(REPO_ROOT, resolved),
      size: stat.size,
      lines: content.split("\n").length,
      content,
    };
  } catch (e) {
    return { ok: false, error: (e as Error).message };
  }
}

// ── 4.2 低风险开发辅助 ──────────────────────────────────────────────────

export async function getGitStatus() {
  try {
    const status = execSync("git status --short", { cwd: REPO_ROOT, timeout: 5000 }).toString().trim();
    const branch = execSync("git branch --show-current", { cwd: REPO_ROOT, timeout: 5000 }).toString().trim();
    const log = execSync("git log --oneline -5", { cwd: REPO_ROOT, timeout: 5000 }).toString().trim();

    return {
      ok: true,
      branch,
      dirty: status.length > 0,
      changes: status ? status.split("\n") : [],
      recentCommits: log.split("\n"),
    };
  } catch (e) {
    return { ok: false, error: (e as Error).message };
  }
}

export async function getGitDiff(pathspec?: string) {
  try {
    const args = ["--no-color"];
    if (pathspec) {
      // Path must be within allowed directories
      const parts = pathspec.split(" ");
      for (const p of parts) {
        const resolved = path.resolve(REPO_ROOT, p);
        if (!resolved.startsWith(REPO_ROOT)) {
          return { ok: false, error: `路径不在仓库内：${p}` };
        }
      }
      args.push("--", ...pathspec.split(" "));
    }
    const diff = execSync(`git diff ${args.join(" ")}`, { cwd: REPO_ROOT, timeout: 10000 }).toString().trim();
    const stat = execSync(`git diff --stat ${args.join(" ")}`, { cwd: REPO_ROOT, timeout: 10000 }).toString().trim();

    return {
      ok: true,
      diff: diff || "(no changes)",
      stat: stat || "(no changes)",
    };
  } catch (e) {
    return { ok: false, error: (e as Error).message };
  }
}

export async function runTests(suite?: string) {
  const packageJsonPath = path.join(REPO_ROOT, "package.json");
  if (!fs.existsSync(packageJsonPath)) {
    return { ok: false, error: "package.json not found" };
  }

  const pkg = JSON.parse(fs.readFileSync(packageJsonPath, "utf-8"));
  if (!pkg.scripts?.test) {
    return { ok: false, error: 'no "test" script in package.json' };
  }

  const testCmd = suite
    ? `npm test -- ${suite}`
    : "npm test";

  try {
    const output = execSync(testCmd, { cwd: REPO_ROOT, timeout: 120000, maxBuffer: 500 * 1024 }).toString();
    return {
      ok: true,
      command: testCmd,
      output: output.slice(-5000), // last 5KB
      outputLines: output.split("\n").length,
      truncated: output.length > 5000,
    };
  } catch (e: any) {
    const output = e.stdout?.toString() || "";
    const errOutput = e.stderr?.toString() || "";
    return {
      ok: false,
      command: testCmd,
      error: e.message,
      output: (output + errOutput).slice(-5000),
      exitCode: e.status,
    };
  }
}

// ── 4.3 白名单脚本执行 ──────────────────────────────────────────────────

const WHITELIST_SCRIPTS_DIR = path.join(REPO_ROOT, "scripts");
const WHITELIST_SCRIPTS = [
  "daily-report.sh",
  "silent-customer-patrol.sh",
  "content-topics.sh",
  "todo-draft.sh",
];

export async function runWhitelistScript(name: string) {
  if (!WHITELIST_SCRIPTS.includes(name)) {
    return {
      ok: false,
      error: `脚本不在白名单中：${name}`,
      whitelist: WHITELIST_SCRIPTS,
    };
  }

  const scriptPath = path.join(WHITELIST_SCRIPTS_DIR, name);
  if (!fs.existsSync(scriptPath)) {
    return { ok: false, error: `脚本不存在：${scriptPath}` };
  }

  try {
    const output = execSync(`bash ${scriptPath}`, { cwd: REPO_ROOT, timeout: 60000, maxBuffer: 200 * 1024 }).toString();
    return {
      ok: true,
      script: name,
      output: output.slice(-10000),
      outputLines: output.split("\n").length,
    };
  } catch (e: any) {
    return {
      ok: false,
      script: name,
      error: e.message,
      output: (e.stdout?.toString() || "").slice(-5000),
      exitCode: e.status,
    };
  }
}
