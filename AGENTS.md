# AGENTS.md

## Project Overview

This is `apvl.dev`, Alex's personal website. Treat it as a small, personal, content-first Astro site rather than a generic portfolio template. The site should stay minimal, fast, a little playful, and written in Alex's own voice.

## Stack

- Astro 5 with static output.
- TypeScript.
- MDX via `@astrojs/mdx`.
- Sitemap via `@astrojs/sitemap`.
- Three.js for the persistent WebGL noise background.
- Package manager: `pnpm`.

Useful commands:

```bash
pnpm dev
pnpm build
pnpm preview
```

## Project Structure

- `src/pages/` contains file-based routes.
- `src/layouts/` contains shared page shells.
- `src/components/` contains reusable Astro components.
- `src/content/` contains MDX content collections.
- `src/content/config.ts` defines the `thoughts` and `stuff` schemas.
- `src/styles/global.css` defines theme tokens, reset, layout utilities, and global element styles.
- `src/styles/prose.css` defines article/MDX typography.
- `src/scripts/` contains browser-only behavior used by Astro components.
- `src/data/` contains typed data used by content-driven components, currently chart data.
- `public/` contains static assets such as favicons, OG image, audio, and manifest files.

## Routing And Layouts

- `/` uses `src/pages/index.astro` and renders the `Hero` component.
- `/thoughts` lists non-draft entries from the `thoughts` collection.
- `/thoughts/[...slug]` renders individual thought posts with `ThoughtPost`.
- `/stuff` lists entries from the `stuff` collection.
- `/stuff/[...slug]` renders individual project/writeup pages.
- `/credits` is a static page for inspiration credits.
- `/404` is the custom not-found page.

`BaseLayout.astro` is the main shell. It adds:

- `BaseHead`
- global CSS
- `NoiseBackground`
- page slot inside `<main class="main">`
- `Footer`
- desktop `NavPanel`
- mobile `MobileNav`
- theme setup
- desktop keybind setup
- external prose link handling

`ThoughtPost.astro` is only for entries in the `thoughts` collection and imports `prose.css`.

## Components

- `BaseHead.astro`: metadata, canonical URL, favicons, Open Graph/Twitter tags, JSON-LD, Astro `ClientRouter`, and inline theme bootstrapping to avoid FOUC.
- `Hero.astro`: homepage intro, signature SVG animation, social links, and links to `/stuff` and `/thoughts`.
- `SocialLinks.astro`: external profile links and clipboard email copy interaction.
- `Footer.astro`: copyright, credits link, and source link.
- `BlogCard.astro`: timeline-style card for thought posts.
- `ProjectCard.astro`: compact project card for the `stuff` listing.
- `NavPanel.astro`: desktop keyboard-navigation panel shown above the bottom-right nav bar.
- `MobileNav.astro`: mobile hamburger button, overlay, bottom sheet navigation, theme toggle, music toggle, and drag-to-close gesture.
- `NoiseBackground.astro`: persistent full-screen WebGL background connected to music-player audio levels.
- `MultiSeriesChart.astro`: interactive SVG chart used inside MDX posts.

Prefer Astro components for static UI. Add browser scripts only when behavior is actually interactive.

## Client Behavior

The site uses Astro view transitions through `ClientRouter`, so client-side state needs extra care.

- Re-run DOM setup on `astro:page-load` when the DOM changes after navigation.
- Use `astro:after-swap` for state that must be restored immediately after a transition swap.
- Avoid attaching duplicate event listeners across transitions.
- Keep persistent state on `window` only when it intentionally survives route changes.

Current browser modules:

- `theme.ts`: light/dark theme, localStorage persistence, global `toggleTheme`, and `themechange` event.
- `keybinds.ts`: desktop shortcuts and view-transition navigation.
- `mobile-nav.ts`: mobile bottom sheet state, gestures, escape handling, and localStorage persistence.
- `music-player.ts`: lazy AudioContext setup, persistent audio element, analyser data, and audio callbacks.
- `noise-background.ts`: Three.js shader background, theme response, audio response, resize handling, and cleanup.

Desktop keybinds:

- `n`: toggle navigation panel.
- `h`: home.
- `s`: stuff.
- `t`: thoughts.
- `0`: toggle theme.
- `m`: toggle music.
- `Backspace`: browser back.

## Content Collections

`thoughts` entries live under `src/content/thoughts/<slug>/index.mdx`.

Required frontmatter:

```yaml
title: "post title"
description: "short description"
pubDate: 2026-01-01
```

Optional frontmatter:

```yaml
updatedDate: 2026-01-02
draft: true
tags: ["tag"]
cover: "./cover.jpg"
```

`draft: true` excludes a thought from listing and static paths.

`stuff` entries live under `src/content/stuff/<slug>/index.mdx`.

Required frontmatter:

```yaml
title: "project title"
description: "short project description"
pubDate: 2026-01-01
```

Optional frontmatter:

```yaml
github: "https://github.com/..."
demo: "https://..."
tech: ["astro", "typescript"]
collaborators:
  - name: "Cristi"
    url: "https://example.com"
  - name: "Vasile"
cover: "./cover.jpg"
```

`collaborators` is only for `stuff` entries. Do not include Alex; the site already implies the post/project is his. Names render on project detail pages as `built alongside: ...`; `url` is optional and opens externally when present.

Use MDX imports when a post needs local components or data, as in the half-marathon post importing `MultiSeriesChart` and chart data.

## Writing Style

The voice is personal, direct, and reflective. Preserve it.

- Use first person when the content is about Alex's experience.
- Prefer short paragraphs.
- Keep the tone grounded, honest, and conversational.
- Lowercase headings and much of the UI copy are intentional: `thoughts`, `stuff`, `credits`, `hello, I'm`, `random thoughts and ideas`.
- Do not make content sound corporate, over-polished, or like marketing copy.
- Avoid generic portfolio filler such as "passionate developer" unless Alex explicitly asks for that tone.
- Personal posts usually tell a small story: context, tension, what happened, what was learned.
- Project posts should stay practical: what it is, features, and technical details.
- External links inside prose are automatically opened in a new tab by `BaseLayout`.

## Visual And CSS Conventions

- Use CSS custom properties from `global.css` for colors, spacing, font sizes, radii, transitions, shadows, z-index, and widths.
- The design uses a mono font stack, compact spacing, quiet cards, subtle borders, and sky-blue accents.
- Keep layouts centered around `--max-width` unless a feature truly needs more space.
- Use `.page`, `.page-header`, `.page-title`, `.page-description`, and `.empty-state` before inventing new page structure.
- Use `prose.css` for rendered MDX/article content.
- Keep mobile behavior explicit with the existing `640px` breakpoint.
- Keep the background layer non-interactive and behind content.
- Preserve focus styles and accessible labels when adding interactive controls.

## SEO And Metadata

- Pages should pass meaningful `title` and `description` props to `BaseLayout`.
- `BaseHead` already handles canonical URLs, Open Graph, Twitter metadata, favicons, manifest, JSON-LD, and theme bootstrapping.
- Use the configured site URL, `https://apvl.dev`, from `astro.config.mjs`.
- If adding pages that should appear in search results, make sure their titles and descriptions are specific.

## Implementation Notes

- Follow existing quote style in the file being edited; the repo currently has both double-quoted Astro files and single-quoted code in `theme.ts`.
- Keep generated JavaScript minimal. Astro should ship mostly static HTML unless interaction is needed.
- When adding interactive Astro component scripts, account for view transitions and repeated initialization.
- Do not eagerly create audio contexts; keep audio setup user-gesture driven.
- When touching the WebGL background, preserve cleanup paths and resize/theme listeners.
- When editing navigation, keep desktop and mobile behavior in sync conceptually, but respect their separate implementations.
- When adding content, prefer schema-validated frontmatter over ad hoc data.
- Run `pnpm build` before considering structural, routing, content schema, or component changes done.
