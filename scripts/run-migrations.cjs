/**
 * 直接运行 drizzle 迁移 SQL 文件（绕过 drizzle-kit 工具链）
 */
const postgres = require("postgres");
const fs = require("fs");
const path = require("path");

const DB_URL =
  process.env.DATABASE_URL ||
  "postgresql://devuser:devpass@localhost:5432/medical_crm";

// 按 journal 顺序排列的迁移文件
const MIGRATIONS = [
  "0000_cooing_union_jack.sql",
  "0001_tan_stellaris.sql",
  "0002_bizarre_meteorite.sql",
  "0003_hot_eddie_brock.sql",
  "0004_add_leads_hood_birthday_holidays.sql",
  "0005_bored_hardball.sql",
  "0006_nice_anthem.sql",
  "0007_lively_namor.sql",
];

const DRIZZLE_DIR = path.join(__dirname, "../drizzle");

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
          // Ignore "already exists" errors (idempotent)
          if (
            e.message?.includes("already exists") ||
            e.message?.includes("duplicate")
          ) {
            console.log(`  stmt ${i + 1}: already exists, skip`);
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
