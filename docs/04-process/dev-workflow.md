# Development Workflow

## Daily Development Loop

### 🌅 Starting Work

1. **Get Context**
   ```
   Read: CONTEXT.md → Current focus
   Check: docs/03-logs/implementation-log.md → Recent changes
   Review: docs/02-features/<current-feature>/tasks.md → What's next
   ```

2. **Pick a Task**
   - Find the next unchecked task
   - Mark it as in-progress: `[/]`

### 💻 During Work

1. **Before Major Changes**
   - Check if there's a tech-design.md
   - Review existing patterns in codebase

2. **While Coding**
   - Follow conventions in AGENTS.md
   - Commit frequently with clear messages

3. **After Each Task**
   - Mark task complete: `[x]`
   - Update implementation-log.md

### 🌙 Ending Work

1. **Update Logs**
   - Add entry to implementation-log.md
   - Note any decisions in decisions-log.md

2. **Update Status**
   - Update CONTEXT.md "What's Being Worked On"
   - Update feature status in docs/02-features/README.md

## Git Workflow

### Commit Message Format
```
type(scope): description

[optional body]

[optional footer]
```

Types: `feat`, `fix`, `docs`, `style`, `refactor`, `test`, `chore`

Examples:
- `feat(auth): add Google Sign-In`
- `fix(dashboard): resolve useSearchParams SSR issue`
- `docs: update README with deployment instructions`

### Branch Naming
- Feature: `feature/<feature-name>`
- Bug fix: `fix/<bug-description>`
- Hotfix: `hotfix/<issue>`
- Docs: `docs/<description>`

## Project Commands

| Command | Description |
|---------|-------------|
| `npm run dev` | Start dev server at localhost:3000 |
| `npm run build` | Build static export to `out/` |
| `npm run lint` | Run ESLint |

## Deployment

Static export is deployed via Cloudflare MCP tool:
```bash
npm run build
# Then use mcp_cloudflare-deployer_deploy_to_cloudflare
```

Or manually:
```bash
npx wrangler pages deploy out --project-name innovative-archive
```
