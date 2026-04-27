# Four Souls Scraper

A Python web scraper that pulls every card from [foursouls.com](https://foursouls.com) and exports the full catalogue to an Excel workbook and a SQLite database. Each card category becomes its own sheet (Excel) or table (SQLite), and card artwork is downloaded locally alongside the data.

## Project Structure

```
four-souls-scraper/
├── scrapeForCard.py        # Main scraper script
├── requirements.txt        # Python dependencies
├── Dockerfile              # Production Docker image
├── card_images/            # Downloaded card artwork (created on first run)
├── four_souls_all_cards_by_category.xlsx   # Generated Excel output
└── four_souls_all_cards_by_category.db     # Generated SQLite output
```

## Features

- **Full card catalogue** — scrapes every card across all pages of the foursouls.com card search, handling pagination automatically.
- **Rich card data** — extracts Name, Set, Sub Box, Set Code, Card Type, HP, ATK, Effect Type, Effect text, Flavour Quote, card page URL, and remote Image URL for every card.
- **Image downloading** — artwork is saved locally to `card_images/` with sanitised filenames. Already-downloaded images are skipped on subsequent runs.
- **Category-aware output** — cards are sorted into 30+ named categories (Character, Active Treasure, Passive Treasure, Boss, Basic Monster, Loot, Curse, Room, etc.) and each category becomes a separate Excel sheet or SQLite table.
- **Dual output formats** — choose between `.xlsx` (Excel) or `.db` (SQLite) at runtime via a CLI flag.
- **Resilient scraping** — polite rate-limiting between requests, per-card error handling (failures are logged without stopping the run), and a custom `User-Agent` header.
- **Docker support** — a `Dockerfile` is provided for fully isolated, reproducible runs.

## Data Fields Collected per Card

| Field | Description |
|---|---|
| `Name` | Card name |
| `Set` | Set name (e.g. "Four Souls Base Game") |
| `Sub Box` | Sub-box label when applicable |
| `Set Code` | Short set identifier (e.g. `b2`, `r`, `fsp2`) |
| `Card Type` | Raw card-type string from the site |
| `HP` | Hit-point value (monsters / characters) |
| `ATK` | Attack value (monsters / characters) |
| `Effect Type` | Effect icon label (e.g. "Activated", "Passive") |
| `Effect` | Full effect text |
| `Quote` | Flavour quote |
| `URL` | Canonical URL of the card page |
| `Image URL` | Remote URL of the card front image |
| `Image Local Path` | Relative path to the locally saved image |

## Setup Instructions

### Prerequisites

- Python 3.9 or later
- `pip`

### Local Setup

1. Clone the repository:

   ```bash
   git clone <repository-url>
   cd four-souls-scraper
   ```

2. Create and activate a virtual environment (recommended):

   ```bash
   python -m venv venv
   source venv/bin/activate        # macOS / Linux
   venv\Scripts\activate           # Windows
   ```

3. Install dependencies:

   ```bash
   pip install -r requirements.txt
   ```

   Dependencies: `requests`, `beautifulsoup4`, `pandas`, `openpyxl`

### Docker Setup

1. Build the image:

   ```bash
   docker build -t four-souls-scraper .
   ```

2. Run the container (outputs land in the current directory via the volume mount):

   ```bash
   docker run --rm -v "$(pwd)":/app/output four-souls-scraper
   ```

## Running the Scraper

### Basic run (Excel output + images)

```bash
python scrapeForCard.py
```

This produces `four_souls_all_cards_by_category.xlsx` and downloads all card images to `card_images/`.

### SQLite output

```bash
python scrapeForCard.py --output-format sqlite
```

Produces `four_souls_all_cards_by_category.db` — the file consumed by the `deckbuilder-desktop` backend.

### Skip image downloads

```bash
python scrapeForCard.py --no-images
```

Skips artwork downloads; the `Image Local Path` column will be empty. Can be combined with `--output-format`:

```bash
python scrapeForCard.py --output-format sqlite --no-images
```

### All CLI flags

| Flag | Default | Description |
|---|---|---|
| `--output-format excel\|sqlite` | `excel` | Choose output format |
| `--no-images` | images enabled | Skip downloading card artwork |

## Output Details

### Excel workbook

- One worksheet per card category (sheet names are truncated to Excel's 31-character limit and stripped of illegal characters).
- Worksheets are sorted alphabetically by category name.

### SQLite database

- One table per card category with sanitised SQL-safe table names.
- Table names that start with a digit are prefixed with `category_` (e.g. `category_1_Cent_Card`).
- The database is the data source for the `deckbuilder-desktop` application.

## Development Container

Open the project in VS Code, press `F1`, and select **Dev Containers: Reopen in Container**. The container provides Python with all dependencies pre-installed.

## Contributing

Contributions are welcome. Please open an issue or submit a pull request.

## License

MIT License. See the LICENSE file for details.