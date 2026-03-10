# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

**claude-code-kit** (`cc-kit`) is a CLI that installs AI coding skills from GitHub into any project. It downloads skill directories from configured repositories into `.agents/skills/`, ensures each skill has a valid `SKILL.md` for discovery by `npx skills list`, optionally creates symlinks for Claude Code, and tracks installed versions via a lockfile.

Skills in `.agents/skills/` are automatically available to: Amp, Antigravity, Cline, Codex, Cursor, Gemini CLI, GitHub Copilot, Kimi Code CLI, OpenCode, and Replit. Only Claude Code requires symlinks (`.claude/skills/`).

## Commands

```bash
node bin/cc-kit.js init          # Download skills, prompt for targets, create symlinks
node bin/cc-kit.js init --force  # Re-download even if already installed (reuses saved targets)
node bin/cc-kit.js update        # Re-download and report new/changed skills
node bin/cc-kit.js status        # Show per-skill status and per-target symlink health
```

## Testing

No test framework configured. Manual testing:

```bash
cd /tmp && rm -rf test-cc-kit && mkdir test-cc-kit && cd test-cc-kit
node /path/to/claude-code-kit/bin/cc-kit.js init
node /path/to/claude-code-kit/bin/cc-kit.js status
node /path/to/claude-code-kit/bin/cc-kit.js update
npx skills list  # verify skills are discoverable
```

## Architecture

- **ESM-only** (`"type": "module"` in package.json). All imports use `.js` extensions.
- **Node 18+** required -- uses native `fetch` (no polyfill).

### Flow

`bin/cc-kit.js` registers commands via commander. Each command in `src/commands/` orchestrates calls to `src/lib/`:

1. `config.js` reads the bundled `skills.json` registry (resolved via `import.meta.url`, not `process.cwd()`) and exports shared path constants (`AGENTS_DIR`, `SKILLS_DIR`)
2. `github.js` fetches repo tarballs from GitHub, streams them through `tar` extraction with a filter that selects only requested skill directories (strips 2 path levels: `<repo-sha>/skills/`), downloading into `.agents/skills/`
3. `targets.js` defines IDE targets needing symlinks (currently only Claude Code), generates `SKILL.md` files for skill discovery, and creates relative symlinks
4. `skills.js` computes deterministic SHA-256 hashes over skill directory contents (includes relative file paths for stability)
5. `lockfile.js` reads/writes `skills-lock.json` in the user's project root (includes saved `targets` array)

### Key Files

- **`skills.json`** -- Ships with the package. Lists GitHub repos and which skill directories to extract. Users don't edit this.
- **`skills-lock.json`** -- Written to the user's project root. Records installed skills with source repo, content hash, and selected targets.
- **`.agents/skills/`** -- Canonical download location for raw skills. Directly serves most IDEs.
- **`.claude/skills/`** -- Contains symlinks pointing to `.agents/skills/` for Claude Code.
- **`colors.js`** -- Chalk-based color helpers and text-based status indicators (no emoji).

### Supported IDEs

| IDE | Discovery | Symlink Needed? |
|-----|-----------|-----------------|
| Amp | `.agents/skills/` | No |
| Antigravity | `.agents/skills/` | No |
| Claude Code | `.claude/skills/` | Yes |
| Cline | `.agents/skills/` | No |
| Codex | `.agents/skills/` | No |
| Cursor | `.agents/skills/` | No |
| Gemini CLI | `.agents/skills/` | No |
| GitHub Copilot | `.agents/skills/` | No |
| Kimi Code CLI | `.agents/skills/` | No |
| OpenCode | `.agents/skills/` | No |

## CI/CD

GitHub Actions workflow (`.github/workflows/publish.yml`) publishes to npm automatically on push to `main`. Requires an `NPM_TOKEN` secret configured in the repository.

## Dependencies

- **commander** -- CLI framework
- **tar** -- Tarball extraction for GitHub downloads
- **inquirer** -- Interactive prompts for target selection
- **chalk** -- Terminal colors
- **ora** -- Terminal spinners
