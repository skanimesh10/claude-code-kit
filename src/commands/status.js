/**
 * `cc-kit status` command — compares the lockfile against on-disk skills
 * and reports one of four states per skill:
 *   OK        — locked and on disk with matching hash
 *   MISSING   — in lockfile but not on disk
 *   UNTRACKED — on disk but not in lockfile
 *   MODIFIED  — on disk but hash differs from lockfile
 */

import { existsSync, readdirSync } from "fs";
import { join } from "path";
import ora from "ora";
import { SKILLS_DIR } from "../lib/config.js";
import { readLockfile } from "../lib/lockfile.js";
import { computeHash } from "../lib/skills.js";
import { bold, dim, cyan, green, red, yellow, icons } from "../lib/colors.js";

export function status() {
  const spinner = ora("Checking skills status...").start();

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
    spinner.stop();
    console.log(`${icons.warn} ${yellow("No skills installed.")} Run ${cyan("cc-kit init")} to get started.`);
    return;
  }

  const rows = [];
  for (const name of allNames) {
    const inLock = lockedNames.has(name);
    const onDisk = diskSet.has(name);

    if (inLock && !onDisk) {
      rows.push(`  ${name}  ${red("MISSING")}`);
    } else if (!inLock && onDisk) {
      rows.push(`  ${name}  ${yellow("UNTRACKED")}`);
    } else {
      const hash = computeHash(join(SKILLS_DIR, name));
      if (hash !== lock.skills[name].computedHash) {
        rows.push(`  ${name}  ${yellow("MODIFIED")}`);
      } else {
        rows.push(`  ${name}  ${green("OK")}`);
      }
    }
  }

  spinner.stop();

  console.log(bold("Skills status:\n"));
  for (const row of rows) {
    console.log(row);
  }

  console.log(dim(`\n${allNames.length} skills total.`));
}
