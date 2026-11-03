# Vetrail redesign: standalone prototype

Static HTML/CSS/JS. No build step and no install needed.

## Run it locally

From this folder, run either:

    npx serve .
    # or
    python3 -m http.server 8000

Then open the URL it prints (e.g. http://localhost:3000 or http://localhost:8000).

- index.html: Owner home (Snowball's dashboard)
- Owner-Login.html: start of the owner flow ("Log in as clinic staff" goes to the clinic portal)
- Clinic-Clients.html: clinic portal home

## What's inside

- *.html: one file per screen, linked to each other
- assets/vetrail.css: shared design tokens and components
- assets/dc-lite.js: tiny runtime that renders each screen's template ({{holes}}, sc-if, sc-for)
- assets/preact.min.js: Preact 10 (MIT), used by the runtime
- Fonts load from Google Fonts, so you need internet for the exact typefaces

This is a design prototype. Data is mock data, and record parsing on "Add new client" is simulated.
