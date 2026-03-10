/**
 * `cc-kit update` command -- re-downloads all skills from configured sources,
 * ensures SKILL.md validity, re-creates symlinks for saved targets, and
 * reports which skills are new or changed.
 */

import { join } from "path";
import ora from "ora";
import { readConfig, SKILLS_DIR } from "../lib/config.js";
import { downloadSkills } from "../lib/github.js";
import { readLockfile, writeLockfile } from "../lib/lockfile.js";
import { computeHash } from "../lib/skills.js";
import { TARGETS, ensureSkillMd, processTarget } from "../lib/targets.js";
import { bold, cyan, green, yellow, icons } from "../lib/colors.js";

/**
 * Run the update command. Re-downloads skills, detects changes via hash
 * comparison, and re-creates symlinks for saved targets.
 */
export async function update() {
  const config = readConfig();

  const oldLock = readLockfile();
  if (Object.keys(oldLock.skills).length === 0) {
    console.log(
      `${icons.warn} ${yellow("No skills installed yet.")} Run ${cyan("cc-kit init")} first.`
    );
    return;
  }

  // Use saved targets from lockfile, default to claude if none saved
  const targetKeys = oldLock.targets || ["claude"];
  const newLock = { version: 1, targets: targetKeys, skills: {} };
  let added = 0;
  let updated = 0;

  // Download each source and compare hashes to detect changes
  for (const source of config.sources) {
    const spinner = ora(
      `Updating ${source.skills.length} skill(s) from ${source.repo}...`
    ).start();
    const extracted = await downloadSkills(source.repo, source.skills);

    const changes = [];
    for (const name of extracted) {
      const skillDir = join(SKILLS_DIR, name);
      const hash = computeHash(skillDir);

      newLock.skills[name] = {
        source: source.repo,
        sourceType: "github",
        computedHash: hash,
      };

      // Ensure SKILL.md exists for `npx skills list` discovery
      ensureSkillMd(name, skillDir);

      // Compare against previous lockfile to detect changes
      const old = oldLock.skills[name];
      if (!old) {
        changes.push(`  ${icons.plus} ${name} ${green("(new)")}`);
        added++;
      } else if (old.computedHash !== hash) {
        changes.push(`  ${yellow("~")} ${name} ${yellow("(updated)")}`);
        updated++;
      }
    }

    spinner.succeed(
      `Updated ${extracted.length} skill(s) from ${source.repo}`
    );

    // Print per-source change details
    for (const line of changes) {
      console.log(line);
    }
  }

  // Re-create symlinks for all saved targets
  const skillNames = Object.keys(newLock.skills);
  for (const targetKey of targetKeys) {
    const spinner = ora(`Updating ${TARGETS[targetKey].name}...`).start();
    processTarget(skillNames, targetKey);
    spinner.succeed(
      `${TARGETS[targetKey].name} ${icons.arrow} ${TARGETS[targetKey].ideDir}`
    );
  }

  writeLockfile(newLock);

  // Summary
  const total = Object.keys(newLock.skills).length;
  if (added === 0 && updated === 0) {
    console.log(`${icons.check} Already up to date.`);
  } else {
    console.log(
      `\n${bold(`${green(added)} new, ${yellow(updated)} updated, ${total} total skills.`)}`
    );
  }
}
