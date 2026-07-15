# AGENTS.md

## Project Overview

**apvl.dev** is Alex's personal website. Treat it as a small, content-first Astro site - minimal, fast, a little playful, written in Alex's own voice. Not a generic portfolio template.

## Stack

- Astro 5 (static), TypeScript, MDX (`@astrojs/mdx`), sitemap, Three.js WebGL background
- Package manager: **pnpm**

```bash
pnpm dev
pnpm build
pnpm preview
```

## Project Structure

```
src/pages/           File-based routes
src/layouts/         BaseLayout, ThoughtPost
src/components/      Hero, NavPanel, MobileNav, NoiseBackground, charts, cards
src/content/         MDX collections (thoughts, stuff) + config.ts schemas
src/styles/          global.css (tokens), prose.css (article typography)
src/scripts/         theme, keybinds, mobile-nav, music-player, noise-background
src/data/            Typed chart data for MDX posts
public/              Favicons, OG image, audio, manifest
```

Routes: `/` (Hero), `/thoughts`, `/stuff`, `/credits`, `/404`. `BaseLayout` wraps all pages with `BaseHead`, `NoiseBackground`, `Footer`, desktop `NavPanel`, mobile `MobileNav`.

## Client Behavior

Uses Astro `ClientRouter` view transitions - re-run DOM setup on `astro:page-load`; restore state on `astro:after-swap`; avoid duplicate listeners.

Browser modules: `theme.ts`, `keybinds.ts`, `mobile-nav.ts` (uses `@alexapvl/drwr`), `music-player.ts`, `noise-background.ts`.

Desktop keybinds: `n` nav panel, `h`/`s`/`t` routes, `0` theme, `m` music, `Backspace` back.

Prefer Astro components for static UI; add client scripts only when interaction is required.

## Content Collections

**thoughts** - `src/content/thoughts/<slug>/index.mdx`

Required: `title`, `description`, `pubDate`. Optional: `updatedDate`, `draft`, `tags`, `cover`. `draft: true` excludes from listings.

**stuff** - `src/content/stuff/<slug>/index.mdx`

Required: `title`, `description`, `pubDate`. Optional: `github`, `demo`, `tech`, `collaborators`, `cover`.

`collaborators` only on stuff entries - do not include Alex. Use MDX imports for local components (e.g. `MultiSeriesChart`).

## Writing Style (apvl.dev only)

Personal, direct, reflective - preserve this voice on this site.

- First person for Alex's experience; short paragraphs; grounded and conversational
- Lowercase headings and UI copy are intentional (`thoughts`, `stuff`, `credits`)
- No corporate/marketing filler ("passionate developer", etc.)
- Personal posts: small story with context, tension, outcome, lesson
- Project posts: practical - what it is, features, technical details

## Visual And CSS

- Use CSS custom properties from `global.css` - mono stack, compact spacing, sky-blue accents
- Reuse `.page`, `.page-header`, `.page-title`, `.page-description`, `.empty-state`
- `prose.css` for MDX content; `640px` mobile breakpoint
- Background layer stays non-interactive behind content; preserve focus styles

## SEO

Pass meaningful `title` and `description` to `BaseLayout`. `BaseHead` handles canonical, OG/Twitter, JSON-LD. Site URL: `https://apvl.dev`.

## Conventions

- Quote style varies by file (double-quoted Astro, single-quoted in `theme.ts`) - match the file being edited
- Ship mostly static HTML; minimal client JS
- AudioContext and WebGL: user-gesture driven; preserve cleanup and resize/theme listeners
- Schema-validated frontmatter over ad hoc data
- Run `pnpm build` before considering structural, routing, schema, or component changes done

### Commit messages

Use collection-scoped prefixes for content, not `feat:` or other generic conventional-commit types:

- **New thought post** — `thought: <short description>`
  - Example: `thought: add Nest agent setup post`
- **New stuff project** — `stuff: <short description>`
  - Example: `stuff: add mytime project card`

Keep code, chore, and infra commits on their usual prefixes (`fix:`, `chore:`, etc.). Content commits should be their own commit — one post or project per commit when possible.

## What To Avoid

- Generic portfolio tone on content or copy
- Eager AudioContext; broken view-transition listener duplication
- Inventing new page layout primitives when existing classes suffice
- Broad refactors for one-off fixes
- Committing unless the user asks
- Editing `README.md` or docs unless requested
