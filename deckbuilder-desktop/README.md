# Deckbuilder Desktop

A desktop deck-building tool for the **Four Souls** card game. Built with Angular (frontend), Electron (desktop shell), and Flask (Python backend), it reads a SQLite database produced by the `four-souls-scraper` project to provide a complete card collection manager and randomised deck generator.

## Technology Stack

| Layer | Technology |
|---|---|
| Desktop shell | Electron 32 |
| Frontend | Angular (SSR-capable, served on `127.0.0.1:4200`) |
| Backend API | Flask 3 + Flask-CORS (served on `127.0.0.1:5001`) |
| Data store | SQLite (`four_souls_all_cards_by_category.db`) |

## Project Structure

```
deckbuilder-desktop/
├── package.json                # Root npm scripts and Electron dependencies
├── electron/
│   ├── main.js                 # Electron main process, IPC handlers, Flask launcher
│   └── preload.js              # Context-isolated API bridge (electronAPI)
├── backend/
│   ├── app.py                  # Flask REST API
│   └── requirements.txt        # Python dependencies (flask, flask-cors)
└── frontend/                   # Angular application
    ├── angular.json
    ├── package.json
    └── src/
        └── app/
            ├── app.constants.ts        # Deck options, ratio presets, label maps
            ├── app.types.ts            # TypeScript interfaces
            ├── card-image.util.ts      # Image URL resolution helpers
            └── components/
                ├── deck-builder/       # Deck Builder view
                ├── collection/         # Collection Manager view
                ├── card-dialog.*       # Full card detail modal
                ├── left-column.*       # Deck config sidebar
                ├── right-column.*      # Ratio controls sidebar
                └── results-panel.*     # Built deck results display
```

## Features

### Deck Builder
- **Deck source selection** — choose any combination of official sets and promos across three groups:
  - *Core*: Base Game V2, Four Souls+ V2, Requiem, Summer of Isaac
  - *Promo*: Gold Box V2, Requiem Warp Zone, Big Boi Alt Art, Target, Gish, Tapeworm, Dick Knots, Retro, The Legend of Bum-bo!, The Unboxing of Isaac, Youtooz, Promos
  - *Other*: 10th Anniversary, G-Fuel, Mewgenics, Nendoroid
- **Ratio modes**:
  - *Official* — matches the published Four Souls card ratios exactly
  - *Draft* — uses slightly reduced counts for draft-style play
  - *Custom* — fully editable per-category counts
- **Player-count character draw** — optionally specify 2–12 players to randomly deal one Character Card to each
- **Eternal shuffle** — optionally include all Eternal Treasure Cards from selected decks
- **Reproducible seeds** — enter a seed string for repeatable deck generation; the used seed is shown in results
- **Deck groups** — results are organised into Loot, Monster, Treasure, Souls, and Rooms sections with human-readable category labels

### Collection Manager
- Browse the **entire card catalogue** from the database (all categories, all sets)
- **Search** by card name, set, set code, card type, or table name
- Filter by **card type** (category table) or **set**
- **Owned / not owned toggle** per card, with real-time persistence to the database
- **Owned copy count** — track how many copies of each card you own
- **Bulk mark owned** — mark all currently visible (filtered) cards as owned in one action
- **Owned summary** — header counters show total owned cards and total owned copies
- **Card detail modal** — click any card tile to open a full-detail dialog showing artwork, all stats, effect text, and flavour quote
- Image fallback chain — the dialog tries multiple image sources (local file via backend, remote URL) before hiding the image slot

### Card Detail Dialog
- Displays card artwork served from the local `card_images/` directory (via the Flask `/card-images/<filename>` endpoint) with automatic fallback to the remote image URL
- Shows all available fields: Name, Set, Sub Box, Card Type, HP, ATK, Effect Type, Effect, Quote
- Keyboard-dismissible (Escape key) and click-outside-to-close

### Backend API

| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/` | Service info |
| `GET` | `/health` | Health check; reports DB path and existence (`db_exists` boolean) |
| `GET` | `/card-images/<filename>` | Serve a locally cached card image |
| `GET` | `/collection/cards` | Return all cards from all tables, merged with ownership data |
| `PUT` | `/collection/cards/<table>:<rowid>` | Update `owned` and/or `owned_count` for a card |
| `POST` | `/deck/build` | Generate a randomised deck from selected sources |
| `GET` | `/setup/scrape` | Stream scraper progress as Server-Sent Events; populates the DB |

#### `GET /setup/scrape` query parameters

| Parameter | Type | Default | Description |
|---|---|---|---|
| `no_images` | `"true"\|"false"` | `"false"` | Skip downloading card images (much faster; images lazy-load from foursouls.com) |

The response is a `text/event-stream`. Each `data:` event carries `{"message": "…"}` (scraper log line). On success the stream emits a named `done` event; on failure it emits `scrape-error`.

#### `POST /deck/build` payload

```json
{
  "decks": ["b2", "r"],
  "ratio": "o",
  "seed": "my-seed",
  "specplayers": true,
  "players": 4,
  "eternalshuffle": false,
  "ld_wc": 23,
  "td_a": 40
}
```

| Field | Type | Default | Description |
|---|---|---|---|
| `decks` | `string[]` | required | Set codes to include (e.g. `"b2"`, `"r"`) |
| `ratio` | `"o"\|"d"\|"c"` | `"o"` | Ratio mode: official, draft, or custom |
| `seed` | `string` | `""` | RNG seed for reproducibility |
| `specplayers` | `boolean` | `false` | Draw one character per player |
| `players` | `number` | `4` | Number of players (2–12, used with `specplayers`) |
| `eternalshuffle` | `boolean` | `false` | Include all eternal treasure cards |
| `ld_*`, `md_*`, `td_*`, etc. | `number` | official values | Per-category counts (custom ratio mode) |

## Prerequisites

- **Node.js** 18+ and npm
- **Python** 3.9+
- Internet access on first launch (the built-in setup wizard downloads all card data automatically)

> The SQLite database and card images are **not** included in the repository. The first time you
> start the app, a guided setup screen will appear and run the scraper for you — no Docker required.

## Setup

Run the following from the `deckbuilder-desktop/` directory:

```bash
# 1. Install Electron and root npm tooling
npm install

# 2. Install Angular dependencies
cd frontend && npm install && cd ..

# 3. Install Flask dependencies
python3 -m pip install --user -r backend/requirements.txt
```

> **Tip — use a virtual environment** for cleaner Python dependency management:
> ```bash
> python3 -m venv ../.venv
> source ../.venv/bin/activate
> pip install -r backend/requirements.txt
> ```
> Both the Electron launcher and npm scripts detect and prefer `.venv/bin/python` automatically.

## Running the Application

### Full desktop app (Electron + Angular + Flask)

```bash
npm run dev
```

This command:
1. Kills any stale processes on ports 4200 and 5001
2. Starts the Angular dev server on `http://127.0.0.1:4200`
3. Launches the Electron window, which starts the Flask backend automatically and waits for it to become healthy before loading the frontend
4. If no card database is found, a **first-run setup screen** is displayed automatically.
   Click **Set Up Now** to download all card data from foursouls.com (5–10 minutes with images;
   under a minute with "skip images" checked). The app transitions to the Deck Builder automatically on completion.

### Browser-only mode (Angular + Flask, no Electron)

```bash
npm run dev:web
```

Runs Angular and Flask together without an Electron window. Useful for debugging the UI in a browser. Open `http://127.0.0.1:4200`.

### Attach Electron to an already-running Angular server

```bash
npm run dev:electron:attach
```

Skips the Angular dev-server start and connects Electron directly to an already-running instance on port 4200.

### Available npm scripts

| Script | Description |
|---|---|
| `npm run dev` | Full app: preflight + Angular + Electron (default) |
| `npm run dev:web` | Angular + Flask in the browser only |
| `npm run dev:electron` | Preflight + Angular + Electron |
| `npm run dev:electron:attach` | Electron only, attaches to existing Angular |
| `npm run dev:frontend` | Angular dev server only |
| `npm run dev:backend` | Flask backend only |
| `npm run dev:preflight` | Kill stale processes on ports 4200 and 5001 |

## Functionality Tutorial

### 1. Generating a Deck

1. Open the app and navigate to the **Deck Builder** tab.
2. In the **left column**, check the sets you want to draw from. *Base Game V2* is selected by default.
3. Choose a **ratio mode** in the right column:
   - *Official* — standard published ratios (recommended for normal play)
   - *Draft* — slightly lower counts for draft events
   - *Custom* — adjust every category's count individually using the number inputs that appear
4. Optionally:
   - Enable **Specify Players** and set a player count to deal one character per player
   - Enable **Eternal Shuffle** to append all Eternal Treasure Cards from the selected sets
   - Enter a **Seed** string to make the draw reproducible (share the seed with others to get the same deck)
5. Click **Build Deck**.
6. The results panel displays each deck group (Loot, Monster, Treasure, Souls, Rooms) with card counts and names. Any warnings (e.g. fewer cards available than requested) appear below the controls.

### 2. Managing Your Collection

1. Navigate to the **Collection** tab.
2. All cards in the database are listed as tiles. Use the controls at the top to:
   - **Search** — type a name, set code, or card type to filter the list instantly
   - **Type filter** — narrow by card category (Character, Treasure, Monster, etc.)
   - **Set filter** — narrow by set name
   - **Owned only** — toggle to show only cards you own
3. To mark a card as owned, click its **checkbox**. The change is saved to the database immediately.
4. To record how many copies you own, change the **count field** on the card tile. Setting the count to 0 automatically marks the card as not owned.
5. To bulk-mark all visible cards as owned at once, check the **Mark all visible as owned** checkbox in the filter bar.
6. The header shows a live count of **owned cards** and **total owned copies**.
7. Click any card tile to open the **Card Detail Dialog**:
   - View the full card artwork (loaded from local cache or remote URL)
   - See all card stats, effect text, and flavour quote
   - Press **Escape** or click outside the dialog to close it

## Dev Container Notes

- Electron is launched with `--no-sandbox --disable-gpu` flags for Linux container compatibility.
- DBus-related warnings in terminal output are expected and non-fatal inside the dev container.
- The Electron main process auto-detects `.venv/bin/python` relative to the project root and prefers it over the system `python3`.

## Architecture Notes

- The Electron `preload.js` exposes a sandboxed `window.electronAPI` object (`buildDeck`, `getCollectionCards`, `updateCollectionCard`) using `contextBridge`, keeping Node APIs isolated from renderer code.
- The Angular components detect `window.electronAPI` at runtime — if it is absent (browser mode), they fall back to direct `fetch` calls to `http://127.0.0.1:5001`.
- The Flask backend creates the `Card_Ownership` table on first use if it does not already exist; no manual migration is required.
- Card images are served from the Flask `/card-images/<filename>` endpoint, which resolves paths safely inside `card_images/` to prevent directory traversal.
