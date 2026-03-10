/**
 * `cc-kit init` command -- downloads skills from configured GitHub sources
 * into .agents/skills/, ensures each has a valid SKILL.md, optionally creates
 * Claude Code symlinks, and writes the lockfile.
 */

import { existsSync } from "fs";
import { join } from "path";
import inquirer from "inquirer";
import ora from "ora";
import { readConfig, SKILLS_DIR, AGENTS_DIR } from "../lib/config.js";
import { downloadSkills } from "../lib/github.js";
import { readLockfile, writeLockfile } from "../lib/lockfile.js";
import { computeHash } from "../lib/skills.js";
import { TARGETS, resolveTargets, ensureSkillMd, processTarget } from "../lib/targets.js";
import { bold, cyan, green, yellow, icons } from "../lib/colors.js";

/**
 * Run the init command. Downloads skills, prompts for targets, and sets up
 * the project for skill discovery.
 * @param {{ force?: boolean }} options - CLI options from commander
 */
export async function init(options) {
  const config = readConfig();

  // Bail out early if already installed (unless --force)
  if (existsSync(AGENTS_DIR) && !options.force) {
    console.log(
      `${icons.warn} ${yellow("Skills already installed.")} Use --force to re-download, or run ${cyan("cc-kit update")}.`
    );
    return;
  }

  // Read existing lockfile (may have saved targets from previous install)
  const lock = readLockfile();

  // Determine targets: reuse from lockfile on --force, otherwise prompt
  let targetKeys;
  if (options.force && lock.targets && lock.targets.length > 0) {
    targetKeys = lock.targets;
    console.log(
      `${icons.info} Re-installing for: ${targetKeys.map((k) => TARGETS[k].name).join(", ")}`
    );
  } else {
    targetKeys = await promptTargets();
  }

  resolveTargets(targetKeys);
  lock.targets = targetKeys;
  let totalInstalled = 0;

  // Download each source's skills and record hashes in the lockfile
  for (const source of config.sources) {
    const spinner = ora(
      `Downloading ${source.skills.length} skill(s) from ${source.repo}...`
    ).start();
    const extracted = await downloadSkills(source.repo, source.skills);

    for (const name of extracted) {
      const skillDir = join(SKILLS_DIR, name);

      // Compute content hash for change detection
      const hash = computeHash(skillDir);
      lock.skills[name] = {
        source: source.repo,
        sourceType: "github",
        computedHash: hash,
      };

      // Ensure SKILL.md exists with valid frontmatter for `npx skills list`
      ensureSkillMd(name, skillDir);
    }

    totalInstalled += extracted.length;
    spinner.succeed(
      `Downloaded ${extracted.length} skill(s) from ${source.repo}`
    );
  }

  // Create symlinks for each selected target (e.g. Claude Code)
  const skillNames = Object.keys(lock.skills);
  for (const targetKey of targetKeys) {
    const spinner = ora(`Setting up ${TARGETS[targetKey].name}...`).start();
    processTarget(skillNames, targetKey);
    spinner.succeed(`${TARGETS[targetKey].name} ${icons.arrow} ${TARGETS[targetKey].ideDir}`);
  }

  // Persist the lockfile
  writeLockfile(lock);

  console.log(
    `\n${icons.check} ${bold(`Installed ${green(totalInstalled)} skill(s) for ${green(targetKeys.length + " target(s)")}`)}`
  );
}

/**
 * Prompt the user to select which IDE targets need symlinks.
 * Skills in .agents/skills/ are available to most IDEs automatically.
 * Only Claude Code requires explicit symlinks.
 * @returns {Promise<string[]>} Selected target keys
 */
async function promptTargets() {
  const choices = Object.entries(TARGETS).map(([key, target]) => ({
    name: target.name,
    value: key,
    checked: true, // default to creating symlinks
  }));

  const { targets } = await inquirer.prompt([
    {
      type: "checkbox",
      name: "targets",
      message:
        "Skills will be installed to .agents/skills/ (works with most IDEs).\n  Select additional targets that need symlinks:",
      choices,
    },
  ]);

  return targets;
}
