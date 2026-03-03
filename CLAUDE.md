# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

**claude-code-kit** (`cc-kit`) is a CLI that installs Claude Code skills from GitHub into any project. It downloads skill directories from configured repositories, places them into `.claude/skills/`, and tracks installed versions via a lockfile.

## Commands

```bash
node bin/cc-kit.js init          # Download and install skills (first time)
node bin/cc-kit.js init --force  # Re-download even if already installed
node bin/cc-kit.js update        # Re-download and report new/changed skills
node bin/cc-kit.js status        # Show per-skill status (OK, MISSING, MODIFIED, UNTRACKED)
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
2. `github.js` fetches repo tarballs from GitHub, streams them through `tar` extraction with a filter that selects only requested skill directories (strips 2 path levels: `<repo-sha>/skills/`)
3. `skills.js` computes deterministic SHA-256 hashes over skill directory contents (includes relative file paths for stability)
4. `lockfile.js` reads/writes `skills-lock.json` in the user's project root

### Key Files

- **`skills.json`** — Ships with the package. Lists GitHub repos and which skill directories to extract. Users don't edit this.
- **`skills-lock.json`** — Written to the user's project root. Records installed skills with source repo and content hash.
- **`.claude/skills/`** — Install target in the user's project. Each subdirectory is one skill.

## Dependencies

- **commander** — CLI framework
- **tar** — Tarball extraction for GitHub downloads
