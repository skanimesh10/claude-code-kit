import { createHash } from "crypto";
import { readdirSync, readFileSync, statSync } from "fs";
import { join } from "path";

/**
 * Compute a deterministic SHA-256 hash over all files in a skill directory.
 */
export function computeHash(skillDir) {
  const hash = createHash("sha256");
  const files = collectFiles(skillDir).sort();
  for (const file of files) {
    hash.update(file); // include relative path for determinism
    hash.update(readFileSync(join(skillDir, file)));
  }
  return hash.digest("hex");
}

/**
 * Recursively collect all file paths in a directory, returning paths relative to `dir`.
 * @param {string} dir  - Absolute path to walk
 * @param {string} base - Accumulator for the relative path prefix (internal)
 * @returns {string[]} Relative file paths
 */
function collectFiles(dir, base = "") {
  const entries = readdirSync(dir, { withFileTypes: true });
  const files = [];
  for (const entry of entries) {
    const rel = base ? `${base}/${entry.name}` : entry.name;
    if (entry.isDirectory()) {
      files.push(...collectFiles(join(dir, entry.name), rel));
    } else {
      files.push(rel);
    }
  }
  return files;
}
