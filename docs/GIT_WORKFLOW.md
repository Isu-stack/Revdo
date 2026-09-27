# Git Workflow

This repo uses a simple `main` branch workflow.

Repository:

```txt
https://github.com/Isu-stack/Revdo.git
```

## Clone

```bash
git clone https://github.com/Isu-stack/Revdo.git
cd Revdo
```

## Check Status

```bash
git status --short --branch
git log --oneline --max-count=5
```

## Pull Latest Changes

```bash
git pull --rebase origin main
```

Use rebase for a clean linear history. If there is a conflict, fix the file, then run:

```bash
git add <file>
GIT_EDITOR=true git rebase --continue
```

Abort a bad rebase:

```bash
git rebase --abort
```

## Work on a Change

For small direct edits:

```bash
git pull --rebase origin main
# edit files
npm run check
npm test
git status --short
git add .
git commit -m "Describe the change"
git push origin main
```

For larger changes:

```bash
git pull --rebase origin main
git switch -c feature/short-name
# edit files
npm run check
npm test
git add .
git commit -m "Describe the change"
git push -u origin feature/short-name
```

Then open a pull request into `main`.

## Commit Message Style

Use direct messages:

```txt
Harden admin upload handling
Add Git workflow documentation
Update Revdo site content
```

Avoid vague messages:

```txt
update
fix
changes
final
```

## Push With Token

If Git asks for credentials over HTTPS:

```bash
git push origin main
```

Username:

```txt
x-access-token
```

Password:

```txt
<fine-grained-token>
```

Required token permission:

```txt
Repository: Isu-stack/Revdo
Contents: Read and write
Metadata: Read-only
```

Delete or revoke temporary tokens after use.

## Rollback

Revert a bad commit safely:

```bash
git log --oneline
git revert <commit-sha>
git push origin main
```

Do not use `git reset --hard` on shared branches unless you explicitly intend to rewrite history.

## Release Checklist

Before pushing to `main`:

```bash
npm run check
node -e "JSON.parse(require('fs').readFileSync('data/site.json','utf8')); console.log('site json ok')"
rg -n "github_pat|TOKEN|SECRET|PASSWORD|PRIVATE_KEY" -S . -g '!/.git/**'
```

Run locally:

```bash
npm start
```

Verify:

```txt
/
/admin
/api/site
```

Admin checks:

- Login works.
- Save content works.
- Upload accepts WebP, PNG and JPG.
- Upload rejects unsupported file types.
- Logout works.

UI checks:

- Desktop layout holds.
- Mobile menu opens and closes.
- Escape closes the menu.
- Contact form opens email client with prepared body.
- Keyboard focus is visible.
