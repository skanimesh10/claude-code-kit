/**
 * `cc-kit update` command — re-downloads all skills from configured sources
 * and reports which skills are new or have changed since the last install/update.
 */

import { join } from "path";
import { readConfig, SKILLS_DIR } from "../lib/config.js";
import { downloadSkills } from "../lib/github.js";
import { readLockfile, writeLockfile } from "../lib/lockfile.js";
import { computeHash } from "../lib/skills.js";

export async function update() {
  const config = readConfig();

  const oldLock = readLockfile();
  if (Object.keys(oldLock.skills).length === 0) {
    console.log("No skills installed yet. Run `cc-kit init` first.");
    return;
  }

  const newLock = { version: 1, skills: {} };
  let added = 0;
  let updated = 0;

  for (const source of config.sources) {
    console.log(
      "Updating %d skill(s) from %s...",
      source.skills.length,
      source.repo
    );
    const extracted = await downloadSkills(source.repo, source.skills);

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
        console.log(`  + ${name} (new)`);
        added++;
      } else if (old.computedHash !== hash) {
        console.log(`  ~ ${name} (updated)`);
        updated++;
      }
    }
  }

  writeLockfile(newLock);

  const total = Object.keys(newLock.skills).length;
  if (added === 0 && updated === 0) {
    console.log("Already up to date.");
  } else {
    console.log(`\n${added} new, ${updated} updated, ${total} total skills.`);
  }
}
