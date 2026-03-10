/**
 * Configuration module -- reads the bundled skills.json registry and exports
 * shared constants used across the CLI.
 *
 * All path constants are defined here to avoid duplication (DRY).
 */

import { readFileSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";

/** Root directory for all installed skills. Serves as the canonical location
 *  recognized by most IDEs via the `skills` npm package (vercel-labs/skills). */
export const AGENTS_DIR = ".agents";

/** Canonical skills directory where raw skill folders are downloaded. */
export const SKILLS_DIR = join(AGENTS_DIR, "skills");

/** Lockfile name written to the user's project root. */
export const LOCKFILE = "skills-lock.json";

// Resolve __dirname from import.meta.url so we can locate skills.json relative
// to the package installation directory, not the user's working directory.
const __dirname = dirname(fileURLToPath(import.meta.url));
const SKILLS_JSON = join(__dirname, "..", "..", "skills.json");

/**
 * Build the GitHub tarball URL for a given repo.
 * @param {string} repo - GitHub repo in "owner/name" format
 * @returns {string} HTTPS URL to the repo's default branch tarball
 */
export function tarballUrl(repo) {
  return `https://api.github.com/repos/${repo}/tarball`;
}

/**
 * Read and parse the bundled skills.json from the package directory.
 * Validates that the file contains a non-empty "sources" array, and that
 * each source has a "repo" string and a non-empty "skills" array.
 *
 * @returns {{ sources: Array<{ repo: string, skills: string[] }> }}
 * @throws {Error} If skills.json is missing, invalid, or malformed
 */
export function readConfig() {
  const raw = readFileSync(SKILLS_JSON, "utf8");

  let config;
  try {
    config = JSON.parse(raw);
  } catch (e) {
    throw new Error(`Invalid JSON in skills.json: ${e.message}`);
  }

  // Validate top-level structure
  if (!Array.isArray(config.sources) || config.sources.length === 0) {
    throw new Error(
      `skills.json must have a "sources" array with at least one entry.`
    );
  }

  // Validate each source entry
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
