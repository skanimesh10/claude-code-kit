/**
 * `cc-kit init` command — downloads skills from configured GitHub sources
 * and writes the lockfile. Skips if skills are already installed unless --force.
 */

import { existsSync } from "fs";
import { join } from "path";
import ora from "ora";
import { readConfig, SKILLS_DIR } from "../lib/config.js";
import { downloadSkills } from "../lib/github.js";
import { readLockfile, writeLockfile } from "../lib/lockfile.js";
import { computeHash } from "../lib/skills.js";
import { bold, cyan, green, yellow, icons } from "../lib/colors.js";

export async function init(options) {
  const config = readConfig();

  // Bail out early if skills are already on disk (unless --force)
  if (existsSync(SKILLS_DIR) && !options.force) {
    console.log(
      `${icons.warn} ${yellow("Skills already installed.")} Use --force to re-download, or run ${cyan("cc-kit update")}.`
    );
    return;
  }

  const lock = readLockfile();
  let totalInstalled = 0;

  // Download each source's skills and record hashes in the lockfile
  for (const source of config.sources) {
    const spinner = ora(
      `Downloading ${source.skills.length} skill(s) from ${source.repo}...`
    ).start();
    const extracted = await downloadSkills(source.repo, source.skills);

    for (const name of extracted) {
      const hash = computeHash(join(SKILLS_DIR, name));
      lock.skills[name] = {
        source: source.repo,
        sourceType: "github",
        computedHash: hash,
      };
    }

    totalInstalled += extracted.length;
    spinner.succeed(
      `Downloaded ${extracted.length} skill(s) from ${source.repo}`
    );
  }

  // Persist the lockfile so `status` and `update` can detect changes later
  writeLockfile(lock);

  console.log(
    `${icons.check} ${bold(`Installed ${green(totalInstalled)} skill(s) from ${green(config.sources.length)} source(s)`)} into .claude/skills/`
  );
}
