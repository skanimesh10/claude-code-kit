/**
 * `cc-kit status` command — checks skill installation status across all
 * saved targets. Reports hash-based status for canonical skills and
 * symlink status for IDE targets.
 */

import { existsSync, readdirSync, lstatSync, readlinkSync } from "fs";
import { join, relative } from "path";
import ora from "ora";
import { SKILLS_DIR } from "../lib/config.js";
import { readLockfile } from "../lib/lockfile.js";
import { computeHash } from "../lib/skills.js";
import { TARGETS, LOCALAGENT_DIR, CANONICAL_SKILLS_DIR } from "../lib/targets.js";
import { bold, dim, cyan, green, red, yellow, icons } from "../lib/colors.js";

export function status(options) {
  const spinner = ora("Checking skills status...").start();

  const lock = readLockfile();
  const lockedNames = new Set(Object.keys(lock.skills));
  const targetKeys = lock.targets || ["claude"];

  // Get on-disk skill directories from canonical location
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

  spinner.stop();

  // Canonical skills status
  console.log(bold("\nSkills status:\n"));
  for (const name of allNames) {
    const inLock = lockedNames.has(name);
    const onDisk = diskSet.has(name);

    if (inLock && !onDisk) {
      console.log(`  ${name}  ${red("MISSING")}`);
    } else if (!inLock && onDisk) {
      console.log(`  ${name}  ${yellow("UNTRACKED")}`);
    } else {
      const hash = computeHash(join(SKILLS_DIR, name));
      if (hash !== lock.skills[name].computedHash) {
        console.log(`  ${name}  ${yellow("MODIFIED")}`);
      } else {
        console.log(`  ${name}  ${green("OK")}`);
      }
    }
  }

  // Per-target symlink status
  console.log(bold("\nTargets:\n"));
  for (const targetKey of targetKeys) {
    const target = TARGETS[targetKey];
    if (!target) continue;

    const issues = [];
    for (const name of allNames) {
      if (!lockedNames.has(name)) continue;

      let linkPath, expectedSource;
      if (targetKey === "claude") {
        linkPath = join(target.ideDir, name);
        expectedSource = join(CANONICAL_SKILLS_DIR, name);
      } else if (target.symlinkType === "file") {
        const fileName = `${name}${target.ext}`;
        linkPath = join(target.ideDir, fileName);
        expectedSource = join(LOCALAGENT_DIR, target.localDir, fileName);
      } else {
        linkPath = join(target.ideDir, name);
        expectedSource = join(LOCALAGENT_DIR, target.localDir, name);
      }

      if (!existsSync(linkPath)) {
        issues.push(`    ${name}  ${red("MISSING SYMLINK")}`);
      } else if (!isValidSymlink(linkPath, expectedSource)) {
        issues.push(`    ${name}  ${yellow("BAD SYMLINK")}`);
      }
    }

    if (issues.length === 0) {
      console.log(`  ${target.name} ${icons.arrow} ${target.ideDir}  ${green("OK")}`);
    } else {
      console.log(`  ${target.name} ${icons.arrow} ${target.ideDir}`);
      for (const issue of issues) {
        console.log(issue);
      }
    }
  }

  console.log(dim(`\n${allNames.length} skills, ${targetKeys.length} target(s).`));
}

function isValidSymlink(linkPath, expectedSource) {
  try {
    const stat = lstatSync(linkPath);
    if (!stat.isSymbolicLink()) return false;
    const linkTarget = readlinkSync(linkPath);
    // Check if it resolves to the expected relative path
    const expectedRel = relative(join(linkPath, ".."), expectedSource);
    return linkTarget === expectedRel;
  } catch {
    return false;
  }
}
