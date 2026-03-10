/**
 * GitHub download module -- fetches repo tarballs and extracts requested
 * skill directories into the canonical .agents/skills/ location.
 *
 * Uses the GitHub tarball API (HTTPS) and streams through the `tar` library
 * with a filter that selects only the requested skill directories.
 */

import { mkdirSync, readdirSync } from "fs";
import { Readable } from "stream";
import { pipeline } from "stream/promises";
import * as tar from "tar";
import { SKILLS_DIR, tarballUrl } from "./config.js";

/**
 * Download a repo tarball and extract only the specified skill directories.
 *
 * Tarball entries have the structure: <owner>-<repo>-<sha>/skills/<skill-name>/...
 * The filter selects entries matching requested skill names, and strip=2
 * removes the "<top>/skills/" prefix so files land directly in SKILLS_DIR/<name>/.
 *
 * @param {string} repo - GitHub repo in "owner/name" format
 * @param {string[]} skillNames - Skill directory names to extract
 * @returns {Promise<string[]>} Names of skill directories that were extracted
 * @throws {Error} If the GitHub API returns a non-OK response
 */
export async function downloadSkills(repo, skillNames) {
  const url = tarballUrl(repo);

  // Fetch the tarball via the GitHub API
  const res = await fetch(url, {
    headers: { Accept: "application/vnd.github+json", "User-Agent": "cc-kit" },
  });

  if (!res.ok) {
    throw new Error(
      `GitHub API returned ${res.status} for ${repo}: ${res.statusText}`
    );
  }

  // Ensure the target directory exists
  mkdirSync(SKILLS_DIR, { recursive: true });

  const wanted = new Set(skillNames);

  // Configure tar extraction with a filter to select only wanted skills
  const extract = tar.extract({
    cwd: SKILLS_DIR,
    strip: 2, // strip "<repo-sha>/skills/" prefix
    filter: (path) => {
      // Remove the top-level directory (repo-sha) to get the rest
      const afterTop = path.substring(path.indexOf("/") + 1);
      if (!afterTop.startsWith("skills/")) return false;

      // Extract the skill name from "skills/<skill-name>/..."
      const rest = afterTop.substring("skills/".length);
      const skillName = rest.split("/")[0];
      return wanted.has(skillName);
    },
  });

  // Stream the response body through tar extraction
  const body = Readable.fromWeb(res.body);
  await pipeline(body, extract);

  // Return only the skill dirs that were actually extracted
  const entries = readdirSync(SKILLS_DIR, { withFileTypes: true });
  return entries
    .filter((e) => e.isDirectory() && wanted.has(e.name))
    .map((e) => e.name);
}
