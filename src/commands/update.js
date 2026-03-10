/**
 * `cc-kit update` command — re-downloads all skills from configured sources,
 * re-transforms and re-symlinks for saved targets, and reports changes.
 */

import { join } from "path";
import ora from "ora";
import { readConfig, SKILLS_DIR } from "../lib/config.js";
import { downloadSkills } from "../lib/github.js";
import { readLockfile, writeLockfile } from "../lib/lockfile.js";
import { computeHash } from "../lib/skills.js";
import { TARGETS, processTarget } from "../lib/targets.js";
import { bold, cyan, green, yellow, icons } from "../lib/colors.js";

export async function update(options) {
  const config = readConfig();

  const oldLock = readLockfile();
  if (Object.keys(oldLock.skills).length === 0) {
    console.log(`${icons.warn} ${yellow("No skills installed yet.")} Run ${cyan("cc-kit init")} first.`);
    return;
  }

  const targetKeys = oldLock.targets || ["claude"];
  const newLock = { version: 1, targets: targetKeys, skills: {} };
  let added = 0;
  let updated = 0;

  for (const source of config.sources) {
    const spinner = ora(
      `Updating ${source.skills.length} skill(s) from ${source.repo}...`
    ).start();
    const extracted = await downloadSkills(source.repo, source.skills);

    const changes = [];
    for (const name of extracted) {
      const hash = computeHash(join(SKILLS_DIR, name));
      newLock.skills[name] = {
        source: source.repo,
        sourceType: "github",
        computedHash: hash,
      };

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

    for (const line of changes) {
      console.log(line);
    }
  }

  // Re-transform and re-symlink for all saved targets
  const skillNames = Object.keys(newLock.skills);
  for (const targetKey of targetKeys) {
    const spinner = ora(`Updating ${TARGETS[targetKey].name}...`).start();
    processTarget(skillNames, targetKey);
    spinner.succeed(`${TARGETS[targetKey].name} ${icons.arrow} ${TARGETS[targetKey].ideDir}`);
  }

  writeLockfile(newLock);

  const total = Object.keys(newLock.skills).length;
  if (added === 0 && updated === 0) {
    console.log(`${icons.check} Already up to date.`);
  } else {
    console.log(`\n${bold(`${green(added)} new, ${yellow(updated)} updated, ${total} total skills.`)}`);
  }
}
