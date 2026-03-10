/**
 * Target registry — defines IDE targets, transformation logic, and symlink creation.
 * Each target describes how to transform raw skills from .localagent/skills/ into
 * an IDE-specific format and where to symlink them.
 */

import { existsSync, mkdirSync, readFileSync, writeFileSync, readdirSync, cpSync, symlinkSync, lstatSync, unlinkSync, rmSync } from "fs";
import { join, dirname, relative } from "path";

export const LOCALAGENT_DIR = ".localagent";
export const CANONICAL_SKILLS_DIR = join(LOCALAGENT_DIR, "skills");

export const TARGETS = {
  claude: {
    name: "Claude Code",
    localDir: "skills",
    ideDir: join(".claude", "skills"),
    ext: null,
    symlinkType: "dir",
  },
  cursor: {
    name: "Cursor",
    localDir: "cursor",
    ideDir: join(".cursor", "rules"),
    ext: ".mdc",
    symlinkType: "file",
  },
  antigravity: {
    name: "Antigravity",
    localDir: "antigravity",
    ideDir: join(".agent", "skills"),
    ext: null,
    symlinkType: "dir",
  },
  vscode: {
    name: "VS Code",
    localDir: "vscode",
    ideDir: join(".github", "instructions"),
    ext: ".instructions.md",
    symlinkType: "file",
  },
};

/**
 * Validate an array of target keys against known targets.
 * @param {string[]} keys
 * @returns {string[]} validated keys
 */
export function resolveTargets(keys) {
  for (const key of keys) {
    if (!TARGETS[key]) {
      throw new Error(`Unknown target "${key}". Valid targets: ${Object.keys(TARGETS).join(", ")}`);
    }
  }
  return keys;
}

/**
 * Concatenate all .md files in a directory into a single string.
 * Files are sorted alphabetically. Each file is separated by a comment header.
 * @param {string} dir - Path to skill directory
 * @returns {{ content: string, description: string }}
 */
export function concatenateMarkdownFiles(dir) {
  const files = collectMarkdownFiles(dir).sort();
  const parts = [];
  let description = "";

  for (const file of files) {
    const content = readFileSync(join(dir, file), "utf8").trim();
    parts.push(`<!-- file: ${file} -->\n${content}`);

    // Use first non-empty line of first file as description
    if (!description) {
      const firstLine = content.split("\n").find((l) => l.trim() && !l.startsWith("#"));
      if (firstLine) description = firstLine.trim().slice(0, 120);
    }
  }

  return { content: parts.join("\n\n"), description: description || "Skill instructions" };
}

/**
 * Transform a raw skill into the format required by a specific target.
 * Writes transformed output into .localagent/<targetLocalDir>/.
 * @param {string} skillName
 * @param {string} sourceDir - Path to the raw skill directory (e.g. .localagent/skills/<name>)
 * @param {string} targetKey - One of the TARGETS keys
 */
export function transformSkill(skillName, sourceDir, targetKey) {
  const target = TARGETS[targetKey];
  const targetDir = join(LOCALAGENT_DIR, target.localDir);

  if (targetKey === "claude") {
    // No transformation needed — canonical dir IS the source
    return;
  }

  mkdirSync(targetDir, { recursive: true });

  if (targetKey === "cursor") {
    const { content, description } = concatenateMarkdownFiles(sourceDir);
    const mdc = `---
description: "${description}"
globs: ["**/*"]
alwaysApply: true
---

${content}
`;
    writeFileSync(join(targetDir, `${skillName}.mdc`), mdc);
  } else if (targetKey === "vscode") {
    const { content, description } = concatenateMarkdownFiles(sourceDir);
    const instructions = `---
name: "${skillName}"
description: "${description}"
applyTo: "**/*"
---

${content}
`;
    writeFileSync(join(targetDir, `${skillName}.instructions.md`), instructions);
  } else if (targetKey === "antigravity") {
    const skillOutDir = join(targetDir, skillName);
    // Remove existing and copy fresh
    if (existsSync(skillOutDir)) {
      rmSync(skillOutDir, { recursive: true });
    }
    cpSync(sourceDir, skillOutDir, { recursive: true });

    // Generate SKILL.md with frontmatter
    const { description } = concatenateMarkdownFiles(sourceDir);
    const skillMd = `---
name: "${skillName}"
description: "${description}"
---
`;
    writeFileSync(join(skillOutDir, "SKILL.md"), skillMd);
  }
}

/**
 * Create a symlink from the IDE's expected directory to the .localagent/ transformed output.
 * @param {string} skillName
 * @param {string} targetKey
 */
export function createSymlink(skillName, targetKey) {
  const target = TARGETS[targetKey];

  // Determine source (what the symlink points to) and link path
  let sourcePath, linkPath;

  if (targetKey === "claude") {
    sourcePath = join(CANONICAL_SKILLS_DIR, skillName);
    linkPath = join(target.ideDir, skillName);
  } else if (target.symlinkType === "file") {
    const fileName = `${skillName}${target.ext}`;
    sourcePath = join(LOCALAGENT_DIR, target.localDir, fileName);
    linkPath = join(target.ideDir, fileName);
  } else {
    sourcePath = join(LOCALAGENT_DIR, target.localDir, skillName);
    linkPath = join(target.ideDir, skillName);
  }

  // Ensure the IDE directory exists
  mkdirSync(dirname(linkPath), { recursive: true });

  // Remove existing symlink or file at link path
  if (existsSync(linkPath) || isSymlink(linkPath)) {
    if (isSymlink(linkPath)) {
      unlinkSync(linkPath);
    } else {
      rmSync(linkPath, { recursive: true });
    }
  }

  // Create relative symlink
  const relTarget = relative(dirname(linkPath), sourcePath);
  symlinkSync(relTarget, linkPath);
}

/**
 * Transform and create symlinks for all skills for a given target.
 * @param {string[]} skillNames
 * @param {string} targetKey
 */
export function processTarget(skillNames, targetKey) {
  for (const name of skillNames) {
    const sourceDir = join(CANONICAL_SKILLS_DIR, name);
    transformSkill(name, sourceDir, targetKey);
    createSymlink(name, targetKey);
  }
}

/**
 * Check if a path is a symlink.
 */
function isSymlink(path) {
  try {
    const stat = lstatSync(path);
    return stat.isSymbolicLink();
  } catch {
    return false;
  }
}

/**
 * Recursively collect .md file paths relative to dir.
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
