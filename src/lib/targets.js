/**
 * Target registry -- defines IDE targets that need symlinks and provides
 * utilities for SKILL.md generation and symlink creation.
 *
 * Most IDEs (Amp, Antigravity, Cline, Codex, Cursor, Gemini CLI, GitHub
 * Copilot, Kimi Code CLI, OpenCode) read skills directly from .agents/skills/.
 * Only Claude Code needs symlinks from .claude/skills/ to .agents/skills/.
 */

import {
  existsSync,
  mkdirSync,
  readFileSync,
  writeFileSync,
  readdirSync,
  symlinkSync,
  lstatSync,
  unlinkSync,
  rmSync,
} from "fs";
import { join, dirname, relative } from "path";
import { SKILLS_DIR } from "./config.js";

/**
 * IDE targets that require symlinks to .agents/skills/.
 * Most IDEs read from .agents/skills/ directly and need no entry here.
 */
export const TARGETS = {
  claude: {
    name: "Claude Code",
    ideDir: join(".claude", "skills"),
  },
};

/**
 * Validate an array of target keys against known targets.
 * @param {string[]} keys - Target keys to validate
 * @returns {string[]} The same keys if all are valid
 * @throws {Error} If any key is not a recognized target
 */
export function resolveTargets(keys) {
  for (const key of keys) {
    if (!TARGETS[key]) {
      throw new Error(
        `Unknown target "${key}". Valid targets: ${Object.keys(TARGETS).join(", ")}`
      );
    }
  }
  return keys;
}

/**
 * Ensure a skill directory has a valid SKILL.md with YAML frontmatter
 * containing at least `name` and `description`. This is required for
 * discovery by `npx skills list` (vercel-labs/skills).
 *
 * If a valid SKILL.md already exists, it is left untouched.
 *
 * @param {string} skillName - Name of the skill (used as fallback name)
 * @param {string} skillDir - Absolute path to the skill directory
 */
export function ensureSkillMd(skillName, skillDir) {
  const skillMdPath = join(skillDir, "SKILL.md");

  // Check if a valid SKILL.md already exists with required frontmatter
  if (existsSync(skillMdPath)) {
    const existing = readFileSync(skillMdPath, "utf8");
    if (hasValidFrontmatter(existing)) {
      return; // already has proper frontmatter with name + description
    }
  }

  // Generate SKILL.md from the skill's markdown content
  const { content, description } = readSkillContent(skillDir);
  const skillMd = [
    "---",
    `name: "${skillName}"`,
    `description: "${escapeFrontmatter(description)}"`,
    "---",
    "",
    content,
    "",
  ].join("\n");

  writeFileSync(skillMdPath, skillMd);
}

/**
 * Create a symlink from an IDE directory to the canonical .agents/skills/ location.
 * @param {string} skillName - Name of the skill directory
 * @param {string} targetKey - Key from TARGETS (e.g. "claude")
 */
export function createSymlink(skillName, targetKey) {
  const target = TARGETS[targetKey];
  const sourcePath = join(SKILLS_DIR, skillName);
  const linkPath = join(target.ideDir, skillName);

  // Ensure the IDE directory exists
  mkdirSync(dirname(linkPath), { recursive: true });

  // Remove existing symlink or directory at link path
  if (existsSync(linkPath) || isSymlink(linkPath)) {
    if (isSymlink(linkPath)) {
      unlinkSync(linkPath);
    } else {
      rmSync(linkPath, { recursive: true });
    }
  }

  // Create relative symlink so it works regardless of absolute path
  const relTarget = relative(dirname(linkPath), sourcePath);
  symlinkSync(relTarget, linkPath);
}

/**
 * Create symlinks for all skills for a given target.
 * @param {string[]} skillNames - List of skill directory names
 * @param {string} targetKey - Key from TARGETS (e.g. "claude")
 */
export function processTarget(skillNames, targetKey) {
  for (const name of skillNames) {
    createSymlink(name, targetKey);
  }
}

// ---------------------------------------------------------------------------
// Internal helpers
// ---------------------------------------------------------------------------

/**
 * Check if markdown content has valid YAML frontmatter with name and description.
 * @param {string} content - Raw file content
 * @returns {boolean}
 */
function hasValidFrontmatter(content) {
  const trimmed = content.trim();
  if (!trimmed.startsWith("---")) return false;

  // Find closing frontmatter delimiter
  const endIdx = trimmed.indexOf("---", 3);
  if (endIdx === -1) return false;

  const frontmatter = trimmed.substring(3, endIdx);
  return frontmatter.includes("name:") && frontmatter.includes("description:");
}

/**
 * Read all .md files in a skill directory, concatenate them, and extract
 * a description from the first meaningful line of content.
 * @param {string} dir - Path to skill directory
 * @returns {{ content: string, description: string }}
 */
function readSkillContent(dir) {
  const files = collectMarkdownFiles(dir).sort();
  const parts = [];
  let description = "";

  for (const file of files) {
    const raw = readFileSync(join(dir, file), "utf8").trim();
    parts.push(raw);

    // Extract description from first meaningful line (skip frontmatter, headings, comments)
    if (!description) {
      description = extractDescription(raw);
    }
  }

  return {
    content: parts.join("\n\n"),
    description: description || "Skill instructions",
  };
}

/**
 * Extract a short description from markdown content.
 * Skips YAML frontmatter blocks, headings, and HTML comments.
 * @param {string} content - Raw markdown content
 * @returns {string} First meaningful line, truncated to 120 chars
 */
function extractDescription(content) {
  const lines = content.split("\n");
  let inFrontmatter = false;

  for (const line of lines) {
    const trimmed = line.trim();

    // Toggle frontmatter state on delimiter lines
    if (trimmed === "---") {
      inFrontmatter = !inFrontmatter;
      continue;
    }

    // Skip frontmatter content, empty lines, headings, and HTML comments
    if (inFrontmatter) continue;
    if (!trimmed || trimmed.startsWith("#") || trimmed.startsWith("<!--")) continue;

    return trimmed.slice(0, 120);
  }

  return "";
}

/**
 * Escape double quotes in a string for safe inclusion in YAML frontmatter.
 * @param {string} value
 * @returns {string}
 */
function escapeFrontmatter(value) {
  return value.replace(/"/g, '\\"');
}

/**
 * Check if a path is a symbolic link.
 * @param {string} path
 * @returns {boolean}
 */
function isSymlink(path) {
  try {
    return lstatSync(path).isSymbolicLink();
  } catch {
    return false;
  }
}

/**
 * Recursively collect .md file paths relative to a directory.
 * @param {string} dir - Directory to walk
 * @param {string} base - Internal accumulator for relative path prefix
 * @returns {string[]} Relative paths to .md files
 */
function collectMarkdownFiles(dir, base = "") {
  const entries = readdirSync(dir, { withFileTypes: true });
  const files = [];

  for (const entry of entries) {
    const rel = base ? `${base}/${entry.name}` : entry.name;
    if (entry.isDirectory()) {
      files.push(...collectMarkdownFiles(join(dir, entry.name), rel));
    } else if (entry.name.endsWith(".md")) {
      files.push(rel);
    }
  }

  return files;
}
