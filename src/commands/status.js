/**
 * `cc-kit status` command -- checks skill installation status by comparing
 * lockfile hashes against on-disk content, and validates symlink health
 * for saved targets (e.g. Claude Code).
 */

import { existsSync, readdirSync, lstatSync, readlinkSync } from "fs";
import { join, relative } from "path";
import ora from "ora";
import { SKILLS_DIR } from "../lib/config.js";
import { readLockfile } from "../lib/lockfile.js";
import { computeHash } from "../lib/skills.js";
import { TARGETS } from "../lib/targets.js";
import { bold, dim, cyan, green, red, yellow, icons } from "../lib/colors.js";

/**
 * Run the status command. Reports per-skill status (OK, MISSING, UNTRACKED,
 * MODIFIED) and per-target symlink health.
 */
export function status() {
  const spinner = ora("Checking skills status...").start();

  const lock = readLockfile();
  const lockedNames = new Set(Object.keys(lock.skills));
  const targetKeys = lock.targets || ["claude"];

  // Collect skill directories from the canonical .agents/skills/ location
  let diskNames = [];
  if (existsSync(SKILLS_DIR)) {
    diskNames = readdirSync(SKILLS_DIR, { withFileTypes: true })
      .filter((e) => e.isDirectory())
      .map((e) => e.name);
  }
  const diskSet = new Set(diskNames);

  // Merge lockfile and disk entries for a complete picture
  const allNames = [...new Set([...lockedNames, ...diskSet])].sort();

  if (allNames.length === 0) {
    spinner.stop();
    console.log(
      `${icons.warn} ${yellow("No skills installed.")} Run ${cyan("cc-kit init")} to get started.`
    );
    return;
  }

  spinner.stop();

  // -- Canonical skills status --
  console.log(bold("\nSkills status:\n"));
  for (const name of allNames) {
    const inLock = lockedNames.has(name);
    const onDisk = diskSet.has(name);

    if (inLock && !onDisk) {
      console.log(`  ${name}  ${red("MISSING")}`);
    } else if (!inLock && onDisk) {
      console.log(`  ${name}  ${yellow("UNTRACKED")}`);
    } else {
      // Both in lockfile and on disk -- compare hashes
      const hash = computeHash(join(SKILLS_DIR, name));
      if (hash !== lock.skills[name].computedHash) {
        console.log(`  ${name}  ${yellow("MODIFIED")}`);
      } else {
        console.log(`  ${name}  ${green("OK")}`);
      }
    }
  }

  // -- Per-target symlink status --
  console.log(bold("\nTargets:\n"));
  for (const targetKey of targetKeys) {
    const target = TARGETS[targetKey];
    if (!target) continue;

    const issues = [];
    for (const name of allNames) {
      if (!lockedNames.has(name)) continue;

      // All targets use dir symlinks pointing to .agents/skills/<name>
      const linkPath = join(target.ideDir, name);
      const expectedSource = join(SKILLS_DIR, name);

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

  console.log(dim(`\n${allNames.length} skill(s), ${targetKeys.length} target(s).`));
}

/**
 * Check if a path is a valid symlink pointing to the expected relative target.
 * @param {string} linkPath - Path where the symlink should be
 * @param {string} expectedSource - Path the symlink should resolve to
 * @returns {boolean}
 */
function isValidSymlink(linkPath, expectedSource) {
  try {
    const stat = lstatSync(linkPath);
    if (!stat.isSymbolicLink()) return false;

    // Compare the symlink's actual target with the expected relative path
    const linkTarget = readlinkSync(linkPath);
    const expectedRel = relative(join(linkPath, ".."), expectedSource);
    return linkTarget === expectedRel;
  } catch {
    return false;
  }
}
