/**
 * 启动本地嵌入式 PostgreSQL（开发环境用）
 * 用法: node scripts/start-embedded-postgres.cjs
 * 数据目录: /tmp/medical-crm-pgdata
 */
const EmbeddedPostgres = require("embedded-postgres").default;
const path = require("path");
const fs = require("fs");

const PG_DATA = path.join("/tmp", "medical-crm-pgdata");
const PG_PORT = 5432;
const PG_USER = "devuser";
const PG_PASSWORD = "devpass";
const PG_DB = "medical_crm";

async function main() {
  console.log("[PG] Starting embedded PostgreSQL...");
  console.log("[PG] Data dir:", PG_DATA);

  const pg = new EmbeddedPostgres({
    databaseDir: PG_DATA,
    user: PG_USER,
    password: PG_PASSWORD,
    port: PG_PORT,
    persistent: true,
  });

  try {
    await pg.initialise();
    console.log("[PG] Initialised");
    await pg.start();
    console.log("[PG] Started on port", PG_PORT);

    // Create the database if it doesn't exist
    try {
      const client = pg.getPgClient();
      await client.connect();
      const result = await client.query(
        `SELECT 1 FROM pg_database WHERE datname='${PG_DB}'`
      );
      if (result.rowCount === 0) {
        await client.query(`CREATE DATABASE ${PG_DB}`);
        console.log("[PG] Created database:", PG_DB);
      } else {
        console.log("[PG] Database already exists:", PG_DB);
      }
      await client.end();
    } catch (e) {
      console.warn("[PG] DB create warning:", e.message);
    }

    console.log(
      `[PG] Ready! Connection: postgresql://${PG_USER}:${PG_PASSWORD}@localhost:${PG_PORT}/${PG_DB}`
    );
    console.log("[PG] Press Ctrl+C to stop");

    process.on("SIGINT", async () => {
      console.log("\n[PG] Stopping...");
      await pg.stop();
      process.exit(0);
    });
    process.on("SIGTERM", async () => {
      await pg.stop();
      process.exit(0);
    });

    // Keep alive
    await new Promise(() => {});
  } catch (err) {
    console.error("[PG] Failed:", err.message);
    if (err.message?.includes("already")) {
      console.log("[PG] PostgreSQL may already be running on port", PG_PORT);
    }
    process.exit(1);
  }
}

main();
