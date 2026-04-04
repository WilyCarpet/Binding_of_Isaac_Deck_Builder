# Deckbuilder Desktop

Desktop shell scaffold for a Four Souls deck builder using:

- Angular frontend
- Electron shell
- Flask backend (Python)
- SQLite database from ../four-souls-scraper/four_souls_all_cards_by_category.db

## Install

From this folder:

```bash
npm install
cd frontend && npm install && cd ..
python3 -m pip install --user -r backend/requirements.txt
```

## Run

```bash
npm run dev
```

This starts:

- Angular on http://127.0.0.1:4200
- Electron app window
- Flask backend auto-started by Electron on http://127.0.0.1:5001

The dev command now performs a preflight cleanup of stale listeners on ports 4200 and 5001 before startup.

## Dev Container Notes

- Electron is launched with `--no-sandbox --disable-gpu` for Linux container compatibility.
- You may still see DBus-related warnings in terminal output. In this dev container they are expected and non-fatal.

## API Endpoints

- GET /health
- GET /categories
- GET /cards?category=Character_Card
- POST /deck/validate

## Notes

- The current deck validator is a starter implementation only.
- Replace validation rules in backend/app.py with your full game logic.
