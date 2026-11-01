# SkyscraperGameWeb

A browser-playable Skyscrapers game hosted using GitHub Pages.

**Play:** https://tonycongqianwang.github.io/SkyscraperGameWeb/ (enable Pages first).

## Deployment

Go to **Settings → Pages → Build and deployment** and choose **GitHub Actions**. The workflow `.github/workflows/deploy.yml` deploys the site whenever changes are pushed to `main`. You can also run it manually.

This first version is a standalone static HTML/CSS/JavaScript game with no dependencies or server. Open `index.html` to develop locally.

## Current features

- Generate puzzles of sizes 4×4 through 9×9, with adjustable given cells and visibility-clue count.
- Select cells, enter numbers with keyboard or on-screen buttons, undo moves, check individual clues or all clues.
- Load and copy puzzle strings in the existing desktop game's quoted clue/grid format.
- Responsive layout for desktops and mobile devices.

**Known limitation:** Puzzles are generated from a completed Latin square, so they have at least one solution, but are **not guaranteed to be unique**. The number of clues and given cells is not yet a calibrated difficulty rating. Clue checking is currently performed for completed lines; the desktop game's deeper infeasibility checks have not yet been ported.

## Next stages

This is a small, playable deployment foundation. Next steps are to use [SkyscraperSolver](https://github.com/TonyCongqianWang/SkyscraperSolver) to produce uniquely solvable puzzle banks and difficulty tiers, and to investigate reuse of the [SkyscraperGame](https://github.com/TonyCongqianWang/SkyscraperGame) C# engine through Blazor WebAssembly.
