# claude-code-kit

A CLI tool to install and manage AI coding skills from GitHub across multiple IDEs.

## What it does

`cc-kit` downloads skill directories from configured GitHub repositories into `.agents/skills/`, ensures each skill has a valid `SKILL.md` for discovery, and optionally creates symlinks for IDEs that need them. Installed versions are tracked via a lockfile (`skills-lock.json`) for change detection.

### Supported IDEs

Skills installed in `.agents/skills/` are automatically available to these IDEs (no symlinks needed):

- Amp
- Antigravity
- Cline
- Codex
- Cursor
- Gemini CLI
- GitHub Copilot
- Kimi Code CLI
- OpenCode
- Replit

Claude Code requires symlinks from `.claude/skills/`, which `cc-kit` creates automatically when selected during `init`.

## Installation

```bash
npm install -g @skanimesh10/claude-code-kit
```

Or run directly with `npx`:

```bash
npx @skanimesh10/claude-code-kit init
```

## Requirements

- Node.js 18 or later

## Usage

### Install skills

```bash
cc-kit init
```

Downloads all configured skills into `.agents/skills/`, generates `SKILL.md` files where needed, prompts for additional targets (Claude Code), creates symlinks, and writes `skills-lock.json`.

Use `--force` to re-download even if skills are already installed (reuses previously saved target selections):

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

Compares the lockfile against on-disk skills and reports per-skill status plus per-target symlink health:

| Status      | Meaning                                      |
|-------------|----------------------------------------------|
| `OK`        | Installed and matches the lockfile hash       |
| `MISSING`   | In the lockfile but not found on disk         |
| `UNTRACKED` | On disk but not tracked in the lockfile       |
| `MODIFIED`  | On disk but contents differ from the lockfile |

### Verify installation

```bash
npx skills list
```

Uses the [skills](https://github.com/vercel-labs/skills) CLI to discover all installed skills in `.agents/skills/`.

## Included skills

| Skill | Source | Description |
|-------|--------|-------------|
| `mcp-builder` | [anthropics/skills](https://github.com/anthropics/skills) | Guide for creating MCP (Model Context Protocol) servers |
| `frontend-design` | [anthropics/skills](https://github.com/anthropics/skills) | Frontend design patterns and best practices |
| `react-best-practices` | [vercel-labs/agent-skills](https://github.com/vercel-labs/agent-skills) | React development best practices and conventions |

## How it works

1. `cc-kit` ships with a bundled `skills.json` registry that lists GitHub repos and which skill directories to extract from each.
2. On `init`, it downloads skills into `.agents/skills/`, ensures each has a valid `SKILL.md` (required by `npx skills list` for discovery), prompts for additional targets needing symlinks (Claude Code), and records content hashes + selected targets in `skills-lock.json`.
3. On `update`, it re-downloads, re-creates symlinks for saved targets, and reports new/changed skills.
4. `status` compares on-disk state against the lockfile and checks symlink health for each target.

## Project structure

```
claude-code-kit/
├── bin/
│   └── cc-kit.js              -- CLI entry point
├── src/
│   ├── commands/
│   │   ├── init.js            -- First-time skill installation with target prompts
│   │   ├── update.js          -- Re-download and detect changes
│   │   └── status.js          -- Show skill state and symlink health
│   └── lib/
│       ├── colors.js          -- ANSI color helpers and text-based indicators
│       ├── config.js          -- Read bundled skills.json, shared path constants
│       ├── github.js          -- Download and extract repo tarballs
│       ├── lockfile.js        -- Read/write skills-lock.json
│       ├── skills.js          -- Hash skill directories for change detection
│       └── targets.js         -- Target registry, SKILL.md generation, symlinks
├── .github/
│   └── workflows/
│       └── publish.yml        -- CI/CD: publish to npm on push to main
├── skills.json                -- Bundled skill source registry
├── package.json
├── RELEASE_NOTES.md
├── CLAUDE.md
└── README.md
```

## Author

**Animesh Swain**

## License

MIT
