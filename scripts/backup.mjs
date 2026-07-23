// Snapshots the core content tables to backups/<date>/*.json. Run locally with
// the service-role key, or via the scheduled GitHub Actions workflow
// (.github/workflows/backup.yml):
//
//   npm run backup
//
// Reads SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY from .env (via dotenv) or the
// environment. Safe to re-run — each run writes to its own dated folder.
import "dotenv/config";
import { createClient } from "@supabase/supabase-js";
import fs from "fs";
import path from "path";

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  console.error("Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY — copy .env.example to .env and fill them in.");
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

// Core content only — skips search_misses (ephemeral analytics) and editors
// (auth.users references that wouldn't mean anything restored elsewhere).
const TABLES = ["resources", "schedule", "connections", "locations", "saved_views"];

async function main() {
  const dir = path.join("backups", new Date().toISOString().slice(0, 10));
  fs.mkdirSync(dir, { recursive: true });

  let failed = false;
  for (const table of TABLES) {
    const { data, error } = await supabase.from(table).select("*");
    if (error) {
      console.error(`Failed to fetch "${table}":`, error.message);
      failed = true;
      continue;
    }
    fs.writeFileSync(path.join(dir, `${table}.json`), JSON.stringify(data, null, 2));
    console.log(`Backed up ${data.length} row(s) from "${table}"`);
  }

  if (failed) process.exit(1);
}

main();
