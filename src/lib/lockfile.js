/**
 * Lockfile module -- reads and writes skills-lock.json in the user's project
 * root. The lockfile tracks installed skills with their source repo, content
 * hash, and selected IDE targets for change detection across updates.
 */

import { readFileSync, writeFileSync } from "fs";
import { LOCKFILE } from "./config.js";

/**
 * Read and parse the skills-lock.json from the current working directory.
 * Returns a default empty lockfile if the file doesn't exist or is invalid.
 * @returns {{ version: number, skills: Record<string, { source: string, sourceType: string, computedHash: string }> }}
 */
export function readLockfile() {
  try {
    return JSON.parse(readFileSync(LOCKFILE, "utf8"));
  } catch {
    return { version: 1, targets: [], skills: {} };
  }
}

/**
 * Write the lockfile object to skills-lock.json in the current working directory.
 * @param {{ version: number, skills: Record<string, object> }} lock
 */
export function writeLockfile(lock) {
  writeFileSync(LOCKFILE, JSON.stringify(lock, null, 2) + "\n");
}
