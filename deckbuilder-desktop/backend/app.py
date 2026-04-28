from __future__ import annotations

import json
import random
import sqlite3
import subprocess
import sys
import time
from pathlib import Path
from typing import Any

from flask import Flask, Response, jsonify, request, send_from_directory, stream_with_context
from flask_cors import CORS

app = Flask(__name__)
CORS(app)

PROJECT_ROOT = Path(__file__).resolve().parents[1]
DB_PATH = PROJECT_ROOT.parent / "four-souls-scraper" / \
    "four_souls_all_cards_by_category.db"
CARD_IMAGE_DIR = PROJECT_ROOT.parent / "four-souls-scraper" / "card_images"
OWNERSHIP_TABLE = "Card_Ownership"

# ---------------------------------------------------------------------------
# Deck-building constants
# ---------------------------------------------------------------------------

OFFICIAL_RATIOS: dict[str, int] = {
    "ld_wc": 23, "ld_t": 11, "ld_pr": 6, "ld_bb": 5, "ld_bo": 6, "ld_ba": 6,
    "ld_dsh": 5, "ld_ls": 1, "ld_5c": 6, "ld_4c": 12, "ld_3c": 11, "ld_2c": 6, "ld_1c": 2,
    "md_eb": 1, "md_bo": 30, "md_b": 30, "md_ce": 9, "md_hce": 9, "md_ge": 8, "md_be": 8, "md_c": 5,
    "td_a": 40, "td_pas": 44, "td_pai": 10, "td_ou": 5, "td_s": 1,
    "sd_s": 3, "rd_r": 9,  # 3×3 room grid (Requiem mechanic)
}

DRAFT_RATIOS: dict[str, int] = {
    "ld_wc": 22, "ld_t": 10, "ld_pr": 5, "ld_bb": 5, "ld_bo": 5, "ld_ba": 5,
    "ld_dsh": 5, "ld_ls": 1, "ld_5c": 5, "ld_4c": 10, "ld_3c": 10, "ld_2c": 5, "ld_1c": 2,
    "md_eb": 1, "md_bo": 30, "md_b": 30, "md_ce": 9, "md_hce": 9, "md_ge": 8, "md_be": 8, "md_c": 5,
    "td_a": 40, "td_pas": 44, "td_pai": 10, "td_ou": 5, "td_s": 1,
    "sd_s": 3, "rd_r": 9,  # 3×3 room grid (Requiem mechanic)
}

RATIO_TO_TABLE: dict[str, str] = {
    "ld_wc":  "Wildcard_Card",
    "ld_t":   "Trinket_Card",
    "ld_pr":  "Pill_Rune_Card",
    "ld_bb":  "Butter_Bean_Card",
    "ld_bo":  "Bomb_Card",
    "ld_ba":  "Battery_Card",
    "ld_dsh": "Dice_Shard_Soul_Heart_Card",
    "ld_ls":  "Lost_Soul_Card",
    "ld_5c":  "Nickel_Card",
    "ld_4c":  "category_4_Cent_Card",
    "ld_3c":  "category_3_Cent_Card",
    "ld_2c":  "category_2_Cent_Card",
    "ld_1c":  "category_1_Cent_Card",
    "md_eb":  "Epic_Boss_Card",
    "md_bo":  "Boss_Card",
    "md_b":   "Basic_Monster_Card",
    "md_ce":  "Cursed_Monster_Card",
    "md_hce": "Holy_Charmed_Monster_Card",
    "md_ge":  "Good_Event_Card",
    "md_be":  "Bad_Event_Card",
    "md_c":   "Curse_Card",
    "td_a":   "Active_Treasure_Card",
    "td_pas": "Passive_Treasure_Card",
    "td_pai": "Paid_Treasure_Card",
    "td_ou":  "One_Use_Treasure_Card",
    "td_s":   "Soul_Treasure_Card",
    "sd_s":   "Bonus_Soul_Card",
    "rd_r":   "Room_Card",
}

DECK_GROUPS: dict[str, list[str]] = {
    "loot":     ["ld_wc", "ld_t", "ld_pr", "ld_bb", "ld_bo", "ld_ba",
                 "ld_dsh", "ld_ls", "ld_5c", "ld_4c", "ld_3c", "ld_2c", "ld_1c"],
    "monster":  ["md_eb", "md_bo", "md_b", "md_ce", "md_hce", "md_ge", "md_be", "md_c"],
    "treasure": ["td_a", "td_pas", "td_pai", "td_ou", "td_s"],
    "souls":    ["sd_s"],
    "rooms":    ["rd_r"],
}


# ---------------------------------------------------------------------------
# DB helpers
# ---------------------------------------------------------------------------

def get_connection() -> sqlite3.Connection:
    if not DB_PATH.exists():
        raise FileNotFoundError(f"Database file not found: {DB_PATH}")
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    return conn


def ensure_collection_table(conn: sqlite3.Connection) -> None:
    conn.execute(
        f'''
        CREATE TABLE IF NOT EXISTS "{OWNERSHIP_TABLE}" (
            table_name TEXT NOT NULL,
            card_rowid INTEGER NOT NULL,
            owned INTEGER NOT NULL DEFAULT 0 CHECK (owned IN (0, 1)),
            owned_count INTEGER NOT NULL DEFAULT 0 CHECK (owned_count >= 0),
            updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
            PRIMARY KEY (table_name, card_rowid)
        )
        '''
    )
    conn.execute(
        f'CREATE INDEX IF NOT EXISTS idx_{OWNERSHIP_TABLE}_owned ON "{OWNERSHIP_TABLE}" (owned)'
    )
    conn.commit()


def ensure_character_starting_items_column(conn: sqlite3.Connection) -> None:
    """Add 'Starting Items' column to Character_Card if it doesn't exist yet."""
    existing = {row[1] for row in conn.execute('PRAGMA table_info("Character_Card")')}
    if "Starting Items" not in existing:
        conn.execute('ALTER TABLE "Character_Card" ADD COLUMN "Starting Items" TEXT DEFAULT ""')
        conn.commit()


def list_card_tables(conn: sqlite3.Connection) -> list[str]:
    rows = conn.execute(
        """
        SELECT name
        FROM sqlite_master
        WHERE type = 'table'
          AND name NOT LIKE 'sqlite_%'
          AND name != ?
        ORDER BY name
        """,
        (OWNERSHIP_TABLE,),
    ).fetchall()
    return [r["name"] for r in rows]


def parse_card_id(card_id: str) -> tuple[str, int]:
    if ":" not in card_id:
        raise ValueError("card_id must be in <table_name>:<rowid> format")

    table_name, rowid_raw = card_id.split(":", 1)
    if not table_name:
        raise ValueError("table_name is required in card_id")

    try:
        card_rowid = int(rowid_raw)
    except ValueError as exc:
        raise ValueError("rowid in card_id must be an integer") from exc

    if card_rowid <= 0:
        raise ValueError("rowid in card_id must be positive")

    return table_name, card_rowid


def _placeholders(lst: list[str]) -> str:
    return ",".join("?" for _ in lst)


def _annotate_ownership(
    conn: sqlite3.Connection,
    table: str,
    cards: list[dict[str, Any]],
) -> None:
    """Mutate cards in-place: add _owned (bool), _owned_count (int), _table (str)."""
    for card in cards:
        card["_table"] = table
        card["_owned"] = False
        card["_owned_count"] = 0
    if not cards:
        return
    rowids = [int(c["_card_rowid"]) for c in cards if "_card_rowid" in c]
    if not rowids:
        return
    rph = _placeholders(rowids)
    own_rows = conn.execute(
        f'SELECT card_rowid, owned_count FROM "{OWNERSHIP_TABLE}" '
        f'WHERE table_name = ? AND card_rowid IN ({rph}) AND owned = 1',
        [table, *rowids],
    ).fetchall()
    ownership_map = {r["card_rowid"]: int(r["owned_count"]) for r in own_rows}
    for card in cards:
        rowid = int(card.get("_card_rowid", -1))
        if rowid in ownership_map:
            card["_owned"] = True
            card["_owned_count"] = max(1, ownership_map[rowid])


def _sample_from_table(
    conn: sqlite3.Connection,
    table: str,
    set_codes: list[str],
    count: int,
    warnings: list[str],
    label: str,
    exclude_names: set[str] | None = None,
    owned_only: bool = False,
) -> list[dict[str, Any]]:
    if count == 0:
        return []
    ph = _placeholders(set_codes)
    rows = conn.execute(
        f'SELECT rowid as _card_rowid, * FROM "{table}" WHERE "Set Code" IN ({ph})', set_codes
    ).fetchall()
    pool = [dict(r) for r in rows]
    _annotate_ownership(conn, table, pool)
    if owned_only:
        pool = [c for c in pool if c["_owned"]]
    if exclude_names:
        pool = [c for c in pool if (c.get("Name") or "") not in exclude_names]
    if not pool:
        if owned_only:
            warnings.append(f"No owned {label} cards in selected decks.")
        else:
            warnings.append(f"No cards available for {label} in selected decks.")
        return []
    if owned_only:
        # Build a copies-weighted pool: each card appears owned_count times.
        # Sampling from this pool without replacement naturally respects how
        # many of each card you own while giving equal weight per copy.
        weighted: list[dict[str, Any]] = []
        for card in pool:
            copies = int(card.get("_owned_count", 1))
            weighted.extend([card] * copies)
        random.shuffle(weighted)
        total_copies = len(weighted)
        if total_copies < count:
            warnings.append(
                f"Only {total_copies} owned {label} copies available "
                f"(requested {count}); using all."
            )
        # Deduplicate while preserving draw order and copy limits.
        seen_counts: dict[int, int] = {}
        result: list[dict[str, Any]] = []
        for card in weighted:
            rowid = int(card.get("_card_rowid", -1))
            limit = int(card.get("_owned_count", 1))
            drawn = seen_counts.get(rowid, 0)
            if drawn < limit:
                result.append(card)
                seen_counts[rowid] = drawn + 1
            if len(result) == count:
                break
        return result
    if len(pool) < count:
        warnings.append(
            f"Only {len(pool)} {label} cards available (requested {count}); using all."
        )
        shuffled = pool[:]
        random.shuffle(shuffled)
        return shuffled
    return random.sample(pool, count)


# ---------------------------------------------------------------------------
# Routes
# ---------------------------------------------------------------------------

@app.get("/health")
def health() -> Any:
    return jsonify({"status": "ok", "db_exists": DB_PATH.exists(), "db_path": str(DB_PATH)})


@app.get("/")
def root() -> Any:
    return jsonify({
        "service": "deckbuilder-backend",
        "status": "ok",
        "health": "/health",
        "build": "/deck/build",
    })


@app.get("/card-images/<path:filename>")
def card_image(filename: str) -> Any:
    safe_filename = Path(filename).name
    image_path = CARD_IMAGE_DIR / safe_filename

    if not CARD_IMAGE_DIR.exists() or not image_path.exists():
        return jsonify({"error": f"Image not found: {safe_filename}"}), 404

    return send_from_directory(CARD_IMAGE_DIR, safe_filename)


@app.get("/collection/cards")
def get_collection_cards() -> Any:
    with get_connection() as conn:
        ensure_collection_table(conn)
        tables = list_card_tables(conn)

        cards: list[dict[str, Any]] = []
        for table_name in tables:
            rows = conn.execute(
                f'SELECT rowid as _rowid, * FROM "{table_name}"').fetchall()
            for row in rows:
                record = dict(row)
                rowid = int(record.pop("_rowid"))
                ownership = conn.execute(
                    f'''
                    SELECT owned, owned_count
                    FROM "{OWNERSHIP_TABLE}"
                    WHERE table_name = ? AND card_rowid = ?
                    ''',
                    (table_name, rowid),
                ).fetchone()

                owned = bool(ownership["owned"]) if ownership else False
                owned_count = int(ownership["owned_count"]) if ownership else 0

                cards.append(
                    {
                        **record,
                        "_table": table_name,
                        "_card_rowid": rowid,
                        "card_id": f"{table_name}:{rowid}",
                        "owned": owned,
                        "owned_count": owned_count,
                    }
                )

    cards.sort(key=lambda c: ((c.get("Name") or "").lower(),
               c.get("_table") or "", c["_card_rowid"]))
    return jsonify({"cards": cards, "count": len(cards)})


@app.put("/collection/cards/<path:card_id>")
def update_collection_card(card_id: str) -> Any:
    payload = request.get_json(silent=True) or {}
    if "owned" not in payload and "owned_count" not in payload:
        return jsonify({"error": "Provide at least one of: owned, owned_count"}), 400

    try:
        table_name, card_rowid = parse_card_id(card_id)
    except ValueError as exc:
        return jsonify({"error": str(exc)}), 400

    with get_connection() as conn:
        ensure_collection_table(conn)
        tables = set(list_card_tables(conn))
        if table_name not in tables:
            return jsonify({"error": f"Unknown card table: {table_name}"}), 404

        exists = conn.execute(
            f'SELECT 1 FROM "{table_name}" WHERE rowid = ? LIMIT 1',
            (card_rowid,),
        ).fetchone()
        if not exists:
            return jsonify({"error": f"Card not found in {table_name} with rowid {card_rowid}"}), 404

        current = conn.execute(
            f'''
            SELECT owned, owned_count
            FROM "{OWNERSHIP_TABLE}"
            WHERE table_name = ? AND card_rowid = ?
            ''',
            (table_name, card_rowid),
        ).fetchone()

        current_owned = bool(current["owned"]) if current else False
        current_count = int(current["owned_count"]) if current else 0

        owned = bool(payload.get("owned", current_owned))
        try:
            owned_count = int(payload.get("owned_count", current_count))
        except (TypeError, ValueError):
            return jsonify({"error": "owned_count must be an integer"}), 400

        if owned_count < 0:
            return jsonify({"error": "owned_count must be >= 0"}), 400

        if not owned:
            owned_count = 0
        elif owned_count == 0:
            owned_count = 1

        conn.execute(
            f'''
            INSERT INTO "{OWNERSHIP_TABLE}" (table_name, card_rowid, owned, owned_count, updated_at)
            VALUES (?, ?, ?, ?, CURRENT_TIMESTAMP)
            ON CONFLICT(table_name, card_rowid)
            DO UPDATE SET
                owned = excluded.owned,
                owned_count = excluded.owned_count,
                updated_at = CURRENT_TIMESTAMP
            ''',
            (table_name, card_rowid, int(owned), owned_count),
        )
        conn.commit()

    return jsonify(
        {
            "card_id": card_id,
            "owned": owned,
            "owned_count": owned_count,
        }
    )


@app.post("/deck/build")
def build_deck() -> Any:
    payload = request.get_json(silent=True) or {}

    selected_decks: list[str] = payload.get("decks", ["b2"])
    if not isinstance(selected_decks, list) or not selected_decks:
        return jsonify({"error": "At least one deck must be selected."}), 400

    ratio_mode: str = payload.get("ratio", "o")
    seed_val: str = str(payload.get("seed", "")).strip()
    specplayers: bool = bool(payload.get("specplayers", False))
    players: int = max(2, min(12, int(payload.get("players", 4))))
    owned_only: bool = bool(payload.get("owned_only", False))

    # eternal_count: new integer field; fall back to legacy eternalshuffle boolean
    if "eternal_count" in payload:
        eternal_count: int = max(0, int(payload.get("eternal_count", 0)))
    elif bool(payload.get("eternalshuffle", False)):
        eternal_count = players if specplayers else 1
    else:
        eternal_count = 0

    # Determine base ratios
    if ratio_mode == "d":
        ratios = dict(DRAFT_RATIOS)
    elif ratio_mode == "c":
        ratios = {
            key: max(0, int(payload.get(key, default)))
            for key, default in OFFICIAL_RATIOS.items()
        }
    else:
        ratios = dict(OFFICIAL_RATIOS)

    # When specplayers is on, scale loot deck (3 starting loot per player) and
    # bonus souls (players + 1) for official/draft modes only.
    if specplayers and ratio_mode in ("o", "d"):
        ratios["ld_wc"] = ratios["ld_wc"] + players * 3
        ratios["sd_s"] = players + 1

    # Seed RNG
    random.seed(seed_val if seed_val else None)

    warnings: list[str] = []
    result: dict[str, Any] = {}

    with get_connection() as conn:
        ensure_collection_table(conn)
        ensure_character_starting_items_column(conn)

        # ----- Characters (must come before Treasure sampling) -----
        starting_item_names: set[str] = set()
        if specplayers:
            ph = _placeholders(selected_decks)
            char_rows = conn.execute(
                f'SELECT rowid as _card_rowid, * FROM "Character_Card" WHERE "Set Code" IN ({ph})',
                selected_decks,
            ).fetchall()
            char_pool = [dict(r) for r in char_rows]
            _annotate_ownership(conn, "Character_Card", char_pool)
            if len(char_pool) < players:
                warnings.append(
                    f"Only {len(char_pool)} characters available for {players} players; "
                    "try adding more sets."
                )
                result["characters"] = char_pool
            else:
                result["characters"] = random.sample(char_pool, players)

            # Collect starting items of the drawn characters so they can be
            # excluded from the Treasure pool before sampling.
            for char in result["characters"]:
                item = (char.get("Starting Items") or "").strip()
                if item:
                    starting_item_names.add(item)

            if starting_item_names:
                warnings.append(
                    f"Starting items removed from Treasure pool: "
                    + ", ".join(sorted(starting_item_names))
                )

        # ----- Main deck groups -----
        treasure_keys = set(DECK_GROUPS["treasure"])
        for group, keys in DECK_GROUPS.items():
            result[group] = {}
            for key in keys:
                table = RATIO_TO_TABLE[key]
                # Exclude character starting items from all Treasure sub-decks
                exclude = starting_item_names if key in treasure_keys else None
                result[group][key] = _sample_from_table(
                    conn, table, selected_decks, ratios[key], warnings, key, exclude,
                    owned_only=owned_only,
                )

        if eternal_count > 0:
            ph = _placeholders(selected_decks)
            et_rows = conn.execute(
                f'SELECT rowid as _card_rowid, * FROM "Eternal_Treasure_Card" WHERE "Set Code" IN ({ph})',
                selected_decks,
            ).fetchall()
            et_pool = [dict(r) for r in et_rows]
            _annotate_ownership(conn, "Eternal_Treasure_Card", et_pool)
            if not et_pool:
                warnings.append("No Eternal Treasure cards available in the selected sets.")
            elif len(et_pool) < eternal_count:
                warnings.append(
                    f"Only {len(et_pool)} Eternal Treasure cards available "
                    f"(requested {eternal_count}); using all."
                )
                result["eternal"] = et_pool
            else:
                result["eternal"] = random.sample(et_pool, eternal_count)

    return jsonify({
        "deck": result,
        "warnings": warnings,
        "seed": seed_val or None,
        "selected_decks": selected_decks,
        "ratio_mode": ratio_mode,
    })


# ---------------------------------------------------------------------------
# First-run setup
# ---------------------------------------------------------------------------

# Track a running scraper process so we don't start two at once.
_scraper_process: subprocess.Popen | None = None  # type: ignore[type-arg]


@app.get("/setup/scrape")
def setup_scrape() -> Any:
    global _scraper_process  # noqa: PLW0603

    if _scraper_process is not None and _scraper_process.poll() is None:
        return jsonify({"error": "Scraper is already running."}), 409

    no_images = request.args.get("no_images", "false").lower() == "true"
    scraper_script = PROJECT_ROOT.parent / "four-souls-scraper" / "scrapeForCard.py"
    output_path = str(DB_PATH.parent)

    cmd = [
        sys.executable,
        str(scraper_script),
        "--output-format", "sqlite",
        "--output-path", output_path,
    ]
    if no_images:
        cmd.append("--no-images")

    def generate():
        global _scraper_process  # noqa: PLW0603
        try:
            _scraper_process = subprocess.Popen(
                cmd,
                stdout=subprocess.PIPE,
                stderr=subprocess.STDOUT,
                text=True,
                cwd=str(PROJECT_ROOT.parent / "four-souls-scraper"),
                bufsize=1,
            )
            assert _scraper_process.stdout is not None
            for line in _scraper_process.stdout:
                line = line.rstrip("\n")
                yield f"data: {json.dumps({'message': line})}\n\n"

            _scraper_process.wait()
            if _scraper_process.returncode == 0:
                yield f"event: done\ndata: {json.dumps({'success': True})}\n\n"
            else:
                yield (
                    f"event: scrape-error\n"
                    f"data: {json.dumps({'error': f'Scraper exited with code {_scraper_process.returncode}'})}\n\n"
                )
        except Exception as exc:  # noqa: BLE001
            yield f"event: scrape-error\ndata: {json.dumps({'error': str(exc)})}\n\n"

    return Response(
        stream_with_context(generate()),
        mimetype="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "X-Accel-Buffering": "no",
        },
    )


@app.get("/setup/populate-starting-items")
def populate_starting_items() -> Any:
    """Stream SSE progress while backfilling 'Starting Items' for all Character_Card rows.

    Fetches each character's card page on foursouls.com, parses the Eternal Card
    section, and stores the card name in the 'Starting Items' column.
    Only rows whose 'Starting Items' field is empty (or the column is missing) are
    processed; pass ?force=true to re-fetch all rows.
    """
    import urllib.request

    force = request.args.get("force", "false").lower() == "true"

    def generate():  # type: ignore[return]
        try:
            with get_connection() as conn:
                ensure_character_starting_items_column(conn)
                if force:
                    chars = conn.execute(
                        'SELECT rowid, Name, URL FROM "Character_Card" WHERE URL != ""'
                    ).fetchall()
                else:
                    chars = conn.execute(
                        'SELECT rowid, Name, URL FROM "Character_Card" '
                        'WHERE URL != "" AND ("Starting Items" IS NULL OR "Starting Items" = "")'
                    ).fetchall()

            total = len(chars)
            yield f"data: {json.dumps({'message': f'Processing {total} character card(s)...'})}\n\n"

            updated = 0
            for idx, row in enumerate(chars, 1):
                rowid, name, url = row["rowid"], row["Name"], row["URL"]
                starting_item = ""
                try:
                    req = urllib.request.Request(
                        url,
                        headers={"User-Agent": "Mozilla/5.0"},
                    )
                    with urllib.request.urlopen(req, timeout=15) as resp:  # noqa: S310
                        from html.parser import HTMLParser

                        class _EternalParser(HTMLParser):
                            def __init__(self) -> None:
                                super().__init__()
                                self._in_eternal_h3 = False
                                self._eternal_done = False
                                self.eternal_name = ""
                                self._capture_next_link = False
                                self._link_depth = 0

                            def handle_starttag(self, tag: str, attrs: list) -> None:
                                if self._eternal_done:
                                    return
                                if tag == "h3":
                                    self._pending_h3 = True
                                if self._capture_next_link and tag == "a":
                                    self._link_depth += 1

                            def handle_endtag(self, tag: str) -> None:
                                if self._eternal_done:
                                    return
                                if self._capture_next_link and tag == "a":
                                    self._link_depth -= 1

                            def handle_data(self, data: str) -> None:
                                if self._eternal_done:
                                    return
                                text = data.strip()
                                if not text:
                                    return
                                if getattr(self, "_pending_h3", False):
                                    self._pending_h3 = False
                                    if "eternal" in text.lower():
                                        self._in_eternal_h3 = True
                                        self._capture_next_link = True
                                    else:
                                        self._in_eternal_h3 = False
                                        self._capture_next_link = False
                                elif self._capture_next_link and self._link_depth > 0:
                                    self.eternal_name = text
                                    self._eternal_done = True

                        html_text = resp.read().decode("utf-8", errors="replace")
                        parser = _EternalParser()
                        parser.feed(html_text)
                        starting_item = parser.eternal_name.strip()
                except Exception as fetch_err:  # noqa: BLE001
                    yield f"data: {json.dumps({'message': f'[{idx}/{total}] WARN {name}: {fetch_err}'})}\n\n"
                    continue

                with get_connection() as conn:
                    conn.execute(
                        'UPDATE "Character_Card" SET "Starting Items" = ? WHERE rowid = ?',
                        (starting_item, rowid),
                    )
                    conn.commit()

                item_label = starting_item if starting_item else "(none)"
                updated += 1
                yield (
                    f"data: {json.dumps({'message': f'[{idx}/{total}] {name}: \"{item_label}\"'})}\n\n"
                )
                time.sleep(0.15)

            yield f"event: done\ndata: {json.dumps({'success': True, 'updated': updated})}\n\n"
        except Exception as exc:  # noqa: BLE001
            yield f"event: scrape-error\ndata: {json.dumps({'error': str(exc)})}\n\n"

    return Response(
        stream_with_context(generate()),
        mimetype="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "X-Accel-Buffering": "no",
        },
    )


if __name__ == "__main__":
    app.run(host="127.0.0.1", port=5001, debug=False)
