# Claude Code Workflow Cheatsheet

> Reference guide for Claude Code CLI — commands, shortcuts, hooks, MCP, and more.

---

## Table of Contents

1. [CLI Commands & Flags](#1-cli-commands--flags)
2. [Slash Commands](#2-slash-commands)
3. [Keyboard Shortcuts](#3-keyboard-shortcuts)
4. [CLAUDE.md — Memory & Instructions](#4-claudemd--memory--instructions)
5. [MCP — Model Context Protocol](#5-mcp--model-context-protocol)
6. [Hooks — Automation](#6-hooks--automation)
7. [Permissions & Trust](#7-permissions--trust)
8. [Multi-agent / Subagents](#8-multi-agent--subagents)
9. [IDE Integrations](#9-ide-integrations)
10. [Settings Files](#10-settings-files)
11. [Tips & Best Practices](#11-tips--best-practices)
12. [Quick Reference Card](#12-quick-reference-card)

---

## 1. CLI Commands & Flags

### Core Commands

| Command | Description |
|---------|-------------|
| `claude` | Start interactive session |
| `claude "query"` | Start with initial prompt |
| `claude -p "query"` | Print mode — query then exit |
| `claude -c` | Continue most recent conversation |
| `claude -r "session"` | Resume session by ID or name |
| `claude update` | Update to latest version |
| `claude auth login` | Sign in to Anthropic account |
| `claude auth status` | Show auth status as JSON |
| `claude mcp` | Configure MCP servers |

### Essential Flags

| Flag | Description |
|------|-------------|
| `--model` | Set model (`sonnet`, `opus`, or full ID) |
| `-n "name"` | Name this session |
| `-p` | Print mode (non-interactive) |
| `-c` | Continue last conversation |
| `-r "name"` | Resume named session |
| `-w "branch"` | Start in isolated git worktree |
| `--add-dir ../lib` | Add extra working directories |
| `--permission-mode plan` | Begin in plan mode (no execution) |
| `--dangerously-skip-permissions` | Skip all permission prompts |
| `--allowedTools "Bash(npm *)" "Read"` | Pre-approve specific tools |
| `--disallowedTools "Bash(git push *)"` | Block specific tools |
| `--output-format json` | JSON output (use with `-p`) |
| `--max-turns 3` | Limit agentic turns (use with `-p`) |
| `--max-budget-usd 5.00` | Max spend cap |
| `--system-prompt "..."` | Override system prompt |
| `--append-system-prompt "..."` | Append to system prompt |
| `--mcp-config ./mcp.json` | Load MCP servers from file |
| `--debug "hooks"` | Debug specific subsystem |
| `--verbose` | Show full turn-by-turn output |
| `--version` | Show version number |

---

## 2. Slash Commands

Type `/` in an active session to see all commands.

| Command | Description |
|---------|-------------|
| `/help` | Show help menu |
| `/clear` | Start a new session (clears context) |
| `/compact [instructions]` | Summarize conversation to free context |
| `/rewind` | Restore conversation/code to a previous state |
| `/rename` | Rename current session |
| `/resume` | Show session picker |
| `/memory` | View/edit CLAUDE.md and auto-memory files |
| `/permissions` | View and manage tool permissions |
| `/hooks` | Browse configured hooks |
| `/config` | Open settings interface |
| `/add-dir` | Add additional working directory |
| `/agents` | List and invoke subagents |
| `/mcp` | Manage MCP servers |
| `/cost` | View token usage and API costs |
| `/init` | Generate CLAUDE.md from codebase |
| `/doctor` | Check for configuration issues |
| `/vim` | Enable vim keybindings |
| `/btw` | Ask a side question (ephemeral, no context) |
| `/commit` | Create a git commit |
| `/pr` | Create a pull request |
| `/review` | Review recent changes |
| `/simplify` | Review changed code for quality |

---

## 3. Keyboard Shortcuts

### General

| Key | Action |
|-----|--------|
| `Enter` | Submit prompt |
| `Ctrl+C` | Interrupt / cancel current operation |
| `Ctrl+D` | Exit Claude Code |
| `Ctrl+L` | Redraw screen |
| `Ctrl+O` | Toggle verbose transcript |
| `Ctrl+R` | Reverse history search |
| `Ctrl+T` | Toggle task list |
| `Shift+Tab` | Cycle permission modes |
| `Alt+P` (or `Option+P`) | Switch model |
| `Alt+T` (or `Option+T`) | Toggle extended thinking |
| `Alt+O` (or `Option+O`) | Toggle fast mode |
| `Esc Esc` | Open rewind / summarize menu |
| `↑ / ↓` | Navigate command history |
| `/` at start | Slash command or skill completion |
| `!` at start | Bash mode — runs shell command directly |
| `@` | File path autocomplete |
| `Ctrl+B` | Background running task |

### Multiline Input

| Method | Works in |
|--------|----------|
| `\` + `Enter` | All terminals |
| `Option+Enter` | macOS |
| `Shift+Enter` | iTerm2, WezTerm, Ghostty, Kitty |
| Paste code block | All terminals |

---

## 4. CLAUDE.md — Memory & Instructions

### What is CLAUDE.md?

A Markdown file that gives Claude **persistent instructions** across all sessions. Claude reads it at the start of every conversation.

### File Locations (by scope)

| Scope | Location | Shared in git? |
|-------|----------|---------------|
| Organization | `/etc/claude-code/CLAUDE.md` (Linux) | Deployed by IT |
| Project (team) | `./CLAUDE.md` or `./.claude/CLAUDE.md` | Yes |
| User (personal) | `~/.claude/CLAUDE.md` | No |
| Local (per-project) | `./CLAUDE.local.md` | No (gitignore it) |

### What to Include

```markdown
# Build & Test
- `npm run dev` to start dev server
- `npm test` to run tests
- `npm run build` for production build

# Code Style
- Use ES modules (import/export)
- 2-space indentation
- Trailing commas in objects

# Architecture
- API routes in `app/api/`
- Components in `app/components/`
- Never commit secrets to git

# Git Workflow
- Branch from `main`
- Run tests before committing
- Write descriptive commit messages
```

### What NOT to Include

- Things Claude can infer from the code
- Standard language conventions
- Long tutorials or explanations
- File-by-file code descriptions

### Tips

- **Keep under 200 lines** — longer files may be ignored
- **Import other files**: `@path/to/file` syntax
- **Check into git** to share team instructions

### Auto Memory

Claude automatically saves notes to `~/.claude/projects/<project>/memory/MEMORY.md`.
First 200 lines load at each session start.

```bash
/memory          # View and manage memory files
```

---

## 5. MCP — Model Context Protocol

### What is MCP?

Connects Claude to external tools, databases, and APIs via specialized servers.

### Configure in `.claude/.mcp.json`

```json
{
  "mcpServers": {
    "github": {
      "type": "stdio",
      "command": "npx",
      "args": ["@modelcontextprotocol/server-github"],
      "env": {
        "GITHUB_PERSONAL_ACCESS_TOKEN": "$GITHUB_TOKEN"
      }
    },
    "postgres": {
      "type": "stdio",
      "command": "npx",
      "args": ["@modelcontextprotocol/server-postgres"],
      "env": {
        "DATABASE_URL": "$DATABASE_URL"
      }
    }
  }
}
```

### CLI Management

```bash
claude mcp add              # Add a new server (interactive)
claude mcp list             # List configured servers
claude mcp remove <name>    # Remove a server
claude mcp update           # Update all servers
```

### Scopes

| Scope | Location | Shared? |
|-------|----------|---------|
| User | `~/.claude/.mcp.json` | All your projects |
| Project | `.claude/.mcp.json` | Team via git |

### Common MCP Servers

| Server | Purpose |
|--------|---------|
| `@modelcontextprotocol/server-github` | GitHub repos, issues, PRs |
| `@modelcontextprotocol/server-postgres` | Query PostgreSQL |
| `@modelcontextprotocol/server-sqlite` | Work with SQLite |
| `@modelcontextprotocol/server-filesystem` | Enhanced file operations |
| `@modelcontextprotocol/server-slack` | Send/read Slack messages |
| `@modelcontextprotocol/server-sentry` | Monitor errors |

---

## 6. Hooks — Automation

### What are Hooks?

Shell commands that run automatically at key points in Claude's workflow.

### Hook Configuration

Add to one of these files:

| File | Scope |
|------|-------|
| `~/.claude/settings.json` | All projects |
| `.claude/settings.json` | Shared (git) |
| `.claude/settings.local.json` | Local only |

### Hook Events

| Event | Fires when |
|-------|-----------|
| `SessionStart` | Session begins or resumes |
| `PreToolUse` | Before tool execution |
| `PostToolUse` | After tool succeeds |
| `PermissionRequest` | Permission dialog appears |
| `Notification` | Claude needs input |
| `Stop` | Claude finishes response |
| `CwdChanged` | Working directory changes |

### Hook Exit Codes

| Code | Meaning |
|------|---------|
| `0` | Allow / success |
| `2` | Block / deny |
| other | Log and proceed |

### Hook Examples

#### Auto-format with Prettier on save

```json
{
  "hooks": {
    "PostToolUse": [
      {
        "matcher": "Edit|Write",
        "hooks": [
          {
            "type": "command",
            "command": "jq -r '.tool_input.file_path' | xargs npx prettier --write"
          }
        ]
      }
    ]
  }
}
```

#### Desktop notification when Claude needs attention

```json
{
  "hooks": {
    "Notification": [
      {
        "matcher": "",
        "hooks": [
          {
            "type": "command",
            "command": "osascript -e 'display notification \"Claude needs your attention\"'"
          }
        ]
      }
    ]
  }
}
```

#### Auto-approve exiting plan mode

```json
{
  "hooks": {
    "PermissionRequest": [
      {
        "matcher": "ExitPlanMode",
        "hooks": [
          {
            "type": "command",
            "command": "echo '{\"hookSpecificOutput\": {\"hookEventName\": \"PermissionRequest\", \"decision\": {\"behavior\": \"allow\"}}}'"
          }
        ]
      }
    ]
  }
}
```

---

## 7. Permissions & Trust

### Permission Modes

| Mode | Description |
|------|-------------|
| `default` | Prompts first time for each tool |
| `acceptEdits` | Auto-accepts file edits |
| `plan` | Read-only analysis, no execution |
| `auto` | Background classifier approves safe actions |
| `bypassPermissions` | Skip all prompts (for containers/VMs) |

### Set Default Mode

```json
// .claude/settings.json
{
  "defaultMode": "acceptEdits"
}
```

Or per-session:
```bash
claude --permission-mode plan
```

Or press `Shift+Tab` to cycle modes in-session.

### Permission Rules

```json
{
  "permissions": {
    "allow": [
      "Bash(npm run *)",
      "Bash(npm test)",
      "Bash(git status)",
      "Bash(git log *)",
      "Bash(git diff)",
      "Read",
      "Edit"
    ],
    "ask": [
      "Bash(git push *)"
    ],
    "deny": [
      "Bash(rm -rf *)",
      "Bash(sudo *)"
    ]
  }
}
```

> **Deny always wins** — deny > ask > allow > prompt.

### Rule Syntax

| Pattern | Matches |
|---------|---------|
| `Bash` | All bash commands |
| `Bash(npm run *)` | Any `npm run` command |
| `Edit(.env)` | Edits to `.env` only |
| `WebFetch(domain:github.com)` | Fetches to github.com |
| `mcp__github__*` | All GitHub MCP tools |

---

## 8. Multi-agent / Subagents

### What are Subagents?

Specialized AI assistants that handle specific tasks in their own context, keeping the main conversation clean.

### Create a Subagent

Save to `.claude/agents/<name>.md`:

```markdown
---
name: code-reviewer
description: Review code for bugs, performance issues, and style
tools: Read, Grep, Glob, Bash
model: opus
---

You are a senior code reviewer. When asked to review:
1. Read the relevant files
2. Check for bugs, performance issues, and security
3. Verify it follows project conventions
4. Provide specific line references with suggested fixes
```

### Configuration Options

```markdown
---
name: subagent-name
description: What this agent does (used for auto-delegation matching)
tools: Read, Grep, Bash, Edit, Write
model: haiku       # opus, sonnet, or haiku
disabled: false
---
```

### Invoke Subagents

```
Use a subagent to review this PR for security issues
```

```
/agents    # List and invoke subagents interactively
```

### Parallel Worktrees

```bash
claude -w feature-a    # Isolated branch + context
claude -w feature-b    # Another isolated branch
```

Each worktree has its own git branch, context window, and can be backgrounded independently.

---

## 9. IDE Integrations

### VS Code

1. Extensions → search **Claude Code** → Install
2. Open panel: `Cmd+Shift+L` (Mac) / `Ctrl+Shift+L` (Windows/Linux)
3. Reference files with `@filename`
4. Browse past sessions in sidebar

### JetBrains (IntelliJ, PyCharm, WebStorm, etc.)

1. Settings → Plugins → Marketplace → **Claude Code** → Install
2. Restart IDE
3. Configure at Preferences → Tools → Claude Code

---

## 10. Settings Files

### Precedence (highest to lowest)

1. Managed org settings (`/etc/claude-code/settings.json`)
2. CLI flags (`--model`, `--permission-mode`, etc.)
3. Local project (`.claude/settings.local.json`)
4. Shared project (`.claude/settings.json`)
5. User (`~/.claude/settings.json`)

### Full Example `settings.json`

```json
{
  "defaultMode": "acceptEdits",
  "model": "claude-sonnet-4-6",
  "autoMemoryEnabled": true,
  "permissions": {
    "allow": [
      "Bash(npm *)",
      "Bash(git status)",
      "Bash(git log *)",
      "Bash(git diff)",
      "Read",
      "Edit"
    ],
    "ask": [
      "Bash(git push *)"
    ],
    "deny": [
      "Bash(rm -rf *)"
    ]
  },
  "hooks": {
    "PostToolUse": [
      {
        "matcher": "Edit|Write",
        "hooks": [
          {
            "type": "command",
            "command": "npx eslint --fix || true"
          }
        ]
      }
    ]
  }
}
```

### Common Settings

| Key | Values | Purpose |
|-----|--------|---------|
| `defaultMode` | `default` `acceptEdits` `plan` `auto` `bypassPermissions` | Default permission mode |
| `model` | `sonnet` `opus` or full model ID | Default model |
| `autoMemoryEnabled` | `true` / `false` | Auto memory notes |
| `disableAllHooks` | `true` / `false` | Disable all hooks |
| `claudeMdExcludes` | Glob array | Skip specific CLAUDE.md files |
| `additionalDirectories` | Path array | Extra working directories |

---

## 11. Tips & Best Practices

### Manage Context Window

```
/clear          → Start fresh for unrelated task
/compact        → Summarize to free context
/cost           → Check token usage
Esc Esc         → Rewind to earlier state
/btw            → Quick side question (not saved to context)
```

### Effective Prompting

**Be specific:**
```
Fix the 401 error in src/auth/sessionManager.ts that fires
when the token expires. Run tests after fixing.
```

**Give verification steps:**
```
Add pagination to the /api/users endpoint.
Write a test that verifies pages work correctly, run it,
and confirm it passes.
```

**Scope clearly:**
```
Only modify files under src/components/. Don't change the API.
```

### Explore → Plan → Implement Workflow

```
1. claude --permission-mode plan     # Read code safely
2. Ask Claude for a detailed plan
3. Review the plan in your editor
4. Switch to normal mode and implement
5. /commit or /pr when done
```

### Checkpoint and Rewind

Every Claude action creates a checkpoint. To undo:

```
Esc Esc          # Open rewind menu
```

Options: restore conversation, restore code, restore both, or summarize from here.

### Bash Mode (`!`)

Prefix with `!` to run shell commands and add output to context:

```
! npm test
! git status
! cat package.json
```

---

## 12. Quick Reference Card

### Most-Used Commands

| Task | Command |
|------|---------|
| Start session | `claude` |
| Continue last | `claude -c` |
| Resume named | `claude -r "name"` |
| Plan mode | `claude --permission-mode plan` |
| Query & exit | `claude -p "question"` |
| Create isolated branch | `claude -w feature-name` |

### In-Session Shortcuts

| Key | Action |
|-----|--------|
| `Enter` | Submit |
| `Ctrl+C` | Interrupt |
| `Ctrl+D` | Exit |
| `Shift+Tab` | Change permission mode |
| `Esc Esc` | Rewind |
| `Alt+P` | Switch model |
| `/clear` | New session |
| `/compact` | Compress context |
| `/cost` | Check token usage |
| `/memory` | View CLAUDE.md |
| `/hooks` | Browse hooks |
| `/commit` | Create git commit |
| `/pr` | Create pull request |
| `!` | Bash mode |
| `@` | File autocomplete |

---

> Generated with [Claude Code](https://claude.ai/claude-code)
