import { writeFileSync, mkdirSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, "..");
const backupDir = join(root, "supabase", "backups", "pre-cleanup");
mkdirSync(backupDir, { recursive: true });

console.log("Saving full backup files to:", backupDir);
