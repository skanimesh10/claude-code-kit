# Release Notes

## v0.3.0 -- Universal .agents/skills/ Directory

### Breaking Changes

- **Canonical directory changed** from `.localagent/skills/` to `.agents/skills/`. Existing installations should re-run `cc-kit init --force`.
- **Removed per-IDE transforms** -- Cursor `.mdc`, VS Code `.instructions.md`, and Antigravity copy transforms are no longer generated. All IDEs now discover skills via `SKILL.md` in `.agents/skills/`.

### New Features

- **Universal skill discovery** -- Skills in `.agents/skills/` are automatically available to Amp, Antigravity, Cline, Codex, Cursor, Gemini CLI, GitHub Copilot, Kimi Code CLI, OpenCode, and Replit. Only Claude Code needs symlinks.
- **SKILL.md generation** -- `cc-kit` now ensures every skill has a valid `SKILL.md` with `name` and `description` frontmatter, making them discoverable by `npx skills list`.
- **YAML frontmatter escaping** -- Description values are properly escaped for safe YAML output.

### Improvements

- **DRY constants** -- Eliminated duplicate `LOCALAGENT_DIR` export; all path constants now live in `config.js` only.
- **No emoji in output** -- All CLI indicators use text-based labels (`[OK]`, `[WARN]`, `[INFO]`, etc.).
- **Comprehensive comments** -- JSDoc and inline comments added to all exported functions and non-trivial logic.
- **Simplified target system** -- Target registry reduced to only Claude Code; no transforms needed.

### Internal Changes

- Removed `transformSkill()`, cursor/vscode/antigravity transform logic from `targets.js`.
- Added `ensureSkillMd()` and `escapeFrontmatter()` to `targets.js`.
- Removed `LOCALAGENT_DIR` and `CANONICAL_SKILLS_DIR` from `targets.js` (use `config.js` imports).
- Simplified `createSymlink()` and `processTarget()` -- all symlinks are dir symlinks to `.agents/skills/`.

---

## v0.2.0 -- Multi-IDE Target Support & Enhanced CLI

### New Features

- **Multi-target IDE support** — Added Cursor, VS Code/Copilot, and Google Antigravity alongside Claude Code. Skills are automatically transformed into each IDE's expected format (`.mdc`, `.instructions.md`, `SKILL.md`) and symlinked into the correct config directory.
- **Interactive target selection** — `cc-kit init` now prompts users to choose which IDEs to install skills for, with selections saved to the lockfile for reuse on `--force` and `update`.
- **New skills added**
  - `frontend-design` from `anthropics/skills`
  - `react-best-practices` from `vercel-labs/agent-skills`
- **CI/CD pipeline** — Added GitHub Actions workflow to automatically publish to npm on push to `main`.

### Improvements

- **Colorized CLI output** — Added chalk-based colors and ora spinners for better visual feedback during install, update, and status operations.
- **Per-target symlink health checks** — `cc-kit status` now reports symlink health for each configured IDE target, not just canonical skill state.
- **Improved documentation** — Updated README and CLAUDE.md with full architecture details, supported targets table, and project structure.

### Internal Changes

- Added `src/lib/colors.js` — shared ANSI color helpers and Unicode icons.
- Added `src/lib/targets.js` — target registry with transform and symlink logic.
- Added `.github/workflows/publish.yml` — automated npm publish on push to `main`.
- Refactored `init`, `update`, and `status` commands to support multiple targets.
- Lockfile now persists selected `targets` array for use across commands.

---

## v0.1.0 — Initial Release

### Features

- **CLI tool** — `cc-kit` with three commands: `init`, `update`, and `status`.
- **Skill installation** — Downloads skill directories from GitHub repo tarballs into `.localagent/skills/`, with tarball streaming and filtered extraction.
- **`cc-kit init`** — Downloads all configured skills, creates symlinks into `.claude/skills/`, and writes `skills-lock.json` with content hashes for change detection.
- **`cc-kit init --force`** — Re-downloads skills even if already installed.
- **`cc-kit update`** — Re-downloads all skills and reports which are new or changed based on SHA-256 hash comparison.
- **`cc-kit status`** — Shows per-skill status (`OK`, `MISSING`, `UNTRACKED`, `MODIFIED`) by comparing lockfile hashes against on-disk contents.
- **Deterministic hashing** — SHA-256 over sorted file paths and contents for reliable change detection.
- **Bundled skill registry** — Ships with `skills.json` listing `mcp-builder` from `anthropics/skills`.
- **ESM-only** — Pure ES modules, Node.js 18+ with native `fetch`.

### Dependencies

- `commander` for CLI framework
- `tar` for tarball extraction
- `inquirer` for interactive prompts
- `chalk` for terminal colors
- `ora` for terminal spinners
