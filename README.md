# SkyscraperGameWeb

A browser-playable Skyscrapers game hosted on GitHub Pages.

**Play:** https://tonycongqianwang.github.io/SkyscraperGameWeb/

## Gameplay

- Play 4×4 through 9×9 puzzles with pen entry, Undo, and clickable clue checks.
- Switch between calculated candidates (**Auto domains**) and your own pencil notes (**Manual domains**). Manual notes are kept separately from pen entries.
- Load or copy puzzle strings in the desktop game's clue/grid format.
- Open curated puzzles by ID or share them using a URL.
- Use the game on desktop or mobile.

Locally generated puzzles have at least one solution, but uniqueness and difficulty are not guaranteed.

## Curated puzzles

Curated puzzles are supplied by [SkyscraperSolver](https://github.com/TonyCongqianWang/SkyscraperSolver), with sizes 4–9 and eight difficulty levels. Unavailable size/difficulty combinations cannot be selected.

Each curated puzzle has a versioned ID (`v1:<size>:<difficulty>:<original-id>`). You can enter this ID in **Load puzzle** or share its `?puzzle=` URL to load the same puzzle.

If curated loading fails, the current board remains playable and locally generated puzzles remain available.

## Deployment

Set **Settings → Pages → Build and deployment** to **GitHub Actions**. The workflow `.github/workflows/deploy.yml` deploys on pushes to `main`.

For local development, serve the directory with a static HTTP server. Curated puzzles require network access.
