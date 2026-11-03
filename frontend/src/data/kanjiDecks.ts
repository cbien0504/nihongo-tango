import kanjiN3Data from "./kanji_n3.json";
import kanjiN2Data from "./kanji_n2.json";
import type { VocabItem } from "../types/quiz";
import { getHanViet } from "../utils/hanViet";
import { N2_DECK, N3_DECK, N4_DECK, N5_DECK, type VocabDeck } from "./vocabDecks";

export interface KanjiItem {
  stt: number;
  kanji: string;
  han_viet: string;
  /** Vietnamese meaning; empty when the list has none (N2 is listed with English meanings). */
  meaning: string;
}

export interface KanjiBatch {
  key: string;
  title: string;
  label: string;
  items: KanjiItem[];
}

/** The single kanji of a JLPT level (scripts/crawl_kanji.py), practiced in its Kanji section. */
export interface KanjiDeck {
  id: "n3" | "n2";
  level: string;
  source: string;
  items: KanjiItem[];
  /** Every kanji first, then lessons of KANJI_BATCH_SIZE kanji in the order of the list. */
  batches: KanjiBatch[];
  getBatch: (key: string) => KanjiBatch;
  /** Words of the vocabulary decks written with the kanji, this level first. */
  examplesOf: (item: KanjiItem) => VocabItem[];
}

export const KANJI_BATCH_SIZE = 20;
const MAX_EXAMPLES = 3;
const VOCAB_DECKS = [N5_DECK, N4_DECK, N3_DECK, N2_DECK];
// Context written in brackets is not part of a word: （お金を）下ろす is not an example of 金.
const ANNOTATION = /[（(][^）)]*[）)]/g;

const createKanjiDeck = (
  id: KanjiDeck["id"],
  level: string,
  source: string,
  items: KanjiItem[],
  vocab: VocabDeck
): KanjiDeck => {
  const all: KanjiBatch = { key: "all", title: `Tất cả Kanji ${level}`, label: `📚 Tất cả (${items.length} chữ Kanji ${level})`, items };
  const lessons: KanjiBatch[] = [];
  for (let start = 0; start < items.length; start += KANJI_BATCH_SIZE) {
    const batchItems = items.slice(start, start + KANJI_BATCH_SIZE);
    const number = lessons.length + 1;
    const preview = batchItems.slice(0, 5).map((item) => item.kanji).join("");
    lessons.push({
      key: `kanji_${number}`,
      title: `Kanji ${level} – Bài ${number}`,
      label: `Bài ${number}: ${preview}… (chữ ${start + 1}–${start + batchItems.length})`,
      items: batchItems,
    });
  }
  const batches = [all, ...lessons];
  const byKey = new Map(batches.map((batch) => [batch.key, batch]));

  const decks = [vocab, ...VOCAB_DECKS.filter((deck) => deck !== vocab)];
  const examples = new Map<string, VocabItem[]>();
  const examplesOf = (item: KanjiItem) => {
    if (!examples.has(item.kanji)) {
      const seen = new Set<string>();
      const words = decks
        .flatMap((deck) =>
          deck.items
            .filter((word) => word.kanji.replace(ANNOTATION, "").includes(item.kanji))
            .sort((a, b) => a.kanji.length - b.kanji.length)
        )
        .filter((word) => !seen.has(word.kanji) && seen.add(word.kanji));
      examples.set(item.kanji, words.slice(0, MAX_EXAMPLES));
    }
    return examples.get(item.kanji)!;
  };

  return { id, level, source, items, batches, getBatch: (key) => byKey.get(key) ?? all, examplesOf };
};

const n3Items: KanjiItem[] = kanjiN3Data.kanji;
const n3Readings = new Map(n3Items.map((item) => [item.kanji, item.han_viet]));

export const KANJI_N3_DECK = createKanjiDeck("n3", "N3", kanjiN3Data.source, n3Items, N3_DECK);

// The N2 list has no Hán Việt: a kanji also listed in N3 keeps the reading it has there,
// the others are read from the kanji table.
export const KANJI_N2_DECK = createKanjiDeck(
  "n2",
  "N2",
  kanjiN2Data.source,
  kanjiN2Data.kanji.map(({ stt, kanji }) => ({ stt, kanji, han_viet: n3Readings.get(kanji) ?? getHanViet(kanji), meaning: "" })),
  N2_DECK
);
