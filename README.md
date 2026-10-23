
Maktab Sharif Group 3 — Landing Page

A modern, responsive single-page site for Maktab Sharif Group 3, built with plain HTML, CSS, and vanilla JavaScript. No build step, no dependencies.

Sections


Hero — headline, intro copy, call-to-action buttons, and highlight stats.



Team — responsive card grid: Houtan Rocky, Reza Asadipour, Amir Mahdi Ghadiri, Hadis Kargar.



Contact — call-to-action panel with an email link.


Project structure





text








.
├── index.html
├── style.css
├── script.js
├── .nojekyll
└── .github/
    └── workflows/
        └── deploy.yml


Run locally

Just open index.html in a browser, or serve the folder:





bash








python -m http.server 8000
# then visit http://localhost:8000


Deploy to GitHub Pages

This repo is preconfigured to publish with GitHub Actions.


Create an empty repository on GitHub (do not initialize it with a README).



From this folder, push the code:





bash








git add .
git commit -m "Initial commit: Maktab Sharif Group 3 landing page"
git remote add origin https://github.com/<your-user>/<your-repo>.git
git push -u origin main




In the repository, go to Settings → Pages and set Source to GitHub Actions.



Every push to main triggers .github/workflows/deploy.yml, which uploads the repo root and publishes it.



The live URL appears in the workflow run summary and under Settings → Pages —
typically https://<your-user>.github.io/<your-repo>/.


Alternative: branch-based publishing

If you prefer not to use Actions, set Settings → Pages → Source to Deploy from a branch, choose main and / (root). The .nojekyll file ensures GitHub serves the assets verbatim.

Notes


Fonts (Inter, Space Grotesk) load from Google Fonts; the page still renders fine offline with system fallbacks.



Navigation uses smooth scrolling and respects prefers-reduced-motion.