import Database from "better-sqlite3";
import path from "path";
import { runMigrations } from "./migrations";

const DB_PATH =
  process.env.DB_PATH || path.join(__dirname, "..", "..", "data", "streams.db");

let db: any;

export function getDb(): any {
  if (!db) {
    throw new Error("Database not initialized. Call initDb() first.");
  }
  return db;
}

export function initDb(): void {
  const dir = path.dirname(DB_PATH);
  const fs = require("fs");
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }

  db = new Database(DB_PATH);
  // WAL mode: better concurrency, allows readers and writers in parallel
  db.pragma("journal_mode = WAL");
  // Foreign keys: enforce referential integrity
  db.pragma("foreign_keys = ON");
  // Balanced durability/performance: fsync on commit but not every write
  db.pragma("synchronous = NORMAL");
  // Prevent SQLITE_BUSY errors during concurrent writes by waiting up to 5 seconds
  db.pragma("busy_timeout = 5000");
  // 64MB page cache for improved read performance
  db.pragma("cache_size = -64000");



}

export function getAllowedAssets(): string[] {
  try {
    const rows = db.prepare("SELECT code FROM allowed_assets").all() as Array<{ code: string }>;
    return rows.map((r) => r.code);
  } catch {
    return [];
  }
}

export function addAllowedAsset(code: string): void {
  db.prepare("INSERT OR IGNORE INTO allowed_assets (code) VALUES (?)").run(code.trim().toUpperCase());
}

export function removeAllowedAsset(code: string): void {
  db.prepare("DELETE FROM allowed_assets WHERE code = ?").run(code.trim().toUpperCase());
}
