# claude-code-kit

A CLI tool to install and manage [Claude Code](https://claude.ai/code) skills from GitHub into any project.

## What it does

`cc-kit` downloads skill directories from configured GitHub repositories, places them into `.claude/skills/` in your project, and tracks installed versions via a lockfile (`skills-lock.json`) for change detection.

## Installation

```bash
npm install -g claude-code-kit
```

Or run directly with `npx`:

```bash
npx claude-code-kit init
```

## Requirements

- Node.js 18 or later

## Usage

### Install skills

```bash
cc-kit init
```

Downloads all configured skills into `.claude/skills/` and creates a `skills-lock.json` lockfile.

Use `--force` to re-download even if skills are already installed:

```bash
cc-kit init --force
```

### Update skills

```bash
cc-kit update
```

Re-downloads all skills and reports which ones are new or have changed.

### Check status

```bash
cc-kit status
```

Compares the lockfile against on-disk skills and reports per-skill status:

| Status      | Meaning                                      |
|-------------|----------------------------------------------|
| `ok`        | Installed and matches the lockfile hash       |
| `MISSING`   | In the lockfile but not found on disk         |
| `UNTRACKED` | On disk but not tracked in the lockfile       |
| `MODIFIED`  | On disk but contents differ from the lockfile |

## How it works

1. `cc-kit` ships with a bundled `skills.json` registry that lists GitHub repos and which skill directories to extract from each.
2. On `init` or `update`, it fetches repo tarballs from GitHub, extracts the specified skill directories into `.claude/skills/`, and records content hashes in `skills-lock.json`.
3. `status` compares on-disk state against the lockfile to detect missing, modified, or untracked skills.

## Project structure

```
bin/cc-kit.js          — CLI entry point
src/commands/
  init.js              — First-time skill installation
  update.js            — Re-download and detect changes
  status.js            — Show install state of each skill
src/lib/
  config.js            — Read bundled skills.json registry
  github.js            — Download & extract repo tarballs
  lockfile.js          — Read/write skills-lock.json
  skills.js            — Hash skill directories for change detection
skills.json            — Bundled skill source registry
```

## Author

**Animesh Swain**

## License

MIT
