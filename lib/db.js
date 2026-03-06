// lib/db.js — SQLite 연결 (서버사이드 전용)
let db = null;

export function getDb() {
  if (db) return db;
  const Database = require("better-sqlite3");
  const path = require("path");
  const dbPath = path.join(process.cwd(), "gyeonghak.db");
  db = new Database(dbPath, { readonly: true });
  return db;
}
