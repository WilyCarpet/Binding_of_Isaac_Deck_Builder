"""PyInstaller entry point for the deckbuilder backend binary.

Two modes, selected by the first CLI argument:
  (no flag)        → Start the Flask API server on 127.0.0.1:5001
  --scrape-mode    → Strip the flag and run the Four Souls card scraper
                     (scrapeForCard.py main()) with the remaining argv.

This lets Electron spawn a single binary for both server and scraping tasks,
with the Flask server re-invoking itself via sys.executable + ['--scrape-mode']
when the user triggers /setup/scrape.
"""
from __future__ import annotations

import sys


def _run_scraper() -> None:
    """Remove --scrape-mode from sys.argv and run the scraper's main()."""
    # sys.argv currently looks like: ['launcher', '--scrape-mode', ...rest...]
    sys.argv = [sys.argv[0]] + sys.argv[2:]
    # Import here so it's only pulled in when actually scraping.
    import scrapeForCard  # noqa: PLC0415
    scrapeForCard.main()


def _run_server() -> None:
    from app import app  # noqa: PLC0415
    app.run(host="127.0.0.1", port=5001, debug=False)


if __name__ == "__main__":
    if len(sys.argv) > 1 and sys.argv[1] == "--scrape-mode":
        _run_scraper()
    else:
        _run_server()
