# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

**claude-code-kit** (`cc-kit`) is a CLI that installs AI coding skills from GitHub into any project. It downloads skill directories from configured repositories into a canonical `.localagent/` directory, transforms them for each target IDE (Claude Code, Cursor, VS Code/Copilot, Antigravity), creates symlinks into each IDE's expected location, and tracks installed versions via a lockfile.

## Commands

```bash
node bin/cc-kit.js init          # Download skills, prompt for target IDEs, transform + symlink
node bin/cc-kit.js init --force  # Re-download even if already installed (reuses saved targets)
node bin/cc-kit.js update        # Re-download, re-transform, and report new/changed skills
node bin/cc-kit.js status        # Show per-skill status and per-target symlink health
```

## Testing

No test framework configured. Manual testing:

```bash
cd /tmp && rm -rf test-cc-kit && mkdir test-cc-kit && cd test-cc-kit
node /path/to/claude-code-kit/bin/cc-kit.js init
node /path/to/claude-code-kit/bin/cc-kit.js status
node /path/to/claude-code-kit/bin/cc-kit.js update
```

## Architecture

- **ESM-only** (`"type": "module"` in package.json). All imports use `.js` extensions.
- **Node 18+** required — uses native `fetch` (no polyfill).

### Flow

`bin/cc-kit.js` registers commands via commander. Each command in `src/commands/` orchestrates calls to `src/lib/`:

1. `config.js` reads the bundled `skills.json` registry (resolved via `import.meta.url`, not `process.cwd()`)
2. `github.js` fetches repo tarballs from GitHub, streams them through `tar` extraction with a filter that selects only requested skill directories (strips 2 path levels: `<repo-sha>/skills/`), downloading into `.localagent/skills/`
3. `targets.js` defines IDE targets, transforms raw skills into IDE-specific formats (`.mdc`, `.instructions.md`, etc.), and creates relative symlinks from IDE directories to `.localagent/`
4. `skills.js` computes deterministic SHA-256 hashes over skill directory contents (includes relative file paths for stability)
5. `lockfile.js` reads/writes `skills-lock.json` in the user's project root (includes saved `targets` array)

### Key Files

- **`skills.json`** — Ships with the package. Lists GitHub repos and which skill directories to extract. Users don't edit this.
- **`skills-lock.json`** — Written to the user's project root. Records installed skills with source repo, content hash, and selected targets.
- **`.localagent/skills/`** — Canonical download location for raw skills.
- **`.localagent/<target>/`** — Transformed skills per IDE target (e.g. `.localagent/cursor/`, `.localagent/vscode/`).
- **IDE directories** (`.claude/skills/`, `.cursor/rules/`, `.github/instructions/`, `.agent/skills/`) — Contain symlinks pointing back to `.localagent/`.

### Supported Targets

| Target | IDE | Transform | IDE Directory | Symlink Type |
|--------|-----|-----------|---------------|--------------|
| `claude` | Claude Code | None (raw dirs) | `.claude/skills/` | dir |
| `cursor` | Cursor | `.mdc` with frontmatter | `.cursor/rules/` | file |
| `vscode` | VS Code / Copilot | `.instructions.md` with frontmatter | `.github/instructions/` | file |
| `antigravity` | Google Antigravity | Copy + `SKILL.md` | `.agent/skills/` | dir |

## Dependencies

- **commander** — CLI framework
- **tar** — Tarball extraction for GitHub downloads
- **inquirer** — Interactive prompts for target IDE selection
- **chalk** — Terminal colors
- **ora** — Terminal spinners
