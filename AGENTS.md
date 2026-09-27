# Revdo Agent Guide

This project uses antislop as a project-level quality filter for UI, copy, accessibility, responsive layout and code comments.

Read this before changing the website:

1. Read `DESIGN.md` for Revdo's direction.
2. Read `antislop.md` for the core filter.
3. Read the matching skill when the work touches that area:
   - UI and visual work: `skills/antislop-ui/SKILL.md`
   - Copy and text: `skills/antislop-copywriting/SKILL.md`
   - Accessibility and human use: `skills/antislop-human/SKILL.md`
   - Mobile and responsive layout: `skills/antislop-layoutmobile/SKILL.md`
   - Code comments: `skills/antislop-code/SKILL.md`

Apply antislop during project work by default. For review-only requests, use it after the work as an audit filter.

## Project Rules

- Keep the public site content-driven. Do not add generic sections just because landing pages usually have them.
- Do not add fabricated statistics, testimonials, client logos, compliance claims or security claims.
- Do not add decorative emoji, generic hype copy, fake AI badges or filler dashboard data.
- Keep navigation links real. Every menu item must route to an existing view.
- Keep every interactive control functional.
- Keep mobile layout verified across narrow, tablet and desktop widths.
- Keep admin security conservative. Do not expose `.env`, `data/`, `.git/`, `skills/`, source files or internal docs through static routes.
- Keep comments short. Add comments only when they explain a constraint, risk or non-obvious behavior.

## Delivery Gate

Before shipping UI or admin changes:

- Run `npm run check`.
- Run `npm test`.
- Start the server with `npm start`.
- Verify `/`, `/admin`, `/api/site` and admin login.
- Check mobile navigation, keyboard navigation, form behavior and upload behavior.
- Confirm no secret token is present in tracked files using:

```bash
rg -n "github_pat|TOKEN|SECRET|PASSWORD|PRIVATE_KEY" -S . -g '!/.git/**'
```

## Git

Use `docs/GIT_WORKFLOW.md` for commit, branch, push, rollback and release workflow.
