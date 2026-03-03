import { mkdirSync, readdirSync } from "fs";
import { Readable } from "stream";
import { pipeline } from "stream/promises";
import * as tar from "tar";
import { SKILLS_DIR, tarballUrl } from "./config.js";

/**
 * Download a repo tarball and extract only the specified skill directories.
 * Tarball entries look like: <owner>-<repo>-<sha>/skills/<skill-name>/...
 * Returns an array of extracted skill directory names.
 */
export async function downloadSkills(repo, skillNames) {
  const url = tarballUrl(repo);
  const res = await fetch(url, {
    headers: { Accept: "application/vnd.github+json", "User-Agent": "cc-kit" },
  });

  if (!res.ok) {
    throw new Error(
      `GitHub API returned ${res.status} for ${repo}: ${res.statusText}`
    );
  }

  mkdirSync(SKILLS_DIR, { recursive: true });

  const wanted = new Set(skillNames);

  const extract = tar.extract({
    cwd: SKILLS_DIR,
    strip: 2, // strip "<top>/skills/" so files land in <skill-name>/...
    filter: (path) => {
      const afterTop = path.substring(path.indexOf("/") + 1);
      if (!afterTop.startsWith("skills/")) return false;
      // afterTop is "skills/<skill-name>/..." — grab the skill name
      const rest = afterTop.substring("skills/".length);
      const skillName = rest.split("/")[0];
      return wanted.has(skillName);
    },
  });

  const body = Readable.fromWeb(res.body);
  await pipeline(body, extract);

  // Return only the skill dirs that were actually extracted
  const entries = readdirSync(SKILLS_DIR, { withFileTypes: true });
  return entries
    .filter((e) => e.isDirectory() && wanted.has(e.name))
    .map((e) => e.name);
}
