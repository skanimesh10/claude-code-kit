# CLAUDE.md

## Project Overview

**claude-code-kit** (`cc-kit`) is a CLI that installs Claude Code skills from GitHub into any project. It downloads skill directories from configured repositories, places them into `.claude/skills/`, and tracks installed versions via a lockfile.

## Architecture

```
bin/cc-kit.js          — CLI entry point (commander)
src/commands/
  init.js              — First-time skill installation
  update.js            — Re-download and detect changes
  status.js            — Show install state of each skill
src/lib/
  config.js            — Read bundled skills.json registry
  github.js            — Download & extract repo tarballs
  lockfile.js          — Read/write skills-lock.json
  skills.js            — Hash skill directories for change detection
skills.json            — Bundled registry of skill sources (ships with package)
```

## Key Concepts

- **`skills.json`** — Ships with the package. Lists GitHub repos and which skill directories to extract from each. Users don't create or edit this file.
- **`skills-lock.json`** — Written to the user's project root. Records installed skills with their source repo and content hash.
- **`.claude/skills/`** — Install target directory in the user's project. Each subdirectory is one skill.

## Commands

```bash
node bin/cc-kit.js init          # Download and install skills (first time)
node bin/cc-kit.js init --force  # Re-download even if already installed
node bin/cc-kit.js update        # Re-download and report new/changed skills
node bin/cc-kit.js status        # Show per-skill status (OK, MISSING, MODIFIED, UNTRACKED)
```

## Dependencies

- **commander** — CLI framework
- **tar** — Tarball extraction for GitHub downloads
- **Node 18+** — Uses native `fetch` (no polyfill)

## Config Resolution

`skills.json` is resolved relative to the package installation directory using `import.meta.url`, not the user's working directory. This means it always finds the bundled registry regardless of where `cc-kit` is invoked from.

## Testing

Manual testing (no test framework configured):

```bash
cd /tmp && rm -rf test-cc-kit && mkdir test-cc-kit && cd test-cc-kit
node /path/to/claude-code-kit/bin/cc-kit.js init
node /path/to/claude-code-kit/bin/cc-kit.js status
node /path/to/claude-code-kit/bin/cc-kit.js update
```
