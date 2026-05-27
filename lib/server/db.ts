import Database from "better-sqlite3";
import path from "path";

let db: Database.Database;

function getDbPath(): string {
  return path.join(process.cwd(), "data", "app.db");
}

export function getDb(): Database.Database {
  if (db) return db;

  const fs = require("fs");
  const dir = path.join(process.cwd(), "data");
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }

  db = new Database(getDbPath());
  db.pragma("journal_mode = WAL");
  db.pragma("foreign_keys = ON");

  runMigrations(db);

  return db;
}

function runMigrations(database: Database.Database) {
  database.exec(`
    CREATE TABLE IF NOT EXISTS tickets (
      id TEXT PRIMARY KEY,
      user_email TEXT,
      subject TEXT NOT NULL,
      description TEXT NOT NULL,
      category TEXT,
      priority TEXT DEFAULT 'medium',
      status TEXT DEFAULT 'open',
      resolution TEXT,
      agent_id TEXT,
      created_at INTEGER NOT NULL,
      updated_at INTEGER NOT NULL,
      resolved_at INTEGER
    );

    CREATE TABLE IF NOT EXISTS knowledge_base (
      id TEXT PRIMARY KEY,
      title TEXT NOT NULL,
      content TEXT NOT NULL,
      category TEXT,
      tags TEXT,
      created_at INTEGER NOT NULL
    );

    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      email TEXT UNIQUE,
      name TEXT,
      face_embedding TEXT,
      google_refresh_token TEXT,
      google_access_token TEXT,
      google_token_expiry INTEGER,
      verified INTEGER DEFAULT 0,
      created_at INTEGER NOT NULL
    );

    CREATE TABLE IF NOT EXISTS conversation_logs (
      id TEXT PRIMARY KEY,
      user_id TEXT,
      agent_id TEXT,
      transcript TEXT,
      tools_called TEXT,
      created_at INTEGER NOT NULL
    );

    CREATE TABLE IF NOT EXISTS verification_sessions (
      id TEXT PRIMARY KEY,
      channel_name TEXT NOT NULL,
      student_name TEXT,
      student_id TEXT,
      status TEXT DEFAULT 'pending',
      method TEXT DEFAULT 'face',
      confidence REAL,
      image_data TEXT,
      created_at INTEGER NOT NULL,
      completed_at INTEGER
    );

    CREATE TABLE IF NOT EXISTS documents (
      id TEXT PRIMARY KEY,
      doc_type TEXT NOT NULL,
      title TEXT NOT NULL,
      description TEXT,
      file_data TEXT,
      file_name TEXT,
      mime_type TEXT,
      status TEXT DEFAULT 'available',
      created_at INTEGER NOT NULL
    );
  `);
}

export function closeDb() {
  if (db) {
    db.close();
  }
}