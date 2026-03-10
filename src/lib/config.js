/**
 * Configuration module — reads the bundled skills.json registry and exports
 * shared constants (install directory, lockfile name).
 */

import { readFileSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";

export const LOCALAGENT_DIR = ".localagent";
export const SKILLS_DIR = join(LOCALAGENT_DIR, "skills");
export const LOCKFILE = "skills-lock.json";

// Resolve __dirname from import.meta.url so we can locate skills.json relative
// to the package installation directory, not the user's working directory.
const __dirname = dirname(fileURLToPath(import.meta.url));
const SKILLS_JSON = join(__dirname, "..", "..", "skills.json");

export function tarballUrl(repo) {
  return `https://api.github.com/repos/${repo}/tarball`;
}

/**
 * Read and parse the bundled skills.json from the package directory.
 */
export function readConfig() {
  const raw = readFileSync(SKILLS_JSON, "utf8");

  let config;
  try {
    config = JSON.parse(raw);
  } catch (e) {
    throw new Error(`Invalid JSON in skills.json: ${e.message}`);
  }

  if (!Array.isArray(config.sources) || config.sources.length === 0) {
    throw new Error(
      `skills.json must have a "sources" array with at least one entry.`
    );
  }

  for (const source of config.sources) {
    if (!source.repo || typeof source.repo !== "string") {
      throw new Error(
        `Each source in skills.json must have a "repo" string (e.g. "anthropics/skills").`
      );
    }
    if (!Array.isArray(source.skills) || source.skills.length === 0) {
      throw new Error(
        `Source "${source.repo}" must have a "skills" array with at least one skill name.`
      );
    }
  }

  return config;
}
