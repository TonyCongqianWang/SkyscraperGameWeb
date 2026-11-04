# SkyscraperGameWeb

A browser-playable Skyscrapers game hosted on GitHub Pages.

**Play:** https://tonycongqianwang.github.io/SkyscraperGameWeb/

## Curated puzzles

The game imports the static browser API from
[SkyscraperSolver](https://github.com/TonyCongqianWang/SkyscraperSolver)
at `/assets/puzzles/puzzles.js`. Sizes 4–9 and all eight difficulty levels
(`very_easy`, `easy`, `medium`, `hard`, `very_hard`, `extreme`,
`extreme_plus`, `extreme_plus_plus`) use availability metadata and
size/difficulty-sharded JSON. Missing combinations remain unavailable.

Each curated puzzle shows a small versioned ID beneath the title and puts
the same ID in the `?puzzle=` query parameter. Copy the address bar URL to
share the puzzle; opening it loads the exact record through
`getPuzzleById()`. The Load puzzle field also accepts a versioned ID
directly. The format is `v1:<size>:<difficulty>:<original-id>`.
Normal local/imported puzzles have no curated ID and clear that parameter.

If curated loading fails, the current board remains playable; the local
generator works offline and the Retry curated puzzle button is available.
A shared URL remains intact when its initial load fails, so it can be retried.

**Deployment dependency:** Merge and publish
[SkyscraperSolver PR #20](https://github.com/TonyCongqianWang/SkyscraperSolver/pull/20)
before deploying this frontend. The new API is not yet available on the
production solver site until that PR is merged and Pages redeploys.

## Gameplay

- Sizes 4×4 through 9×9, pen number entry, undo, clickable clue checks, and automatic or manual domains.
- In **Manual domains**, switch between **Use pencil** (toggle any candidate, including currently impossible heights) and **Use pen** (enter a height). Manual notes remain unchanged across pen placements and ordinary Undo.
- **Auto domains** shows calculated candidates and disables Pencil. Switching back reveals the separately stored manual notes.
- Loading a new puzzle clears manual notes. The temporary **Undo load** action restores the previous grid, notes, and input/domain modes.
- Load and copy puzzle strings in the desktop game's quoted clue/grid format.
- Open curated puzzles by their versioned IDs and share them by URL.
- Responsive layout for desktop and mobile.
- Locally generated puzzles always have at least one solution, but uniqueness
  and difficulty are not guaranteed.

## Deployment

Use **Settings → Pages → Build and deployment → GitHub Actions**.
The workflow `.github/workflows/deploy.yml` deploys on pushes to `main`.
For local development, serve the directory with a static HTTP server;
the curated API requires network access.
