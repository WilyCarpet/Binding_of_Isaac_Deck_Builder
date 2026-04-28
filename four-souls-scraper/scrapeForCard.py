import argparse
import os
import re
import sqlite3
import time
from typing import Any, Dict, List, Set
from urllib.parse import urljoin, urlparse

import pandas as pd
import requests
from bs4 import BeautifulSoup

BASE_URL = "https://foursouls.com"
SEARCH_URL = (
    "https://foursouls.com/card-search/?searchtext&origin&card_type&card_footnotes"
    "&competitive_only&identical=yes&cardstatus=cur&holo&printstatus"
    "&franchise&fullartist&charartist&backartist"
)

HEADERS = {
    "User-Agent": "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 "
    "(KHTML, like Gecko) Chrome/124.0 Safari/537.36"
}

OUTPUT_XLSX = "four_souls_all_cards_by_category.xlsx"
OUTPUT_DB = "four_souls_all_cards_by_category.db"
IMAGE_DIR = "card_images"


def clean_text(value: Any) -> str:
    if value is None:
        return ""
    if isinstance(value, list):
        value = " ".join(str(v) for v in value)
    return " ".join(str(value).split()).strip()


def normalize_type_name(card_type: str) -> str:
    text = clean_text(card_type).lower().replace("-", " ")
    text = text.replace("/", " / ")
    text = " ".join(text.split())

    mapping = {
        "character card": "Character Card",
        "eternal treasure card": "Eternal Treasure Card",
        "passive treasure card": "Passive Treasure Card",
        "active treasure card": "Active Treasure Card",
        "1 cent card": "1 Cent Card",
        "2 cent card": "2 Cent Card",
        "3 cent card": "3 Cent Card",
        "4 cent card": "4 Cent Card",
        "nickel card": "Nickel Card",
        "wildcard card": "Wildcard Card",
        "bomb card": "Bomb Card",
        "battery card": "Battery Card",
        "butter bean card": "Butter Bean Card",
        "pill / rune card": "Pill/Rune Card",
        "pill/rune card": "Pill/Rune Card",
        "dice shard / soul heart card": "Dice Shard/Soul Heart Card",
        "dice shard/soul heart card": "Dice Shard/Soul Heart Card",
        "trinket card": "Trinket Card",
        "basic monster card": "Basic Monster Card",
        "epic boss card": "Epic Boss Card",
        "cursed monster card": "Cursed Monster Card",
        "holy/charmed monster card": "Holy/Charmed Monster Card",
        "holy / charmed monster card": "Holy/Charmed Monster Card",
        "boss card": "Boss Card",
        "curse card": "Curse Card",
        "bad event card": "Bad Event Card",
        "good event card": "Good Event Card",
        "bonus soul card": "Bonus Soul Card",
        "room card": "Room Card",
    }

    return mapping.get(text, clean_text(card_type).title())


def make_safe_filename(url: str, extension: str) -> str:
    basename = os.path.basename(urlparse(url).path)
    stem = basename.rsplit(".", 1)[0] if "." in basename else basename
    safe_stem = re.sub(r"[^A-Za-z0-9_.-]+", "_", stem).strip("_") or "card"
    return f"{safe_stem}.{extension}"


def get_soup(session: requests.Session, url: str) -> BeautifulSoup:
    response = session.get(url, headers=HEADERS, timeout=30)
    response.raise_for_status()
    return BeautifulSoup(response.text, "html.parser")


def get_total_pages(session: requests.Session) -> int:
    soup = get_soup(session, SEARCH_URL)
    nav_links = soup.select("#CardsearchNav .nav-links .page-numbers")

    page_numbers = []
    for node in nav_links:
        text = clean_text(node.get_text())
        if text.isdigit():
            page_numbers.append(int(text))

    if not page_numbers:
        return 1
    return max(page_numbers)


def get_search_page_url(page_number: int) -> str:
    if page_number <= 1:
        return SEARCH_URL
    return (
        "https://foursouls.com/card-search/page/"
        f"{page_number}/?searchtext&origin&card_type&card_footnotes"
        "&competitive_only&identical=yes&cardstatus=cur&holo&printstatus"
        "&franchise&fullartist&charartist&backartist"
    )


def get_all_card_links(session: requests.Session) -> List[str]:
    total_pages = get_total_pages(session)
    print(f"Detected {total_pages} search pages.")

    card_links: Set[str] = set()

    for page_num in range(1, total_pages + 1):
        page_url = get_search_page_url(page_num)
        print(
            f"Collecting links from page {page_num}/{total_pages}: {page_url}")

        soup = get_soup(session, page_url)
        for anchor in soup.select("#cardGrid .cardGridCell a[href]"):
            href = clean_text(anchor.get("href", ""))
            if not href:
                continue

            absolute_url = urljoin(BASE_URL, href)
            absolute_url = absolute_url.split("?")[0].split("#")[0]

            if absolute_url.startswith("https://foursouls.com/cards/"):
                card_links.add(absolute_url)

        time.sleep(0.1)

    return sorted(card_links)


def extract_front_image_url(soup: BeautifulSoup) -> str:
    og_image = soup.find("meta", property="og:image")
    if og_image and og_image.get("content"):
        return clean_text(og_image["content"])

    card_front = soup.select_one("img.cardFront")
    if card_front:
        data_src = clean_text(card_front.get("data-src", ""))
        src = clean_text(card_front.get("src", ""))
        if data_src.startswith("http"):
            return data_src
        if src.startswith("http"):
            return src

    return ""


def download_image(session: requests.Session, image_url: str, output_dir: str) -> str:
    if not image_url:
        return ""

    os.makedirs(output_dir, exist_ok=True)

    parsed = urlparse(image_url)
    extension = parsed.path.split(
        ".")[-1].lower() if "." in parsed.path else "png"
    if extension not in {"png", "jpg", "jpeg", "webp"}:
        extension = "png"

    filename = make_safe_filename(image_url, extension)
    output_path = os.path.join(output_dir, filename)

    if os.path.exists(output_path):
        return output_path

    response = session.get(image_url, headers=HEADERS, timeout=30)
    response.raise_for_status()

    with open(output_path, "wb") as image_file:
        image_file.write(response.content)

    return output_path


def scrape_card(session: requests.Session, card_url: str, image_dir: str, download_images: bool = True) -> Dict[str, str]:
    soup = get_soup(session, card_url)

    name_tag = soup.select_one("main.cardpage h1")
    name = clean_text(name_tag.get_text()) if name_tag else ""

    cardinfo = soup.find("div", id="CardInfo")

    card_set = ""
    sub_box = ""
    card_type = ""
    set_code = ""
    hp = ""
    atk = ""
    effect_type = ""
    effect_text = ""
    quote = ""

    if cardinfo:
        origin = cardinfo.find("div", id="OriginSet")
        if origin:
            origin_classes = origin.get("class") or []
            set_code = origin_classes[0] if origin_classes else ""

            p_tags = origin.find_all("p")
            if len(p_tags) >= 3:
                # 3-tag variant: set | sub-box label | card type
                card_set = clean_text(p_tags[0].get_text())
                sub_box = clean_text(p_tags[1].get_text())
                card_type = clean_text(p_tags[2].get_text())
            elif len(p_tags) >= 2:
                card_set = clean_text(p_tags[0].get_text())
                card_type = clean_text(p_tags[1].get_text())

        stat_table = cardinfo.find("table", id="StatTable")
        if stat_table:
            for row in stat_table.find_all("tr"):
                stat_img = row.find("img")
                stat_value = row.find("td", class_="value")

                if stat_img and stat_value:
                    key = clean_text(stat_img.get("alt", ""))
                    value = clean_text(stat_value.get_text().replace(":", ""))

                    if key == "HP":
                        hp = value
                    elif key == "ATK":
                        atk = value

        effect_div = cardinfo.find("div", class_="effectOutcome")
        if effect_div:
            img = effect_div.find("img")
            if img:
                effect_type = clean_text(img.get("alt", ""))

            effect_text = clean_text(effect_div.get_text(" ", strip=True))
            if effect_type and effect_text.startswith(effect_type):
                effect_text = clean_text(
                    effect_text.replace(effect_type, "", 1))

        quote_tag = cardinfo.find("p", class_="quoteText")
        if quote_tag:
            quote = clean_text(quote_tag.get_text())

    image_url = extract_front_image_url(soup)
    image_path = download_image(
        session, image_url, image_dir) if download_images else ""
    normalized_type = normalize_type_name(
        card_type) if card_type else "Uncategorized"

    # Extract Starting Items for Character Cards from the "Eternal Card" section.
    # Each character's Eternal Treasure card is their personal starting item.
    starting_items = ""
    if normalized_type == "Character Card":
        for h3 in soup.find_all("h3"):
            if "eternal" in h3.get_text(strip=True).lower():
                sib = h3.find_next_sibling()
                while sib:
                    link = sib.find("a") if hasattr(sib, "find") else None
                    if link:
                        starting_items = clean_text(link.get_text())
                        break
                    if sib.name in ("h2", "h3", "h4"):
                        break
                    sib = sib.find_next_sibling()
                break

    return {
        "Category": normalized_type,
        "Name": name,
        "Set": card_set,
        "Sub Box": sub_box,
        "Set Code": set_code,
        "Card Type": card_type,
        "HP": hp,
        "ATK": atk,
        "Effect Type": effect_type,
        "Effect": effect_text,
        "Quote": quote,
        "Starting Items": starting_items,
        "URL": card_url,
        "Image URL": image_url,
        "Image Local Path": image_path,
    }


def truncate_sheet_name(name: str) -> str:
    cleaned = re.sub(r"[\[\]\*\?/\\:]", "", name).strip()
    if not cleaned:
        cleaned = "Uncategorized"
    return cleaned[:31]


def get_export_columns() -> List[str]:
    return [
        "Name",
        "Set",
        "Sub Box",
        "Set Code",
        "Card Type",
        "HP",
        "ATK",
        "Effect Type",
        "Effect",
        "Quote",
        "Starting Items",
        "URL",
        "Image URL",
        "Image Local Path",
    ]


def sanitize_table_name(name: str) -> str:
    cleaned = re.sub(r"[^A-Za-z0-9_]+", "_", name).strip("_")
    if not cleaned:
        cleaned = "Uncategorized"
    if cleaned[0].isdigit():
        cleaned = f"category_{cleaned}"
    return cleaned


def write_excel_by_category(all_cards: List[Dict[str, str]], output_file: str) -> None:
    columns = get_export_columns()

    cards_by_category: Dict[str, List[Dict[str, str]]] = {}
    for card in all_cards:
        category = card.get("Category") or "Uncategorized"
        cards_by_category.setdefault(category, []).append(card)

    with pd.ExcelWriter(output_file, engine="openpyxl") as writer:
        for category in sorted(cards_by_category.keys()):
            rows = cards_by_category[category]
            df = pd.DataFrame(rows)
            for column in columns:
                if column not in df.columns:
                    df[column] = ""
            df = df[columns]

            sheet_name = truncate_sheet_name(category)
            df.to_excel(writer, sheet_name=sheet_name, index=False)


def write_sqlite_by_category(all_cards: List[Dict[str, str]], output_file: str) -> None:
    columns = get_export_columns()

    cards_by_category: Dict[str, List[Dict[str, str]]] = {}
    for card in all_cards:
        category = card.get("Category") or "Uncategorized"
        cards_by_category.setdefault(category, []).append(card)

    used_table_names: Set[str] = set()

    with sqlite3.connect(output_file) as connection:
        for category in sorted(cards_by_category.keys()):
            rows = cards_by_category[category]
            df = pd.DataFrame(rows)
            for column in columns:
                if column not in df.columns:
                    df[column] = ""
            df = df[columns]

            base_table_name = sanitize_table_name(category)
            table_name = base_table_name
            suffix = 2
            while table_name in used_table_names:
                table_name = f"{base_table_name}_{suffix}"
                suffix += 1
            used_table_names.add(table_name)

            df.to_sql(table_name, connection, if_exists="replace", index=False)


def main() -> None:
    parser = argparse.ArgumentParser(
        description="Scrape all Four Souls cards.")
    parser.add_argument(
        "--no-images",
        action="store_true",
        help="Skip downloading card images.",
    )
    parser.add_argument(
        "--output-format",
        choices=["excel", "sqlite"],
        default="excel",
        help="Choose output format: excel or sqlite.",
    )
    parser.add_argument(
        "--output-path",
        default=None,
        help="Directory where output files are written. Defaults to the current working directory.",
    )
    args = parser.parse_args()
    download_images = not args.no_images

    global OUTPUT_DB, OUTPUT_XLSX, IMAGE_DIR
    if args.output_path:
        output_dir = os.path.abspath(args.output_path)
        os.makedirs(output_dir, exist_ok=True)
        OUTPUT_DB = os.path.join(output_dir, "four_souls_all_cards_by_category.db")
        OUTPUT_XLSX = os.path.join(output_dir, "four_souls_all_cards_by_category.xlsx")
        IMAGE_DIR = os.path.join(output_dir, "card_images")

    print("Starting Four Souls full card scrape...")
    if not download_images:
        print("Image downloading disabled.")

    session = requests.Session()
    card_links = get_all_card_links(session)

    print(f"Found {len(card_links)} unique cards across all pages.\n")

    all_cards: List[Dict[str, str]] = []

    for index, card_link in enumerate(card_links, start=1):
        print(f"[{index}/{len(card_links)}] Scraping: {card_link}")
        try:
            card_data = scrape_card(
                session, card_link, IMAGE_DIR, download_images)
            all_cards.append(card_data)
        except Exception as exc:
            print(f"ERROR scraping {card_link}: {exc}")

        time.sleep(0.15)

    if args.output_format == "sqlite":
        print("\nWriting SQLite database...")
        write_sqlite_by_category(all_cards, OUTPUT_DB)
        print(f"Done. Saved database: {OUTPUT_DB}")
    else:
        print("\nWriting multi-sheet Excel workbook...")
        write_excel_by_category(all_cards, OUTPUT_XLSX)
        print(f"Done. Saved workbook: {OUTPUT_XLSX}")

    if download_images:
        print(f"Downloaded card images to: {IMAGE_DIR}/")


if __name__ == "__main__":
    main()
