# The Musketeer — Hold the Line

A tiny browser survival game: one musketeer, endless zombies. Fight them off with
your rapier and your pistol for as long as you can.

Built with plain HTML, CSS and canvas — no build step, no dependencies, no framework.

## Play

Open `index.html` in a browser, or serve the folder:

```bash
python -m http.server 8000
# then visit http://localhost:8000


Controls











ActionKeyboard / MouseTouchMoveW A S D or arrow keysleft thumb stickAimmouse positionmovement directionSlashSpace or KSlash buttonShootJ or left clickShoot buttonStart / restartEnter or SpaceStart the fight button

Rules


Zombies spawn at the edges of the arena and walk towards you.



Every wave lasts 22 seconds, then the next wave begins — faster, tougher, more of them.



Occasional runners are quicker but flimsier.



You have 100 health. Each zombie touch costs 9.



Kills and surviving waves add to your score. When health reaches zero, the run ends
and your final wave, kills and score are shown.


Project structure





text








.
├── index.html          markup: canvas, HUD, overlay, touch controls
├── style.css           dark musketeer-themed layout and HUD
├── script.js           the whole game: loop, entities, input, rendering
├── .nojekyll           serve assets verbatim on GitHub Pages
├── README.md
└── .github/
    └── workflows/
        └── deploy.yml  publish to GitHub Pages on push to main


Deploy to GitHub Pages

The repository is already configured to publish with GitHub Actions:


Push to main.



In the repository, go to Settings → Pages and set Source to GitHub Actions.



Every push to main runs .github/workflows/deploy.yml, which uploads the repo
root and publishes it.


The live URL appears in the workflow run summary and under Settings → Pages —
typically https://<your-user>.github.io/<your-repo>/.

Alternative: branch-based publishing

Set Settings → Pages → Source to Deploy from a branch, choose main and /
(root). The .nojekyll file ensures GitHub serves the assets verbatim.

Notes


Everything is drawn procedurally on a 960×540 canvas that scales to fit its container.



Fonts (Inter, Space Grotesk) load from Google Fonts; the game renders fine with
system fallbacks if they are unavailable.



prefers-reduced-motion is respected for the UI transitions.