/**
 * `cc-kit update` command — re-downloads all skills from configured sources
 * and reports which skills are new or have changed since the last install/update.
 */

import { join } from "path";
import ora from "ora";
import { readConfig, SKILLS_DIR } from "../lib/config.js";
import { downloadSkills } from "../lib/github.js";
import { readLockfile, writeLockfile } from "../lib/lockfile.js";
import { computeHash } from "../lib/skills.js";
import { bold, cyan, green, yellow, icons } from "../lib/colors.js";

export async function update() {
  const config = readConfig();

  const oldLock = readLockfile();
  if (Object.keys(oldLock.skills).length === 0) {
    console.log(`${icons.warn} ${yellow("No skills installed yet.")} Run ${cyan("cc-kit init")} first.`);
    return;
  }

  const newLock = { version: 1, skills: {} };
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

      // Compare against previous lockfile to detect new vs updated skills
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

  writeLockfile(newLock);

  const total = Object.keys(newLock.skills).length;
  if (added === 0 && updated === 0) {
    console.log(`${icons.check} Already up to date.`);
  } else {
    console.log(`\n${bold(`${green(added)} new, ${yellow(updated)} updated, ${total} total skills.`)}`);
  }
}
