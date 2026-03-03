/**
 * `cc-kit status` command — compares the lockfile against on-disk skills
 * and reports one of four states per skill:
 *   ok        — locked and on disk with matching hash
 *   MISSING   — in lockfile but not on disk
 *   UNTRACKED — on disk but not in lockfile
 *   MODIFIED  — on disk but hash differs from lockfile
 */

import { existsSync, readdirSync } from "fs";
import { join } from "path";
import { SKILLS_DIR } from "../lib/config.js";
import { readLockfile } from "../lib/lockfile.js";
import { computeHash } from "../lib/skills.js";

export function status() {
  const lock = readLockfile();
  const lockedNames = new Set(Object.keys(lock.skills));

  // Get on-disk skill directories
  let diskNames = [];
  if (existsSync(SKILLS_DIR)) {
    diskNames = readdirSync(SKILLS_DIR, { withFileTypes: true })
      .filter((e) => e.isDirectory())
      .map((e) => e.name);
  }
  const diskSet = new Set(diskNames);

  const allNames = [...new Set([...lockedNames, ...diskSet])].sort();

  if (allNames.length === 0) {
    console.log("No skills installed. Run `cc-kit init` to get started.");
    return;
  }

  console.log("Skills status:\n");
  for (const name of allNames) {
    const inLock = lockedNames.has(name);
    const onDisk = diskSet.has(name);

    if (inLock && !onDisk) {
      // Recorded in lockfile but directory was deleted
      console.log(`  ${name}  MISSING`);
    } else if (!inLock && onDisk) {
      // Directory exists but wasn't installed by cc-kit
      console.log(`  ${name}  UNTRACKED`);
    } else {
      const hash = computeHash(join(SKILLS_DIR, name));
      if (hash !== lock.skills[name].computedHash) {
        console.log(`  ${name}  MODIFIED`);
      } else {
        console.log(`  ${name}  ok`);
      }
    }
  }

  console.log(`\n${allNames.length} skills total.`);
}
