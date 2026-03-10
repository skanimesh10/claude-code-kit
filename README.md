# claude-code-kit

A CLI tool to install and manage AI coding skills from GitHub across multiple IDEs — [Claude Code](https://claude.ai/code), [Cursor](https://cursor.com), [VS Code / Copilot](https://code.visualstudio.com), and [Google Antigravity](https://developers.google.com).

## What it does

`cc-kit` downloads skill directories from configured GitHub repositories into a canonical `.localagent/` directory, transforms them into each IDE's expected format, and creates symlinks into the IDE's config directory. Installed versions are tracked via a lockfile (`skills-lock.json`) for change detection.

### Supported IDEs

| IDE | Config Directory | Format |
|-----|-----------------|--------|
| Claude Code | `.claude/skills/` | Raw skill directories |
| Cursor | `.cursor/rules/` | `.mdc` files with frontmatter |
| VS Code / Copilot | `.github/instructions/` | `.instructions.md` files with frontmatter |
| Antigravity | `.agent/skills/` | Skill directories with `SKILL.md` |

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

Prompts you to select which IDEs to install skills for, downloads all configured skills into `.localagent/skills/`, transforms them for each selected target, creates symlinks, and writes `skills-lock.json`.

Use `--force` to re-download even if skills are already installed (reuses previously saved target selections):

```bash
cc-kit init --force
```

### Update skills

```bash
cc-kit update
```

Re-downloads all skills, re-transforms for saved targets, re-creates symlinks, and reports which ones are new or have changed.

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

## Included skills

| Skill | Source | Description |
|-------|--------|-------------|
| `mcp-builder` | [anthropics/skills](https://github.com/anthropics/skills) | Guide for creating MCP (Model Context Protocol) servers that enable LLMs to interact with external services |
| `frontend-design` | [anthropics/skills](https://github.com/anthropics/skills) | Frontend design patterns and best practices |
| `react-best-practices` | [vercel-labs/agent-skills](https://github.com/vercel-labs/agent-skills) | React development best practices and conventions |

## How it works

1. `cc-kit` ships with a bundled `skills.json` registry that lists GitHub repos and which skill directories to extract from each.
2. On `init`, it prompts for target IDEs, downloads skills into `.localagent/skills/`, transforms them per target, creates symlinks from IDE directories (e.g. `.cursor/rules/`) back to `.localagent/`, and records content hashes + selected targets in `skills-lock.json`.
3. On `update`, it re-downloads, re-transforms, and re-symlinks for saved targets, reporting new/changed skills.
4. `status` compares on-disk state against the lockfile and checks symlink health for each target.

## Project structure

```
claude-code-kit/
├── bin/
│   └── cc-kit.js              — CLI entry point
├── src/
│   ├── commands/
│   │   ├── init.js            — First-time skill installation with target prompts
│   │   ├── update.js          — Re-download, re-transform, and detect changes
│   │   └── status.js          — Show skill state and per-target symlink health
│   └── lib/
│       ├── colors.js          — ANSI color helpers and Unicode icons
│       ├── config.js          — Read bundled skills.json registry
│       ├── github.js          — Download & extract repo tarballs
│       ├── lockfile.js        — Read/write skills-lock.json
│       ├── skills.js          — Hash skill directories for change detection
│       └── targets.js         — IDE target registry, transforms, and symlinks
├── .github/
│   └── workflows/
│       └── publish.yml        — CI/CD: publish to npm on push to main
├── skills.json                — Bundled skill source registry
├── package.json
├── RELEASE_NOTES.md
├── CLAUDE.md
└── README.md
```

## Author

**Animesh Swain**

## License

MIT
