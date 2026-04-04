from __future__ import annotations

import random
import sqlite3
from pathlib import Path
from typing import Any

from flask import Flask, jsonify, request
from flask_cors import CORS

app = Flask(__name__)
CORS(app)

PROJECT_ROOT = Path(__file__).resolve().parents[1]
DB_PATH = PROJECT_ROOT.parent / "four-souls-scraper" / \
    "four_souls_all_cards_by_category.db"

# ---------------------------------------------------------------------------
# Deck-building constants
# ---------------------------------------------------------------------------

OFFICIAL_RATIOS: dict[str, int] = {
    "ld_wc": 23, "ld_t": 11, "ld_pr": 6, "ld_bb": 5, "ld_bo": 6, "ld_ba": 6,
    "ld_dsh": 5, "ld_ls": 1, "ld_5c": 6, "ld_4c": 12, "ld_3c": 11, "ld_2c": 6, "ld_1c": 2,
    "md_eb": 1, "md_bo": 30, "md_b": 30, "md_ce": 9, "md_hce": 9, "md_ge": 8, "md_be": 8, "md_c": 5,
    "td_a": 40, "td_pas": 44, "td_pai": 10, "td_ou": 5, "td_s": 1,
    "sd_s": 3, "rd_r": 0,
}

DRAFT_RATIOS: dict[str, int] = {
    "ld_wc": 22, "ld_t": 10, "ld_pr": 5, "ld_bb": 5, "ld_bo": 5, "ld_ba": 5,
    "ld_dsh": 5, "ld_ls": 1, "ld_5c": 5, "ld_4c": 10, "ld_3c": 10, "ld_2c": 5, "ld_1c": 2,
    "md_eb": 1, "md_bo": 30, "md_b": 30, "md_ce": 9, "md_hce": 9, "md_ge": 8, "md_be": 8, "md_c": 5,
    "td_a": 40, "td_pas": 44, "td_pai": 10, "td_ou": 5, "td_s": 1,
    "sd_s": 3, "rd_r": 0,
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


def _placeholders(lst: list[str]) -> str:
    return ",".join("?" for _ in lst)


def _sample_from_table(
    conn: sqlite3.Connection,
    table: str,
    set_codes: list[str],
    count: int,
    warnings: list[str],
    label: str,
) -> list[dict[str, Any]]:
    if count == 0:
        return []
    ph = _placeholders(set_codes)
    rows = conn.execute(
        f'SELECT * FROM "{table}" WHERE "Set Code" IN ({ph})', set_codes
    ).fetchall()
    pool = [dict(r) for r in rows]
    if not pool:
        warnings.append(f"No cards available for {label} in selected decks.")
        return []
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
    eternalshuffle: bool = bool(payload.get("eternalshuffle", False))

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

    # Seed RNG
    random.seed(seed_val if seed_val else None)

    warnings: list[str] = []
    result: dict[str, Any] = {}

    with get_connection() as conn:
        for group, keys in DECK_GROUPS.items():
            result[group] = {}
            for key in keys:
                table = RATIO_TO_TABLE[key]
                result[group][key] = _sample_from_table(
                    conn, table, selected_decks, ratios[key], warnings, key
                )

        if specplayers:
            ph = _placeholders(selected_decks)
            char_rows = conn.execute(
                f'SELECT * FROM "Character_Card" WHERE "Set Code" IN ({ph})',
                selected_decks,
            ).fetchall()
            char_pool = [dict(r) for r in char_rows]
            if len(char_pool) < players:
                warnings.append(
                    f"Only {len(char_pool)} characters available for {players} players."
                )
                result["characters"] = char_pool
            else:
                result["characters"] = random.sample(char_pool, players)

        if eternalshuffle:
            ph = _placeholders(selected_decks)
            et_rows = conn.execute(
                f'SELECT * FROM "Eternal_Treasure_Card" WHERE "Set Code" IN ({ph})',
                selected_decks,
            ).fetchall()
            result["eternal"] = [dict(r) for r in et_rows]

    return jsonify({
        "deck": result,
        "warnings": warnings,
        "seed": seed_val or None,
        "selected_decks": selected_decks,
        "ratio_mode": ratio_mode,
    })


if __name__ == "__main__":
    app.run(host="127.0.0.1", port=5001, debug=False)
