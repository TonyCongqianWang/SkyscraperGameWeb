# SkyscraperGameWeb

A browser-playable Skyscrapers game hosted on GitHub Pages.

**Play:** https://tonycongqianwang.github.io/SkyscraperGameWeb/

## Curated puzzles

The game imports the browser-side curated API from [SkyscraperSolver](https://github.com/TonyCongqianWang/SkyscraperSolver) and reads availability metadata for grid sizes 4–9 and seven difficulty bands. Difficulty options with zero available puzzles are disabled; counts appear in the selector. The game fetches a random curated puzzle for the selected combination.

If metadata or puzzle fetching fails, the existing Latin-square generator supplies a playable local puzzle. The game displays a warning that local puzzles are not guaranteed unique or difficulty-calibrated and provides a **Retry curated puzzle** button. A successful retry replaces the fallback board. The current board remains playable while the request is pending.

**Deployment dependency:** The SkyscraperSolver API from [PR #18](https://github.com/TonyCongqianWang/SkyscraperSolver/pull/18) must be merged and published before curated requests can succeed. Until then the fallback generator is used.

## Gameplay

- Sizes 4×4 through 9×9, number entry, undo, clue checks, and domain display.
- Load and copy puzzle strings in the desktop game's quoted clue/grid format.
- Responsive layout for desktop and mobile.
- Locally generated puzzles always have at least one solution, but uniqueness and difficulty are not guaranteed.

## Deployment

Use **Settings → Pages → Build and deployment → GitHub Actions**. The workflow `.github/workflows/deploy.yml` deploys on pushes to `main`. For local development, serve the directory with a static HTTP server; the curated API requires network access.
