// One-time data load into a fresh Supabase project. Run locally with the service-role
// key (never ship that key to the browser — anon key only in the frontend):
//
//   npm run migrate-seed
//
// Reads SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY from .env (via dotenv) or the
// environment. Safe to re-run: resources upsert on id, schedule/connections are
// cleared per-resource before reinsertion so re-running doesn't duplicate rows.
import "dotenv/config";
import { createClient } from "@supabase/supabase-js";
import { SEED } from "../src/seedData.js";

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  console.error("Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY — copy .env.example to .env and fill them in.");
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

async function main() {
  for (const r of SEED) {
    const { schedule, connections, issues, barriers, secondaryCategories, verifiedDate, editedBy, editedDate, ...rest } = r;

    const { error: resourceError } = await supabase.from("resources").upsert({
      ...rest,
      secondary_categories: secondaryCategories || [],
      issues: issues || [],
      barriers: barriers || [],
      verified_date: verifiedDate,
      edited_by: editedBy || "",
      edited_date: editedDate,
    });
    if (resourceError) {
      console.error(`Failed to upsert resource "${r.id}":`, resourceError.message);
      continue;
    }

    // Re-runnable: clear this resource's schedule/connections before reinserting.
    await supabase.from("schedule").delete().eq("resource_id", r.id);
    if (schedule?.length) {
      const { error } = await supabase.from("schedule").insert(
        schedule.map((s) => ({ resource_id: r.id, day: s.day, time: s.time, label: s.label, frequency: s.frequency }))
      );
      if (error) console.error(`Failed to insert schedule for "${r.id}":`, error.message);
    }

    await supabase.from("connections").delete().eq("resource_id", r.id);
    if (connections?.length) {
      const { error } = await supabase.from("connections").insert(
        connections.map((cid) => ({ resource_id: r.id, connected_resource_id: cid }))
      );
      if (error) console.error(`Failed to insert connections for "${r.id}":`, error.message);
    }

    console.log(`Migrated: ${r.name}`);
  }
  console.log(`\nDone — migrated ${SEED.length} resources.`);
}

main();
