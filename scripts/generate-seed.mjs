// One-off generator: turns src/data/roadmapProjects.js into
// supabase/seed.sql's INSERT statements, escaping string content
// properly instead of hand-typing SQL (this file's data includes
// apostrophes like "doesn't"). Not part of the app's runtime — run it
// manually only if you change the starter catalog and want to
// regenerate the seed file:
//
//   node scripts/generate-seed.mjs > supabase/seed.sql

import roadmapProjects from "../src/data/roadmapProjects.js";

const str = (s) => `'${String(s).replace(/'/g, "''")}'`;
const arr = (list) => `ARRAY[${(list || []).map(str).join(", ")}]::text[]`;

const header = `-- Starter project catalog for DevPulse's Projects feature.
-- Generated from src/data/roadmapProjects.js by scripts/generate-seed.mjs.
-- Run this in the Supabase SQL Editor AFTER supabase/schema.sql.
-- Safe to re-run: it skips rows whose slug already exists.

`;

const rows = roadmapProjects
  .map(
    (p) => `insert into projects
  (slug, title, category, difficulty, roles, tags, short_description, full_description, requirements, constraints)
values
  (${str(p.slug)}, ${str(p.title)}, ${str(p.category)}, ${str(p.difficulty)}, ${arr(p.roles)}, ${arr(p.tags)},
   ${str(p.shortDescription)}, ${str(p.fullDescription)}, ${arr(p.requirements)}, ${arr(p.constraints)})
on conflict (slug) do nothing;
`
  )
  .join("\n");

process.stdout.write(header + rows);
