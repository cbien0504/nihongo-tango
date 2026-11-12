"""Crawl the single kanji of JLPT N5 to N2 studied in the Kanji section of the app.

Usage (from the repo root):
    python3 scripts/crawl_kanji.py [LEVEL...]     # LEVEL: n5, n4, n3, n2; every level without

  - N3: the table of https://kohi.vn/blog/tong-hop-kanji-n3-day-du-nhat-nigbu, kanji with
    their Hán Việt and Vietnamese meaning. The page is rendered by Nuxt: the table is HTML
    escaped inside a script.
  - N5, N4, N2: the lists of JLPTsensei, e.g. https://jlptsensei.com/jlpt-n2-kanji-list/
    (100 kanji a page). Their meaning is English, so only the kanji are kept.
  - N2: the Hán Việt and Vietnamese meaning of its kanji come from the kanji lessons of
    tudienabc.com (https://www.tudienabc.com/nang-luc-nhat-ngu/kanji/trinh-do-N2/hoc-tieng-nhat-kanji-3,
    19 lessons), which list 367 of the 374 kanji; 6 others are in its N1 lessons. The app
    reads the Hán Việt of the kanji left without one in frontend/src/data/kanji_han_viet.json.
The on and kun readings are left out. Writes frontend/src/data/kanji_<level>.json; run
scripts/build_han_viet_data.py afterwards so every kanji has a Hán Việt reading.
"""

import html
import json
import re
import sys
import time
import unicodedata
import urllib.request
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
DATA_DIR = ROOT / "frontend" / "src" / "data"
HEADERS = {
    "User-Agent": "Mozilla/5.0 (compatible; mimikara-vocab-crawler)",
    "Accept": "text/html,application/xhtml+xml",
    "Accept-Language": "vi,en;q=0.8",
}
PAUSE_SECONDS = 1.0

KOHI_URL = "https://kohi.vn/blog/tong-hop-kanji-n3-day-du-nhat-nigbu"
KOHI_HEADER = ["STT", "Kanji", "Âm Hán Việt", "Nghĩa", "Âm On", "Âm Kun"]
# Readings of kohi.vn that are typos (DUƠNG), Vietnamese words (THAN, BẢNG) or rarely used (SỔ).
KOHI_CORRECTIONS = {"陽": "DƯƠNG", "板": "BẢN", "数": "SỐ", "炭": "THÁN"}
SENSEI_URL = "https://jlptsensei.com/jlpt-{level}-kanji-list/"
# Pages of each list of JLPTsensei: 80 kanji in N5, 167 in N4, 374 in N2.
SENSEI_PAGE_COUNTS = {"N5": 1, "N4": 2, "N2": 4}
TUDIENABC_URL = "https://www.tudienabc.com/nang-luc-nhat-ngu/kanji/trinh-do-{level}/hoc-tieng-nhat-kanji-3"
TUDIENABC_HEADER = ["Kanji", "Hán việt", "Onyomi", "Kunyomi", "Tiếng việt", "English"]
# Readings of tudienabc.com that are a Vietnamese word (THAN) or the reading of the simplified
# Chinese 机 (機, CƠ): the Japanese 机 is a desk, read KỈ.
TUDIENABC_CORRECTIONS = {"炭": "THÁN", "机": "KỈ"}
# Levels of tudienabc.com read for the Hán Việt and meaning of a JLPTsensei list, first one first.
TUDIENABC_LEVELS = {"N2": ["N2", "N1"]}

BACKSLASH = "\\"
JS_ESCAPE_RE = re.compile(re.escape(BACKSLASH) + "u([0-9A-Fa-f]{4})")
ROW_RE = re.compile(r"<tr[^>]*>(.*?)</tr>", re.S)
CELL_RE = re.compile(r"<t[dh][^>]*>(.*?)</t[dh]>", re.S)
TAG_RE = re.compile(r"<[^>]+>")
KANJI_RE = re.compile(r"^[㐀-鿿豈-﫿]$")


def fetch(url: str) -> str:
    with urllib.request.urlopen(urllib.request.Request(url, headers=HEADERS), timeout=30) as response:
        return response.read().decode("utf-8")


def text_of(fragment: str) -> str:
    return unicodedata.normalize("NFC", re.sub(r"\s+", " ", html.unescape(TAG_RE.sub(" ", fragment))).strip())


def check_numbers(kanji: list[dict], source: str) -> None:
    numbers = [entry["stt"] for entry in kanji]
    if numbers != list(range(1, len(numbers) + 1)):
        raise SystemExit(f"{source}: kanji are not numbered 1 to {len(numbers)}")
    if any(not KANJI_RE.match(entry["kanji"]) for entry in kanji):
        raise SystemExit(f"{source}: an entry is not a single kanji")
    if len({entry["kanji"] for entry in kanji}) != len(kanji):
        raise SystemExit(f"{source}: a kanji is listed twice")


def crawl_n3() -> list[dict]:
    page = fetch(KOHI_URL)
    start = page.find(BACKSLASH + "u003Ctable")
    stop = page.find(BACKSLASH + "u003C" + BACKSLASH + "u002Ftable", start)
    if start < 0 or stop < 0:
        raise SystemExit("kohi.vn: no kanji table found")
    table = JS_ESCAPE_RE.sub(lambda m: chr(int(m.group(1), 16)), page[start:stop]).replace(BACKSLASH + '"', '"')
    rows = [[text_of(cell) for cell in CELL_RE.findall(row)] for row in ROW_RE.findall(table)]
    if rows[0] != KOHI_HEADER:
        raise SystemExit(f"kohi.vn: unexpected columns {rows[0]}")
    kanji: list[dict] = []
    for number, char, han_viet, meaning, _on, _kun in rows[1:]:
        # The table has an empty row and lists a few kanji twice: they are left out.
        if not char or any(entry["kanji"] == char for entry in kanji):
            print(f"kohi.vn: row {number} left out ({char or 'empty'})")
            continue
        if char in KOHI_CORRECTIONS:
            print(f"kohi.vn: {char} {han_viet.upper()} → {KOHI_CORRECTIONS[char]}")
        han_viet = KOHI_CORRECTIONS.get(char, han_viet.upper())
        kanji.append({"stt": len(kanji) + 1, "kanji": char, "han_viet": han_viet, "meaning": meaning})
    check_numbers(kanji, "kohi.vn")
    return kanji


def sensei_pages(level: str) -> list[str]:
    url = SENSEI_URL.format(level=level.lower())
    # The first page is the list itself: /page/1/ only answers a placeholder.
    return [url] + [f"{url}page/{page}/" for page in range(2, SENSEI_PAGE_COUNTS[level] + 1)]


def crawl_sensei(level: str) -> list[dict]:
    kanji = []
    for url in sensei_pages(level):
        time.sleep(PAUSE_SECONDS)
        page = fetch(url)
        table = page[page.find('<table id="jl-kanji"') :]
        table = table[: table.find("</table>")]
        found = 0
        for row in ROW_RE.findall(table):
            stt = re.search(r'class="jl-td-num[^"]*">\s*(\d+)', row)
            char = re.search(r'class="jl-td-k[^"]*">.*?<a[^>]*>(.*?)</a>', row, re.S)
            if stt and char:
                kanji.append({"stt": int(stt.group(1)), "kanji": text_of(char.group(1))})
                found += 1
        if not found:
            raise SystemExit(f"jlptsensei.com: no kanji on {url}")
        print(f"{url}: {found} kanji")
    check_numbers(kanji, "jlptsensei.com")
    return kanji


def crawl_tudienabc(level: str) -> dict[str, dict]:
    """Hán Việt and Vietnamese meaning of the kanji of the lessons of a level of tudienabc.com, by kanji."""
    url = TUDIENABC_URL.format(level=level)
    lessons = sorted({int(n) for n in re.findall(rf"trinh-do-{level}/hoc-tieng-nhat-kanji-3/bai-(\d+)", fetch(url))})
    if not lessons:
        raise SystemExit(f"tudienabc.com: no lessons on {url}")
    entries: dict[str, dict] = {}
    for lesson in lessons:
        time.sleep(PAUSE_SECONDS)
        page = fetch(f"{url}/bai-{lesson}")
        rows = [[text_of(cell) for cell in CELL_RE.findall(row)] for row in ROW_RE.findall(page)]
        if TUDIENABC_HEADER not in rows:
            raise SystemExit(f"tudienabc.com: no kanji table on {url}/bai-{lesson}")
        for char, han_viet, _on, _kun, meaning, _english in (row for row in rows if len(row) == 6 and KANJI_RE.match(row[0])):
            if char in entries:
                continue
            if char in TUDIENABC_CORRECTIONS:
                print(f"tudienabc.com: {char} {han_viet.upper()} → {TUDIENABC_CORRECTIONS[char]}")
            entries[char] = {"han_viet": TUDIENABC_CORRECTIONS.get(char, han_viet.upper()), "meaning": meaning}
    print(f"tudienabc.com {level}: {len(entries)} kanji in {len(lessons)} lessons")
    return entries


def add_readings(kanji: list[dict], levels: list[str]) -> None:
    """Hán Việt and meaning of tudienabc.com for every kanji, from the first of `levels` listing it."""
    found: dict[str, dict] = {}
    for level in levels:
        if all(entry["kanji"] in found for entry in kanji):
            break
        found = {**crawl_tudienabc(level), **found}
    for entry in kanji:
        entry.update(found.get(entry["kanji"], {"han_viet": "", "meaning": ""}))
    missing = "".join(entry["kanji"] for entry in kanji if not entry["han_viet"])
    if missing:
        print(f"tudienabc.com: no Hán Việt nor meaning for {missing}; the app reads their Hán Việt in kanji_han_viet.json")


def write(level: str, title: str, source: str, kanji: list[dict]) -> None:
    output = DATA_DIR / f"kanji_{level.lower()}.json"
    data = {"level": level, "title": title, "source": source, "kanji": kanji}
    output.write_text(json.dumps(data, ensure_ascii=False, indent=1) + "\n", encoding="utf-8")
    print(f"Wrote {len(kanji)} {level} kanji to {output}")


def main() -> None:
    levels = [arg.upper() for arg in sys.argv[1:]] or ["N5", "N4", "N3", "N2"]
    for level in levels:
        if level == "N3":
            write("N3", "Tổng hợp Kanji N3 đầy đủ nhất", f"kohi.vn – {KOHI_URL}", crawl_n3())
        elif level in SENSEI_PAGE_COUNTS:
            kanji = crawl_sensei(level)
            source = f"JLPTsensei.com – {SENSEI_URL.format(level=level.lower())}"
            if level in TUDIENABC_LEVELS:
                add_readings(kanji, TUDIENABC_LEVELS[level])
                source += f" · Hán Việt và nghĩa: tudienabc.com – {TUDIENABC_URL.format(level=level)}"
            write(level, f"JLPT {level} Kanji List", source, kanji)
        else:
            raise SystemExit(__doc__)


if __name__ == "__main__":
    main()
