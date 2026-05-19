/**
 * 直接运行 drizzle 迁移 SQL 文件（绕过 drizzle-kit 工具链）
 */
const postgres = require("postgres");
const fs = require("fs");
const path = require("path");

const DB_URL =
  process.env.DATABASE_URL ||
  "postgresql://beautyos:beautyos@localhost:5432/beautyos";

const DRIZZLE_DIR = path.join(__dirname, "../drizzle");
const JOURNAL_PATH = path.join(DRIZZLE_DIR, "meta", "_journal.json");

function discoverMigrations() {
  if (!fs.existsSync(JOURNAL_PATH)) {
    throw new Error(`Drizzle journal not found at ${JOURNAL_PATH}`);
  }
  const journal = JSON.parse(fs.readFileSync(JOURNAL_PATH, "utf8"));
  const entries = Array.isArray(journal.entries) ? journal.entries : [];
  entries.sort((a, b) => a.idx - b.idx);
  return entries.map((e) => `${e.tag}.sql`);
}

const MIGRATIONS = discoverMigrations();
console.log(
  `[Migration] Discovered ${MIGRATIONS.length} migrations from journal: ${MIGRATIONS[0]} … ${MIGRATIONS[MIGRATIONS.length - 1]}`
);

async function runMigrations() {
  const sql = postgres(DB_URL, { max: 1 });

  try {
    // Create migration tracking table
    await sql`
      CREATE TABLE IF NOT EXISTS __drizzle_migrations (
        id serial PRIMARY KEY,
        name varchar(255) UNIQUE NOT NULL,
        applied_at timestamp DEFAULT now()
      )
    `;
    console.log("[Migration] Tracking table ready");

    for (const file of MIGRATIONS) {
      // Check if already applied
      const applied =
        await sql`SELECT 1 FROM __drizzle_migrations WHERE name = ${file}`;
      if (applied.length > 0) {
        console.log(`[Migration] SKIP (already applied): ${file}`);
        continue;
      }

      const filePath = path.join(DRIZZLE_DIR, file);
      if (!fs.existsSync(filePath)) {
        console.warn(`[Migration] MISSING FILE: ${file}`);
        continue;
      }

      const sqlContent = fs.readFileSync(filePath, "utf8");
      // Split on --> statement-breakpoint
      const statements = sqlContent
        .split("--> statement-breakpoint")
        .map((s) => s.trim())
        .filter(Boolean);

      console.log(
        `[Migration] APPLYING: ${file} (${statements.length} statements)`
      );

      for (let i = 0; i < statements.length; i++) {
        const stmt = statements[i];
        if (!stmt) continue;
        try {
          await sql.unsafe(stmt);
        } catch (e) {
          // Tolerate idempotency-friendly errors so this runner can heal a DB
          // that was previously applied out-of-band (e.g. via raw psql).
          const msg = e.message || "";
          const idempotent =
            msg.includes("already exists") ||
            msg.includes("duplicate") ||
            msg.includes("does not exist"); // DROP TABLE/CONSTRAINT/INDEX IF NOT EXISTS not always supported
          if (idempotent) {
            console.log(`  stmt ${i + 1}: idempotent skip (${msg.split("\n")[0]})`);
          } else {
            console.error(`  stmt ${i + 1} FAILED:`, e.message);
            console.error("  SQL:", stmt.substring(0, 200));
            throw e;
          }
        }
      }

      // Mark as applied
      await sql`INSERT INTO __drizzle_migrations (name) VALUES (${file})`;
      console.log(`[Migration] DONE: ${file}`);
    }

    console.log("\n✅ All migrations applied successfully");
  } catch (e) {
    console.error("\n❌ Migration failed:", e.message);
    process.exit(1);
  } finally {
    await sql.end();
  }
}

runMigrations();
